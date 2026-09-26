using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PulseChat.Application.Common.Exceptions;
using PulseChat.Application.Common.Interfaces;
using PulseChat.Application.Features.Auth.DTOs;
using PulseChat.Domain.Entities;
using PulseChat.Domain.Enums;

namespace PulseChat.Application.Features.Auth.Commands.Register;

public record RegisterCommand(
    string Email,
    string Username,
    string DisplayName,
    string Password
) : IRequest<AuthResultDto>;

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Username).NotEmpty().MinimumLength(3).MaximumLength(30).Matches(@"^[a-zA-Z0-9_]+$");
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public RegisterCommandHandler(IApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<AuthResultDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();
        var usernameLower = request.Username.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == emailLower, cancellationToken))
        {
            throw new AppException("Email is already registered.");
        }

        if (await _context.Users.AnyAsync(u => u.Username == usernameLower, cancellationToken))
        {
            throw new AppException("Username is already taken.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = emailLower,
            Username = usernameLower,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = passwordHash,
            Status = UserStatus.Online
        };

        _context.Users.Add(user);

        // Generate tokens
        var (accessToken, expiresAt) = _jwtService.GenerateAccessToken(user.Id, user.Email, user.Username);
        var rawRefreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new PulseChat.Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = BCrypt.Net.BCrypt.HashPassword(rawRefreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(user.Id, user.Email, user.Username, user.DisplayName, user.AvatarUrl, user.Bio, user.Status);
        return new AuthResultDto(accessToken, rawRefreshToken, expiresAt, userDto);
    }
}
