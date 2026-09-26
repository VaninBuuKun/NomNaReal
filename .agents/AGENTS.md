# PulseChat — Project Rules

## Project Overview
PulseChat is a real-time chat application built with:
- **Backend**: .NET 9, Clean Architecture, CQRS/MediatR, ASP.NET Core Identity, EF Core + PostgreSQL, SignalR, Redis
- **Frontend**: React 18 + TypeScript + Vite, CSS Modules, TanStack Query, Zustand, React Router v6, Phosphor Icons

## Architecture Rules

### Backend (.NET)
- Follow **Clean Architecture**: Domain → Application → Infrastructure → WebAPI
- Domain layer has ZERO external dependencies
- Use **CQRS** pattern: separate Commands (writes) and Queries (reads) via MediatR
- All commands/queries MUST have FluentValidation validators
- Use **MediatR Pipeline Behaviors** for cross-cutting: Validation → Authorization → Logging → Handler
- DTOs live in `PulseChat.Shared` or in the feature's own folder under Application
- Controllers are thin — they ONLY dispatch MediatR requests and return results
- Use `IApplicationDbContext` interface (not concrete DbContext) in Application layer

### Frontend (React)
- Follow **Feature-based folder structure** — see `.agents/skills/fe-architecture/SKILL.md`
- Use **CSS Modules** (`.module.css`) for component styling — NO inline styles, NO styled-components
- Use **CSS Variables** from `styles/globals.css` for theming — NEVER hardcode colors
- Use **TanStack Query** for server state (API data) — NEVER store API data in Zustand/Context
- Use **Zustand** for global client state (sidebar, active IDs, UI flags)
- Use **React Context** ONLY for low-frequency state (auth, theme)
- Use `useState`/`useReducer` for local component state
- Use **Phosphor Icons** (`@phosphor-icons/react`) exclusively — do NOT mix icon libraries
- Use **React Router v6** for routing — Auth pages are separate routes, NOT modals
- Every reusable UI primitive (Button, Input, Modal, Avatar, Badge) MUST live in `shared/ui/`
- Feature components MUST use `shared/ui/` primitives — NEVER create ad-hoc buttons/inputs

### Code Quality
- TypeScript strict mode — no `any` types except justified edge cases
- Components are either **presentational** (dumb) or **container** (with hooks) — never both
- Custom hooks encapsulate business logic — components focus on rendering
- All exports from a feature folder go through `index.ts` (public API pattern)
- File naming: PascalCase for components (`Button.tsx`), camelCase for hooks (`useAuth.ts`)

### Security
- JWT stored in HttpOnly, SameSite=Strict cookies — NOT in localStorage
- Access tokens: 15 min max lifetime
- Refresh token rotation: new token on every refresh, invalidate old
- CORS: strict whitelist of allowed origins — never use wildcard `*`
- Rate limiting on auth endpoints
- Never put sensitive data (passwords, PII) in JWT claims
