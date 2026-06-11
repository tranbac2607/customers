import { IUser } from './auth.model';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
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
  name: u.name,
  role: u.role,
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
