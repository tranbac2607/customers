import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Liveness + DB status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, example: ok }
 *                     uptime: { type: number }
 *                     timestamp: { type: string, format: date-time }
 *                     db: { type: string, enum: [connected, disconnected] }
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const dbState = mongoose.connection.readyState;
    const db = dbState === 1 || dbState === 2 ? 'connected' : 'disconnected';
    res.json(
      ok({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db,
        env: process.env.NODE_ENV ?? 'development',
      }),
    );
  }),
);

export default router;
