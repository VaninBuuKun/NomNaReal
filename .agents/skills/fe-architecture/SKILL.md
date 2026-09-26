---
name: fe-architecture
description: >-
  Use this skill when creating or modifying React frontend components, pages, hooks,
  or styles for the PulseChat client application. It defines the folder structure,
  component design rules, styling strategy, state management patterns, and naming
  conventions to ensure UI consistency across the entire application.
---

# Frontend Architecture Skill — PulseChat

## 1. Folder Structure (Feature-Based)

```
client/src/
├── app/                    # App shell: Router + Providers ONLY
│   ├── App.tsx             # Wrap Providers + <RouterProvider />
│   ├── routes.tsx          # All route definitions
│   └── providers/
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       └── SignalRProvider.tsx
│
├── features/               # Feature modules (self-contained)
│   ├── auth/
│   │   ├── pages/          # LoginPage.tsx, RegisterPage.tsx
│   │   ├── components/     # LoginForm.tsx, RegisterForm.tsx (PRIVATE)
│   │   ├── hooks/          # useAuth.ts, useLogin.ts
│   │   ├── services/       # authApi.ts
│   │   └── index.ts        # PUBLIC exports only
│   ├── workspace/
│   ├── channel/
│   ├── chat/
│   ├── thread/
│   └── settings/
│
├── shared/                 # Reusable across ALL features
│   ├── ui/                 # Design System Primitives
│   │   ├── Button/         # Button.tsx + Button.module.css
│   │   ├── Input/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Modal/
│   │   ├── Tooltip/
│   │   ├── IconButton/
│   │   └── Spinner/
│   ├── hooks/              # useLocalStorage, useDebounce
│   ├── utils/              # formatDate, cn()
│   └── constants/          # API_BASE_URL, ROUTES
│
├── styles/
│   ├── globals.css         # Reset + CSS Variable themes
│   ├── tokens.css          # Spacing, font-size, border-radius tokens
│   └── animations.css      # Shared @keyframes
│
└── types/
    └── index.ts
```

## 2. Component Creation Rules

### 2.1 Where to put a new component?

Ask yourself:
1. **Is it a UI primitive** (Button, Input, Modal, Avatar)? → `shared/ui/<ComponentName>/`
2. **Is it used by only ONE feature?** → `features/<feature>/components/`
3. **Is it used by MULTIPLE features?** → Either `shared/ui/` or create a new shared component

### 2.2 Component file structure

Every component MUST have:
```
ComponentName/
├── ComponentName.tsx        # Component logic + JSX
├── ComponentName.module.css # Scoped styles (CSS Module)
└── index.ts                 # Re-export: export { ComponentName } from './ComponentName'
```

### 2.3 Component code pattern

```tsx
// Button.tsx
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled,
  className,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### 2.4 Strict prohibitions

- ❌ **NO inline styles** (`style={{...}}`) — use CSS Modules
- ❌ **NO `window.prompt()`** — use `shared/ui/Modal/`
- ❌ **NO ad-hoc buttons/inputs** — use `shared/ui/Button`, `shared/ui/Input`
- ❌ **NO hardcoded colors** — use CSS variables: `var(--accent-primary)`
- ❌ **NO cross-feature imports** — Feature A cannot import from `features/B/components/`
- ❌ **NO mixing icon libraries** — use `@phosphor-icons/react` ONLY

## 3. Styling Rules

### 3.1 CSS Module pattern

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary {
  background: var(--accent-primary);
  color: white;
}
.primary:hover {
  background: var(--accent-hover);
}

.sm { padding: var(--space-1) var(--space-3); font-size: var(--text-sm); }
.md { padding: var(--space-2) var(--space-4); font-size: var(--text-base); }
.lg { padding: var(--space-3) var(--space-6); font-size: var(--text-lg); }
```

### 3.2 Design Tokens (tokens.css)

Always reference tokens — never use raw values:
```css
:root {
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Typography */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Font */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## 4. State Management Rules

### 4.1 Decision tree

```
Is it from an API? → TanStack Query (useQuery / useMutation)
Is it global UI state? → Zustand store
Is it auth/theme? → React Context (low frequency)
Is it local to one component? → useState / useReducer
```

### 4.2 TanStack Query pattern

```tsx
// features/workspace/hooks/useWorkspaces.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspaceApi';

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.getAll,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};
```

### 4.3 Zustand pattern

```tsx
// shared/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  isSidebarOpen: boolean;
  setActiveWorkspace: (id: string) => void;
  setActiveChannel: (id: string) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspaceId: null,
  activeChannelId: null,
  isSidebarOpen: true,
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));
```

## 5. Routing Rules

- Auth pages (Login, Register) are SEPARATE routes — NOT modals
- Use React Router v6 `createBrowserRouter`
- Protected routes redirect to `/login` if not authenticated

```tsx
// app/routes.tsx
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: 'workspace/:workspaceId', element: <WorkspaceView /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

## 6. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Component files | PascalCase | `ChatArea.tsx` |
| CSS Module files | PascalCase matching component | `ChatArea.module.css` |
| Hook files | camelCase with `use` prefix | `useWorkspaces.ts` |
| Service files | camelCase with `Api` suffix | `workspaceApi.ts` |
| Store files | camelCase with `Store` suffix | `uiStore.ts` |
| Utility files | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
