---
name: cicd-pipeline
description: >-
  Use this skill when setting up or modifying CI/CD pipelines, Docker configurations,
  GitHub Actions workflows, or deployment strategies for PulseChat. It covers
  multi-stage Docker builds, GitHub Actions best practices, and deployment workflows.
---

# CI/CD Pipeline Skill — PulseChat

## 1. GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true  # Cancel stale runs

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: pulsechat_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ hashFiles('**/*.csproj') }}
      - run: dotnet restore
      - run: dotnet build --no-restore
      - run: dotnet test --no-build --verbosity normal

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit     # Type check
      - run: npm run lint          # ESLint
      - run: npm run test -- --run # Vitest

  build-docker:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## 2. Docker Multi-Stage Build

```dockerfile
# Dockerfile
# ============================================
# Stage 1: Build .NET Backend
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

# Copy csproj files first for layer caching
COPY src/*/*.csproj ./
RUN for f in *.csproj; do \
      dir=$(basename "$f" .csproj); \
      mkdir -p "$dir" && mv "$f" "$dir/"; \
    done
RUN dotnet restore "PulseChat.WebAPI/PulseChat.WebAPI.csproj"

# Copy source and publish
COPY src/ .
RUN dotnet publish "PulseChat.WebAPI/PulseChat.WebAPI.csproj" \
    -c Release -o /app --no-restore

# ============================================
# Stage 2: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /client
COPY client/package*.json ./
RUN npm ci --production=false
COPY client/ .
RUN npm run build

# ============================================
# Stage 3: Production Runtime (Minimal)
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Security: run as non-root
RUN adduser --disabled-password --gecos '' appuser
USER appuser

COPY --from=backend-build /app .
COPY --from=frontend-build /client/dist ./wwwroot

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "PulseChat.WebAPI.dll"]
```

## 3. Docker Compose (Development)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pulsechat
      POSTGRES_USER: pulsechat
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## 4. Best Practices Checklist

- [ ] Pin GitHub Action versions (e.g., `actions/checkout@v4`)
- [ ] Cache NuGet + npm dependencies
- [ ] Use concurrency groups to cancel stale runs
- [ ] Tag Docker images with Git SHA — NEVER rely on `:latest` alone
- [ ] Use GitHub Secrets for all credentials
- [ ] Multi-stage build for minimal production image
- [ ] Run as non-root user in container
- [ ] Add health check endpoint (`/health`)
- [ ] Manual approval gate for production deployments
- [ ] Scan Docker images for vulnerabilities before deploy
