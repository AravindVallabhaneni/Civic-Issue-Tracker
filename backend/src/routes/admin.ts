import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/admin/users
 * List all users with their profiles.
 */
router.get('/users', async (_req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles, error } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id, full_name, role, department_id, created_at, departments(name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new HttpError(500, 'Failed to fetch users', 'DB_ERROR');

    // Get emails from auth admin API
    const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) {
      logger.warn({ error: authErr }, 'Could not fetch auth users list');
    }

    const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) ?? []);

    const merged = (profiles as any[]).map((p: any) => ({
      id: p.id,
      email: emailMap.get(p.id) ?? '(unknown)',
      full_name: p.full_name,
      role: p.role,
      department_id: p.department_id,
      department_name: p.departments?.name ?? null,
      created_at: p.created_at,
    }));

    res.json(merged);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/users/:id
 * Update a user's role and/or department.
 */
const UpdateUserSchema = z.object({
  role: z.enum(['citizen', 'department_staff', 'admin']).optional(),
  department_id: z.string().uuid().nullable().optional(),
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = UpdateUserSchema.parse(req.body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from('profiles')
      .update({ ...body })
      .eq('id', id);

    if (error) throw new HttpError(500, 'Failed to update user', 'DB_ERROR');
    logger.info({ userId: id, changes: body, updatedBy: req.userId }, 'Admin updated user');
    res.json({ success: true });
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/departments
 * Full department list with cluster counts.
 */
router.get('/departments', async (_req, res, next) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('departments')
      .select('id, name, category_keys, contact_email, created_at');

    if (error) throw new HttpError(500, 'Failed to fetch departments', 'DB_ERROR');

    // Count clusters per department
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: counts } = await (supabaseAdmin as any)
      .from('issue_clusters')
      .select('department_id, status');

    const deptStats = new Map<string, { total: number; open: number; resolved: number }>();
    for (const row of (counts ?? []) as any[]) {
      const s = deptStats.get(row.department_id) ?? { total: 0, open: 0, resolved: 0 };
      s.total++;
      if (row.status === 'open' || row.status === 'assigned') s.open++;
      if (row.status === 'resolved') s.resolved++;
      deptStats.set(row.department_id, s);
    }

    const result = (data as any[]).map((d: any) => ({
      ...d,
      ...(deptStats.get(d.id) ?? { total: 0, open: 0, resolved: 0 }),
    }));

    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/departments
 * Create a new department.
 */
const CreateDeptSchema = z.object({
  name: z.string().min(2),
  category_keys: z.array(z.string()),
  contact_email: z.string().email().optional(),
});

router.post('/departments', async (req, res, next) => {
  try {
    const body = CreateDeptSchema.parse(req.body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any)
      .from('departments')
      .insert(body)
      .select()
      .single();

    if (error) throw new HttpError(500, 'Failed to create department', 'DB_ERROR');
    res.status(201).json(data);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/overview
 * Summary stats for admin dashboard.
 */
router.get('/overview', async (_req, res, next) => {
  try {
    const [reportsRes, clustersRes, usersRes] = await Promise.all([
      (supabaseAdmin as any).from('issue_reports').select('id, status, created_at', { count: 'exact', head: false }),
      (supabaseAdmin as any).from('issue_clusters').select('id, status, priority, created_at', { count: 'exact', head: false }),
      (supabaseAdmin as any).from('profiles').select('id, role', { count: 'exact', head: false }),
    ]);

    const reports: any[] = reportsRes.data ?? [];
    const clusters: any[] = clustersRes.data ?? [];
    const users: any[] = usersRes.data ?? [];

    const now = Date.now();
    const day = 86400000;
    const week = 7 * day;

    res.json({
      total_reports: reports.length,
      reports_today: reports.filter(r => now - new Date(r.created_at).getTime() < day).length,
      reports_this_week: reports.filter(r => now - new Date(r.created_at).getTime() < week).length,
      total_clusters: clusters.length,
      open_clusters: clusters.filter(c => c.status === 'open').length,
      assigned_clusters: clusters.filter(c => c.status === 'assigned').length,
      resolved_clusters: clusters.filter(c => c.status === 'resolved').length,
      high_priority: clusters.filter(c => c.priority >= 40 && c.status !== 'resolved').length,
      total_users: users.length,
      staff_users: users.filter(u => u.role === 'department_staff').length,
      admin_users: users.filter(u => u.role === 'admin').length,
    });
  } catch (err) { next(err); }
});

export default router;
