# ============================================
# Stage 1: Build .NET 9 Backend
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

# Copy solution and csproj files first for efficient layer caching
COPY NomNa.sln .
COPY src/NomNa.Domain/NomNa.Domain.csproj src/NomNa.Domain/
COPY src/NomNa.Shared/NomNa.Shared.csproj src/NomNa.Shared/
COPY src/NomNa.Application/NomNa.Application.csproj src/NomNa.Application/
COPY src/NomNa.Infrastructure/NomNa.Infrastructure.csproj src/NomNa.Infrastructure/
COPY src/NomNa.WebAPI/NomNa.WebAPI.csproj src/NomNa.WebAPI/

RUN dotnet restore NomNa.sln

# Copy backend source and compile
COPY src/ src/
RUN dotnet publish src/NomNa.WebAPI/NomNa.WebAPI.csproj \
  -c Release \
  -o /app \
  --no-restore

# ============================================
# Stage 2: Build React 18 + Vite Frontend
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /client

COPY client/package*.json ./
RUN npm ci

COPY client/ .

# Build arguments for frontend configuration
ARG VITE_API_URL=/api
ARG VITE_DEFAULT_AVATAR=/default-avatar.png
ARG VITE_GOOGLE_CLIENT_ID=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEFAULT_AVATAR=$VITE_DEFAULT_AVATAR
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Install curl for Docker healthcheck and tzdata for timezone support
RUN apk add --no-cache curl tzdata

# Security: run as non-root user
RUN adduser -D -u 10001 -s /sbin/nologin appuser

# Copy published backend artifacts
COPY --from=backend-build /app .

# Copy compiled frontend dist into wwwroot (ASP.NET Core static files)
COPY --from=frontend-build /client/dist ./wwwroot

USER appuser

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "NomNa.WebAPI.dll"]
