using System.Net;
using System.Text.Json;
using PulseChat.Application.Common.Exceptions;

namespace PulseChat.WebAPI.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        object response;

        switch (exception)
        {
            case ValidationException valEx:
                statusCode = HttpStatusCode.BadRequest;
                response = new { message = valEx.Message, errors = valEx.Errors };
                break;

            case NotFoundException notFoundEx:
                statusCode = HttpStatusCode.NotFound;
                response = new { message = notFoundEx.Message };
                break;

            case UnauthorizedException unauthEx:
                statusCode = HttpStatusCode.Unauthorized;
                response = new { message = unauthEx.Message };
                break;

            case AppException appEx:
                statusCode = HttpStatusCode.BadRequest;
                response = new { message = appEx.Message };
                break;

            default:
                _logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);
                statusCode = HttpStatusCode.InternalServerError;
                response = new { message = "An internal server error occurred." };
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
