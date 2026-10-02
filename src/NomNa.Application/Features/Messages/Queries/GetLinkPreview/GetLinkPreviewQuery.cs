using MediatR;
using NomNa.Application.Common.Models;
using NomNa.Application.Features.Messages.DTOs;

namespace NomNa.Application.Features.Messages.Queries.GetLinkPreview;

public record GetLinkPreviewQuery(string Url) : IRequest<Result<LinkPreviewDto>>;
