using System.Linq.Expressions;
using MediatR;
using NomNa.Application.Common.Exceptions;
using NomNa.Application.Common.Interfaces;
using NomNa.Application.Common.Models;
using NomNa.Application.Common.Security;

namespace NomNa.Application.Common.Behaviors;

/// <summary>
/// Pipeline Behavior tự động chặn và kiểm tra phân quyền (Channel / Server) trước khi vào Handler.
/// Thực thi theo nguyên tắc Fail-Fast: Ngay khi thiếu quyền sẽ trả về Result.Failure hoặc ném ForbiddenException.
/// </summary>
public class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IPermissionService _permissionService;

    public AuthorizationBehavior(
        ICurrentUserService currentUserService,
        IPermissionService permissionService)
    {
        _currentUserService = currentUserService;
        _permissionService = permissionService;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // 1. Kiểm tra Channel Permission
        if (request is IRequireChannelPermission channelReq)
        {
            var userId = _currentUserService.UserId;
            if (!userId.HasValue)
            {
                return FailWith(Error.Unauthorized("Auth.Unauthorized", "Yêu cầu đăng nhập để thực hiện hành động này."));
            }

            var hasPermission = await _permissionService.HasChannelPermissionAsync(
                userId.Value,
                channelReq.ChannelId,
                channelReq.RequiredPermission,
                cancellationToken
            );

            if (!hasPermission)
            {
                return FailWith(Error.Forbidden(
                    "Permission.Forbidden",
                    $"Bạn không có quyền '{channelReq.RequiredPermission}' tại kênh này."
                ));
            }
        }

        // 2. Kiểm tra Server Permission
        if (request is IRequireServerPermission serverReq)
        {
            var userId = _currentUserService.UserId;
            if (!userId.HasValue)
            {
                return FailWith(Error.Unauthorized("Auth.Unauthorized", "Yêu cầu đăng nhập để thực hiện hành động này."));
            }

            var hasPermission = await _permissionService.HasServerPermissionAsync(
                userId.Value,
                serverReq.ServerId,
                serverReq.RequiredPermission,
                cancellationToken
            );

            if (!hasPermission)
            {
                return FailWith(Error.Forbidden(
                    "Permission.Forbidden",
                    $"Bạn không có quyền '{serverReq.RequiredPermission}' tại server này."
                ));
            }
        }

        return await next();
    }

    private static TResponse FailWith(Error error)
    {
        if (FailureResultFactory<TResponse>.Create != null)
        {
            return FailureResultFactory<TResponse>.Create(error);
        }

        if (error.Type == ErrorType.Unauthorized)
        {
            throw new UnauthorizedException(error.Message);
        }

        throw new ForbiddenException(error.Message);
    }

    private static class FailureResultFactory<T>
    {
        public static readonly Func<Error, T>? Create;

        static FailureResultFactory()
        {
            var type = typeof(T);
            if (type == typeof(Result))
            {
                Create = err => (T)(object)Result.Failure(err);
            }
            else if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Result<>))
            {
                var valueType = type.GetGenericArguments()[0];
                var method = typeof(Result<>)
                    .MakeGenericType(valueType)
                    .GetMethod("Failure", new[] { typeof(Error) });

                if (method != null)
                {
                    var param = Expression.Parameter(typeof(Error), "error");
                    var call = Expression.Call(method, param);
                    Create = Expression.Lambda<Func<Error, T>>(call, param).Compile();
                }
            }
        }
    }
}
