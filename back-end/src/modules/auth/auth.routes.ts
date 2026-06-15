import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { ok } from '@/utils/ApiResponse';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.schema';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(authController.register),
);
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);
router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  asyncHandler(authController.resendVerification),
);
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

// Liveness probe so the FE can check session without committing to /me.
router.get('/session', (_req, res) => {
  res.json(
    ok({
      authenticated: false,
      message: 'Use /me with credentials to check actual session',
    }),
  );
});

export default router;
