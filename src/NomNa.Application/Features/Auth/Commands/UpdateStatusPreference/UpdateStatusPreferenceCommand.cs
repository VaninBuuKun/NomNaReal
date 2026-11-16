using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Domain.Enums;

namespace NomNa.Application.Features.Auth.Commands.UpdateStatusPreference;

/// <summary>
/// Command to update the authenticated user's presence display preference.
/// </summary>
public record UpdateStatusPreferenceCommand(UserStatusPreference Preference) : IRequest<Result<Unit>>;
