import { Request, Response } from 'express';
import { authService, COOKIE_NAMES } from './auth.service';
import { ok } from '@/utils/ApiResponse';
import { tokenResponseDto, userResponseDto } from './auth.dto';
import { LoginInput, RefreshInput } from './auth.schema';

export const authController = {
  async login(req: Request, res: Response) {
    const input = req.body as LoginInput;
    const result = await authService.login(input, res);
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
    const input = req.body as RefreshInput | undefined;
    // Cookies are parsed by cookieParser; fall back to body for legacy clients
    const cookieRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
    const result = await authService.refresh(input, res, cookieRefreshToken);
    res.json(
      ok({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.accessExpiresIn,
      }),
    );
  },

  async logout(req: Request, res: Response) {
    const input = req.body as RefreshInput | undefined;
    const cookieRefreshToken = req.cookies?.[COOKIE_NAMES.refreshToken] as string | undefined;
    await authService.logout(req.user!.id, input, res, cookieRefreshToken);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.json(ok({ user: userResponseDto(user) }));
  },
};
