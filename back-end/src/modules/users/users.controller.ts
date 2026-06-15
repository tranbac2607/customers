import { Request, Response } from 'express';
import { ok } from '@/utils/ApiResponse';
import { usersService } from './users.service';
import { AvatarUploadInput, CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema';

const paramString = (v: string | string[] | undefined): string => {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
};

const meta = (req: Request) => ({
  actorId: req.user!.id,
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

export const usersController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ListUsersQuery;
    const result = await usersService.list(query, meta(req));
    res.json(
      ok({
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page * result.limit < result.total,
          hasPrev: result.page > 1,
        },
      }),
    );
  },

  async getById(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const user = await usersService.getById(id);
    res.json(ok({ user }));
  },

  async create(req: Request, res: Response) {
    const input = req.body as CreateUserInput;
    const user = await usersService.create(input, meta(req));
    res.status(201).json(ok({ user }));
  },

  async update(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const input = req.body as UpdateUserInput;
    const user = await usersService.update(id, input, meta(req));
    res.json(ok({ user }));
  },

  async setRole(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const { role } = req.body as { role: 'admin' | 'user' };
    const user = await usersService.setRole(id, role, meta(req));
    res.json(ok({ user }));
  },

  async setStatus(req: Request, res: Response) {
    const id = paramString(req.params.id);
    const { status } = req.body as { status: 'active' | 'pending' | 'disabled' };
    const user = await usersService.setStatus(id, status, meta(req));
    res.json(ok({ user }));
  },

  async delete(req: Request, res: Response) {
    const id = paramString(req.params.id);
    await usersService.delete(id, meta(req));
    res.status(204).send();
  },

  async uploadAvatar(req: Request, res: Response) {
    const input = req.body as AvatarUploadInput;
    const user = await usersService.uploadAvatar(req.user!.id, input.dataUrl, meta(req));
    res.json(ok({ user }));
  },
};
