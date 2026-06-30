import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/departments
 * Returns all departments.
 */
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, category_keys, contact_email')
      .order('name');

    if (error) {
      throw new HttpError(500, 'Failed to fetch departments', 'DB_ERROR');
    }

    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/departments/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, category_keys, contact_email')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      throw new HttpError(404, 'Department not found', 'NOT_FOUND');
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
