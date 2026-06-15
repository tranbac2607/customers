import { IUser } from './auth.model';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'disabled';
  avatarUrl?: string;
  emailVerified: boolean;
  themePreference: 'light' | 'dark' | 'system';
  lastLoginAt?: string;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: UserResponse;
}

export const userResponseDto = (u: IUser): UserResponse => ({
  id: u._id.toString(),
  email: u.email,
  username: u.username,
  name: u.name,
  role: u.role,
  status: u.status,
  avatarUrl: u.avatarUrl,
  emailVerified: Boolean(u.emailVerifiedAt),
  themePreference: u.themePreference ?? 'system',
  lastLoginAt: u.lastLoginAt?.toISOString(),
  createdAt: u.createdAt.toISOString(),
});

export const tokenResponseDto = (
  accessToken: string,
  refreshToken: string,
  accessExpiresIn: number,
  user: IUser,
): TokenResponse => ({
  accessToken,
  refreshToken,
  expiresIn: accessExpiresIn,
  user: userResponseDto(user),
});
