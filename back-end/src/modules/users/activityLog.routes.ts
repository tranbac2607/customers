import { Router } from 'express';
import { authenticate, requireRole } from '@/modules/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { activityLogService, type ActivityAction } from '@/services/activityLog.service';

const router = Router();

// Admin-only: view activity log.
router.use(authenticate, requireRole('admin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as ActivityAction | undefined;
    const result = await activityLogService.list({ userId, action, page, limit });
    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
          hasNext: result.page * result.limit < result.total,
          hasPrev: result.page > 1,
        },
      },
    });
  }),
);

export default router;
