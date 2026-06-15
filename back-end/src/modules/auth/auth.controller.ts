import { Request, Response } from 'express';
import { authService, COOKIE_NAMES } from './auth.service';
import { ok } from '@/utils/ApiResponse';
import { tokenResponseDto, userResponseDto } from './auth.dto';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from './auth.schema';

const metaFromReq = (req: Request) => ({
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

export const authController = {
  async login(req: Request, res: Response) {
    const input = req.body as LoginInput;
    const result = await authService.login(input, res, metaFromReq(req));
    res.json(
      ok(
        tokenResponseDto(
          result.accessToken,
          result.refreshToken,
          result.accessExpiresIn,
          result.user,
        ),
      ),
    );
  },

  async refresh(req: Request, res: Response) {
    const input = req.body as { refreshToken?: string } | undefined;
    const cookieRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
    const result = await authService.refresh(input, res, cookieRefreshToken, metaFromReq(req));
    res.json(
      ok({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.accessExpiresIn,
      }),
    );
  },

  async logout(req: Request, res: Response) {
    const input = req.body as { refreshToken?: string } | undefined;
    const cookieRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
    await authService.logout(req.user!.id, input, res, cookieRefreshToken, metaFromReq(req));
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.json(ok({ user: userResponseDto(user) }));
  },

  // ─────────────────────────────────────────────────────────────────────
  // Public registration
  // ─────────────────────────────────────────────────────────────────────

  async register(req: Request, res: Response) {
    const input = req.body as RegisterInput;
    const { user, verificationSent } = await authService.register(input, metaFromReq(req));
    res.status(201).json(
      ok({
        user: userResponseDto(user),
        verificationSent,
        message: verificationSent
          ? 'Registration successful. Please check your email to verify your account.'
          : 'Registration successful. You can sign in immediately.',
      }),
    );
  },

  async verifyEmail(req: Request, res: Response) {
    const input = req.body as VerifyEmailInput;
    const { user } = await authService.verifyEmail(input.token, metaFromReq(req));
    res.json(
      ok({
        user: userResponseDto(user),
        message: 'Email verified successfully. You can now sign in.',
      }),
    );
  },

  async resendVerification(req: Request, res: Response) {
    const input = req.body as { email: string };
    const result = await authService.resendVerification(input.email, metaFromReq(req));
    // Always 200 — don't leak whether the email exists.
    res.json(
      ok({
        sent: result.sent,
        message: 'If that email exists and is unverified, a new link has been sent.',
      }),
    );
  },

  // ─────────────────────────────────────────────────────────────────────
  // Password reset
  // ─────────────────────────────────────────────────────────────────────

  async forgotPassword(req: Request, res: Response) {
    const input = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(input, metaFromReq(req));
    res.json(
      ok({
        sent: result.sent,
        message: 'If that email exists, a password reset link has been sent.',
      }),
    );
  },

  async resetPassword(req: Request, res: Response) {
    const input = req.body as ResetPasswordInput;
    const { user } = await authService.resetPassword(input, metaFromReq(req));
    res.json(
      ok({
        user: userResponseDto(user),
        message: 'Password has been reset. Please sign in with your new password.',
      }),
    );
  },

  async changePassword(req: Request, res: Response) {
    const input = req.body as ChangePasswordInput;
    await authService.changePassword(req.user!.id, input, metaFromReq(req));
    res.json(
      ok({
        message:
          'Password changed successfully. You have been logged out of other devices for security.',
      }),
    );
  },

  // ─────────────────────────────────────────────────────────────────────
  // Profile
  // ─────────────────────────────────────────────────────────────────────

  async updateProfile(req: Request, res: Response) {
    const input = req.body as UpdateProfileInput;
    const user = await authService.updateProfile(req.user!.id, input, metaFromReq(req));
    res.json(ok({ user: userResponseDto(user) }));
  },
};
