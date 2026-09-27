export type UserStatus = 0 | 1 | 2 | 3; // 0: Online, 1: Away, 2: DoNotDisturb, 3: Offline

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: UserStatus;
}

// Backend sets access_token and refresh_token in HttpOnly cookies and returns User
export type AuthResponse = User;
