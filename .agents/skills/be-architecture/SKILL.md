---
name: be-architecture
description: >-
  Use this skill when creating or modifying .NET backend code for PulseChat,
  including controllers, MediatR commands/queries, domain entities, EF Core
  configurations, middleware, and ASP.NET Core Identity setup. It defines the
  Clean Architecture layer rules, CQRS patterns, security practices, and
  naming conventions.
---

# Backend Architecture Skill — PulseChat

## 1. Clean Architecture Layers

```
src/
├── PulseChat.Domain/           # Layer 0 — ZERO external dependencies
│   ├── Entities/               # User, Workspace, Channel, Message...
│   ├── Enums/                  # UserStatus, ChannelType...
│   ├── Common/                 # BaseEntity, AuditableEntity
│   └── ValueObjects/           # (future) InviteCode, Email...
│
├── PulseChat.Application/      # Layer 1 — depends on Domain ONLY
│   ├── Common/
│   │   ├── Interfaces/         # IApplicationDbContext, ITokenService
│   │   ├── Behaviors/          # ValidationBehavior, AuthorizationBehavior
│   │   └── Exceptions/         # ValidationException, ForbiddenException
│   ├── Features/
│   │   ├── Auth/               # Login, Register, RefreshToken commands
│   │   ├── Workspaces/         # Create, GetAll, GetById, Update, Delete
│   │   ├── Channels/           # Create, GetByWorkspace, Update
│   │   └── Messages/           # Send, GetByChannel, Edit, Delete
│   └── DependencyInjection.cs
│
├── PulseChat.Infrastructure/   # Layer 2 — implements Application interfaces
│   ├── Persistence/
│   │   ├── AppDbContext.cs     # IdentityDbContext<User>
│   │   └── Configurations/    # EF Core Fluent API configs
│   ├── Services/
│   │   ├── TokenService.cs
│   │   └── DateTimeService.cs
│   ├── Identity/              # ASP.NET Core Identity customization
│   └── DependencyInjection.cs
│
├── PulseChat.WebAPI/           # Layer 3 — Presentation
│   ├── Controllers/            # Thin controllers — MediatR dispatch only
│   ├── Hubs/                   # SignalR ChatHub
│   ├── Middleware/             # ExceptionMiddleware, RateLimitMiddleware
│   └── Program.cs
│
└── PulseChat.Shared/           # Cross-cutting DTOs/Constants
```

## 2. CQRS Pattern Rules

### 2.1 Command (Write operation)

```
Features/<Feature>/Commands/<ActionName>/
├── <ActionName>Command.cs       # IRequest<TResponse>
├── <ActionName>CommandHandler.cs # IRequestHandler<TCommand, TResponse>
└── <ActionName>CommandValidator.cs # AbstractValidator<TCommand>
```

Example:
```csharp
// Features/Workspaces/Commands/CreateWorkspace/CreateWorkspaceCommand.cs
public record CreateWorkspaceCommand(string Name, string? Description) : IRequest<WorkspaceDto>;

// Features/Workspaces/Commands/CreateWorkspace/CreateWorkspaceCommandValidator.cs
public class CreateWorkspaceCommandValidator : AbstractValidator<CreateWorkspaceCommand>
{
    public CreateWorkspaceCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên workspace không được để trống")
            .MaximumLength(100).WithMessage("Tên workspace tối đa 100 ký tự");
    }
}

// Features/Workspaces/Commands/CreateWorkspace/CreateWorkspaceCommandHandler.cs
public class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private readonly IApplicationDbContext _context;

    public CreateWorkspaceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken ct)
    {
        var workspace = new Workspace { Name = request.Name, Description = request.Description };
        _context.Workspaces.Add(workspace);
        await _context.SaveChangesAsync(ct);
        return new WorkspaceDto(workspace.Id, workspace.Name, workspace.Description);
    }
}
```

### 2.2 Query (Read operation)

```
Features/<Feature>/Queries/<ActionName>/
├── <ActionName>Query.cs
├── <ActionName>QueryHandler.cs
└── <ActionName>Dto.cs           # Response DTO
```

### 2.3 Rules
- Every Command/Query MUST have a Validator (even if empty — for consistency)
- Handlers are focused — ONE responsibility per handler
- Return DTOs — NEVER return domain entities from handlers
- Use `CancellationToken` in all async operations

## 3. Controller Rules

Controllers are **thin dispatchers** — they do NOT contain business logic:

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkspacesController : ControllerBase
{
    private readonly ISender _mediator;

    public WorkspacesController(ISender mediator) => _mediator = mediator;

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceCommand command)
        => Ok(await _mediator.Send(command));

    [HttpGet]
    public async Task<ActionResult<List<WorkspaceDto>>> GetAll()
        => Ok(await _mediator.Send(new GetWorkspacesQuery()));
}
```

## 4. ASP.NET Core Identity Setup

### 4.1 User entity inherits IdentityUser

```csharp
public class User : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Offline;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
}
```

### 4.2 DbContext inherits IdentityDbContext

```csharp
public class AppDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Message> Messages => Set<Message>();
    // ...
}
```

### 4.3 Registration in Program.cs

```csharp
builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();
```

## 5. MediatR Pipeline Behaviors

Register in order:
```csharp
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(AuthorizationBehavior<,>));
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
```

## 6. Security Middleware Order

In `Program.cs`, order matters:
```csharp
app.UseExceptionHandler();           // 1. Global error handling
app.UseHttpsRedirection();           // 2. Force HTTPS
app.UseRateLimiter();                // 3. Rate limiting
app.UseAuthentication();             // 4. JWT/Identity auth
app.UseAuthorization();              // 5. Role/Claims check
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
```

## 7. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Entity | PascalCase, singular | `Workspace`, `Message` |
| Command | `<Action><Entity>Command` | `CreateWorkspaceCommand` |
| Query | `Get<Entity/Entities>Query` | `GetWorkspacesQuery` |
| Handler | `<Command/Query>Handler` | `CreateWorkspaceCommandHandler` |
| Validator | `<Command>Validator` | `CreateWorkspaceCommandValidator` |
| DTO | `<Entity>Dto` | `WorkspaceDto` |
| Interface | `I<Name>` | `IApplicationDbContext` |
| Controller | `<Entity>sController` | `WorkspacesController` |
