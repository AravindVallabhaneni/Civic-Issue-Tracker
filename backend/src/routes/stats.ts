import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/stats/public
 * Returns aggregate transparency stats — built with direct queries (no RPC needed).
 */
router.get('/public', async (_req, res, next) => {
  try {
    const db = supabaseAdmin as any;

    const [
      { data: reports },
      { data: clusters },
      { data: deptBreakdown },
    ] = await Promise.all([
      db.from('issue_reports').select('id, category, status, created_at'),
      db.from('issue_clusters').select('id, status, priority, created_at, updated_at, department_id'),
      db.from('issue_clusters')
        .select('status, department_id, departments(name)')
        .not('department_id', 'is', null),
    ]);

    const totalReports: number = (reports ?? []).length;
    const totalClusters: number = (clusters ?? []).length;
    const openClusters = (clusters ?? []).filter((c: any) => c.status === 'open').length;

    // Resolved this month
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const resolvedThisMonth = (clusters ?? []).filter((c: any) =>
      c.status === 'resolved' && new Date(c.updated_at) >= monthStart
    ).length;

    // Avg resolution in hours (for resolved clusters)
    const resolvedClusters = (clusters ?? []).filter((c: any) => c.status === 'resolved');
    let avgResolutionHours: number | null = null;
    if (resolvedClusters.length > 0) {
      const totalHours = resolvedClusters.reduce((sum: number, c: any) => {
        return sum + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000;
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedClusters.length) * 10) / 10;
    }

    // By category
    const byCategory: Record<string, number> = {};
    for (const r of (reports ?? []) as any[]) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }

    // By department
    const deptMap = new Map<string, { department: string; total: number; resolved: number }>();
    for (const c of (deptBreakdown ?? []) as any[]) {
      const name = c.departments?.name ?? 'Unassigned';
      const entry = deptMap.get(name) ?? { department: name, total: 0, resolved: 0 };
      entry.total++;
      if (c.status === 'resolved') entry.resolved++;
      deptMap.set(name, entry);
    }

    // Monthly report counts (last 6 months)
    const monthly: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      monthly[key] = 0;
    }
    for (const r of (reports ?? []) as any[]) {
      const d = new Date(r.created_at);
      const key = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      if (key in monthly) monthly[key]++;
    }

    res.json({
      total_reports: totalReports,
      total_clusters: totalClusters,
      open_clusters: openClusters,
      resolved_this_month: resolvedThisMonth,
      avg_resolution_hours: avgResolutionHours,
      by_category: byCategory,
      by_department: Array.from(deptMap.values()),
      monthly_reports: Object.entries(monthly).map(([name, value]) => ({ name, value })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/department/:id
 */
router.get('/department/:id', async (req, res, next) => {
  try {
    const db = supabaseAdmin as any;
    const deptId = req.params.id;

    const { data: clusters } = await db
      .from('issue_clusters')
      .select('id, status, priority, created_at, updated_at')
      .eq('department_id', deptId);

    const all = (clusters ?? []) as any[];
    const resolved = all.filter((c: any) => c.status === 'resolved');
    let avgHours: number | null = null;
    if (resolved.length > 0) {
      avgHours = resolved.reduce((sum: number, c: any) =>
        sum + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 3600000, 0) / resolved.length;
    }

    res.json({
      total_clusters: all.length,
      open_clusters: all.filter((c: any) => c.status === 'open').length,
      assigned_clusters: all.filter((c: any) => c.status === 'assigned').length,
      resolved_clusters: resolved.length,
      avg_resolution_hours: avgHours ? Math.round(avgHours * 10) / 10 : null,
      high_priority_open: all.filter((c: any) => c.priority >= 50 && c.status !== 'resolved').length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
