import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/stats/public
 * Returns aggregate transparency stats for the public dashboard.
 */
router.get('/public', async (_req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_public_stats');

    if (error) {
      throw new HttpError(500, 'Failed to fetch stats', 'DB_ERROR');
    }

    res.json(data || {});
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/department/:id
 * Returns per-department stats — for department dashboard.
 */
router.get('/department/:id', async (req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_department_stats', {
      p_department_id: req.params.id,
    });

    if (error) {
      throw new HttpError(500, 'Failed to fetch department stats', 'DB_ERROR');
    }

    res.json(data || {});
  } catch (err) {
    next(err);
  }
});

export default router;
