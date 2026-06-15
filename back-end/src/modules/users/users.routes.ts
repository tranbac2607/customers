import { Router } from 'express';
import { authenticate, requireRole } from '@/modules/auth/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { usersController } from './users.controller';
import {
  avatarUploadSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from './users.schema';

const router = Router();

// Avatar upload is self-service — any authenticated user can change
// their own avatar. The admin-only routes below are mounted with
// requireRole('admin').
router.post(
  '/me/avatar',
  authenticate,
  validate(avatarUploadSchema),
  asyncHandler(usersController.uploadAvatar),
);

// Admin-only: list/create/update/delete users.
router.use(authenticate, requireRole('admin'));

router.get('/', validate(listUsersQuerySchema, 'query'), asyncHandler(usersController.list));
router.get('/:id', asyncHandler(usersController.getById));
router.post('/', validate(createUserSchema), asyncHandler(usersController.create));
router.patch('/:id', validate(updateUserSchema), asyncHandler(usersController.update));
router.post('/:id/role', asyncHandler(usersController.setRole));
router.post('/:id/status', asyncHandler(usersController.setStatus));
router.delete('/:id', asyncHandler(usersController.delete));

export default router;
