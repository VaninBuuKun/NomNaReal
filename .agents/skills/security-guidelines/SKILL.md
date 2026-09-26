---
name: security-guidelines
description: >-
  Use this skill when implementing authentication, authorization, API security,
  CORS configuration, rate limiting, JWT handling, or any security-related code
  for PulseChat. It covers OWASP best practices, token management, and security
  headers configuration.
---

# Security Guidelines Skill — PulseChat

## 1. Token Management

### Access Token
- Lifetime: **15 minutes maximum**
- Stored in: **HttpOnly cookie** (NOT localStorage)
- Cookie flags: `HttpOnly=true`, `Secure=true`, `SameSite=Strict`
- Claims: minimal — only `UserId`, `Email`, `Roles`

### Refresh Token
- Lifetime: **7 days**
- Stored in: **HttpOnly cookie** (separate from access token)
- **Rotation**: Every refresh issues a NEW refresh token + invalidates the old one
- Store refresh tokens in database with: `TokenHash`, `ExpiresAt`, `IsRevoked`, `CreatedByIp`

### Cookie Setup (ASP.NET Core)
```csharp
Response.Cookies.Append("access_token", accessToken, new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Strict,
    Expires = DateTimeOffset.UtcNow.AddMinutes(15),
    Path = "/api"
});

Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
{
    HttpOnly = true,
    Secure = true,
    SameSite = SameSiteMode.Strict,
    Expires = DateTimeOffset.UtcNow.AddDays(7),
    Path = "/api/auth/refresh"
});
```

### Frontend Token Handling
- Since tokens are in HttpOnly cookies, the FE does NOT need to manually attach tokens
- Axios/fetch must include `credentials: 'include'` for cookies to be sent
- SignalR: pass token via query string (cookies don't work for WebSocket upgrade)

## 2. CORS Configuration

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("PulseChat", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",  // Vite dev
                "https://pulsechat.app"   // Production
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // Required for cookies
    });
});
```

**Rules:**
- NEVER use `AllowAnyOrigin()` with `AllowCredentials()`
- Whitelist exact origins — no wildcards
- Review origins list before each deployment

## 3. Rate Limiting

```csharp
builder.Services.AddRateLimiter(options =>
{
    // Auth endpoints: 5 requests per minute per IP
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });

    // General API: 100 requests per minute per user
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
```

Apply to controllers:
```csharp
[EnableRateLimiting("auth")]
[HttpPost("login")]
public async Task<IActionResult> Login(LoginCommand command) { ... }
```

## 4. Security Headers Middleware

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "0"); // Modern CSP replaces this
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss:");

    if (!context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers.Append("Strict-Transport-Security",
            "max-age=31536000; includeSubDomains");
    }

    await next();
});
```

## 5. Input Validation Checklist

For EVERY command/query:
- [ ] FluentValidation validator exists
- [ ] String fields have `MaximumLength()` to prevent DB overflow
- [ ] Email fields use `.EmailAddress()` validation
- [ ] IDs are validated as proper GUIDs
- [ ] No raw SQL — always use parameterized queries via EF Core
- [ ] File uploads: validate type, size, and scan content

## 6. Password Policy (Identity)

```csharp
options.Password.RequiredLength = 8;
options.Password.RequireDigit = true;
options.Password.RequireUppercase = true;
options.Password.RequireLowercase = true;
options.Password.RequireNonAlphanumeric = false; // UX trade-off
options.Lockout.MaxFailedAccessAttempts = 5;
options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
```

## 7. Common Security Anti-Patterns to AVOID

- ❌ Storing JWT in localStorage (XSS vulnerable)
- ❌ Using `AllowAnyOrigin()` with credentials
- ❌ Long-lived access tokens (> 30 minutes)
- ❌ Returning stack traces in production error responses
- ❌ Putting sensitive data (password hash, SSN) in JWT claims
- ❌ Using `[AllowAnonymous]` on endpoints that modify data
- ❌ Disabling HTTPS in production
- ❌ Using `dangerouslySetInnerHTML` with user-generated content
