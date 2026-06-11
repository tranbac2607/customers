import { Request, Response } from 'express';
import { authService } from './auth.service';
import { ok } from '@/utils/ApiResponse';
import { tokenResponseDto, userResponseDto } from './auth.dto';
import { LoginInput, RefreshInput } from './auth.schema';

export const authController = {
  async login(req: Request, res: Response) {
    const input = req.body as LoginInput;
    const result = await authService.login(input);
    res.json(ok(tokenResponseDto(result.accessToken, result.refreshToken, result.accessExpiresIn, result.user)));
  },

  async refresh(req: Request, res: Response) {
    const input = req.body as RefreshInput;
    const result = await authService.refresh(input);
    res.json(ok({ accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.accessExpiresIn }));
  },

  async logout(req: Request, res: Response) {
    const input = req.body as RefreshInput;
    await authService.logout(req.user!.id, input);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.json(ok({ user: userResponseDto(user) }));
  },
};
