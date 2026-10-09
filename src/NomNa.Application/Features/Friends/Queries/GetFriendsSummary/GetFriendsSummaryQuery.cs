using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Friends.DTOs;

namespace NomNa.Application.Features.Friends.Queries.GetFriendsSummary;

public record GetFriendsSummaryQuery : IRequest<Result<FriendsSummaryDto>>;
