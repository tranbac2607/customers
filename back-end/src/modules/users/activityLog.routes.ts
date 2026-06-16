import { Router } from 'express';
import { authenticate, requireRole } from '@/modules/auth/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { activityLogService, type ActivityAction } from '@/services/activityLog.service';

const router = Router();

// Admin-only: view activity log.
router.use(authenticate, requireRole('admin'));

/**
 * Parse an ISO date string from a query param into a Date, or throw
 * 400 if it's not a valid date. Used for the `from` / `to` range
 * filter on the activity log.
 */
function parseDateParam(raw: unknown, field: 'from' | 'to'): Date | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw !== 'string') {
    throw new ApiError(400, 'BAD_REQUEST', `${field} must be an ISO date string`);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, 'BAD_REQUEST', `${field} is not a valid date`);
  }
  return d;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as ActivityAction | undefined;

    // Two valid input shapes:
    //   - Bare date: "2024-01-15" (parsed by `new Date()` as UTC
    //     midnight). For the upper bound we bump it to end-of-day so
    //     a same-day range still matches every log of that day.
    //   - Full ISO datetime: "2024-01-15T17:30:00.000Z" (or any
    //     string `new Date()` accepts). The caller picked a
    //     specific moment, so we use it as-is — no snap.
    //
    // We distinguish the two by checking whether the original string
    // contains a `T` separator; the raw param has to be inspected
    // because `new Date("2024-01-15")` already drops the time
    // component from the Date object.
    const fromRaw = req.query.from;
    const toRaw = req.query.to;
    const from = parseDateParam(fromRaw, 'from');
    const toParsed = parseDateParam(toRaw, 'to');
    const to =
      toParsed && typeof toRaw === 'string' && !toRaw.includes('T')
        ? new Date(toParsed.getTime() + 24 * 60 * 60 * 1000 - 1)
        : toParsed;
    if (from && to && from > to) {
      throw new ApiError(400, 'BAD_REQUEST', 'from must be on or before to');
    }

    const result = await activityLogService.list({ userId, action, page, limit, from, to });
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
