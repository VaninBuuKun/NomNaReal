using MediatR;
using NomNa.Application.Common.Models;

namespace NomNa.Application.Features.Auth.Commands.ChangePassword;

public record ChangePasswordCommand(
    string CurrentPassword,
    string NewPassword,
    string ConfirmPassword
) : IRequest<Result>;

