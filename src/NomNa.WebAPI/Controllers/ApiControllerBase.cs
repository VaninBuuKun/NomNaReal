using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NomNa.Application.Common.Models;

namespace NomNa.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _mediator;
    protected ISender Mediator => _mediator ??= HttpContext.RequestServices.GetRequiredService<ISender>();

    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
            return Ok(result.Value);

        return HandleError(result.Error);
    }

    protected IActionResult HandleResult(Result result)
    {
        if (result.IsSuccess)
            return Ok();

        return HandleError(result.Error);
    }

    private IActionResult HandleError(Error error)
    {
        return error.Type switch
        {
            ErrorType.NotFound => NotFound(new { code = error.Code, message = error.Message }),
            ErrorType.Conflict => Conflict(new { code = error.Code, message = error.Message }),
            ErrorType.Unauthorized => Unauthorized(new { code = error.Code, message = error.Message }),
            ErrorType.Forbidden => StatusCode(StatusCodes.Status403Forbidden, new { code = error.Code, message = error.Message }),
            ErrorType.Validation => BadRequest(new { code = error.Code, message = error.Message }),
            _ => BadRequest(new { code = error.Code, message = error.Message })
        };
    }
}

