import { Router } from 'express';
import { z } from 'zod';
import { authController } from './auth.controller';
import { authService } from './auth.service';
import { authenticate } from './auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { ok } from '@/utils/ApiResponse';
import { loginSchema, refreshSchema } from './auth.schema';
import { asyncHandler } from '@/utils/asyncHandler';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Tokens + user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:  { type: string }
 *                     refreshToken: { type: string }
 *                     expiresIn:    { type: integer }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:    { type: string }
 *                         email: { type: string }
 *                         name:  { type: string }
 *                         role:  { type: string, enum: [admin, user] }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginSchema), asyncHandler(authController.login));

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (mock)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               name:     { type: string }
 *               role:     { type: string, enum: [admin, user] }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Email already exists }
 */
router.post(
  '/register',
  validate(
    loginSchema.extend({ name: z.string().min(1), role: z.enum(['admin', 'user']).optional() }),
  ),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body as {
      email: string;
      password: string;
      name: string;
      role?: 'admin' | 'user';
    };
    const user = await authService.register({ email, password, name, role });
    res
      .status(201)
      .json(ok({ id: user._id.toString(), email: user.email, name: user.name, role: user.role }));
  }),
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New pair of tokens }
 *       401: { description: Invalid / reused refresh token }
 */
router.post('/refresh', asyncHandler(authController.refresh));

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Invalidate a refresh token
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204: { description: Logged out }
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, asyncHandler(authController.me));

// re-export to satisfy the linter about unused imports (validate/getValidated already used above)
export default router;
