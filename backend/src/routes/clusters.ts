import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

const UpdateStatusSchema = z.object({
  status: z.enum(['acknowledged', 'in_progress', 'resolved', 'rejected']),
  note: z.string().max(500).optional(),
});

const BboxQuerySchema = z.object({
  min_lat: z.coerce.number().optional(),
  min_lng: z.coerce.number().optional(),
  max_lat: z.coerce.number().optional(),
  max_lng: z.coerce.number().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/clusters
 * Returns clusters optionally filtered by bbox, category, status.
 * Used by the map to display cluster markers.
 */
router.get('/', async (req, res, next) => {
  try {
    const query = BboxQuerySchema.parse(req.query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_clusters_in_viewport', {
      p_min_lat: query.min_lat ?? -90,
      p_min_lng: query.min_lng ?? -180,
      p_max_lat: query.max_lat ?? 90,
      p_max_lng: query.max_lng ?? 180,
      p_category: query.category ?? null,
      p_status: query.status ?? null,
      p_limit: query.limit,
      p_offset: query.offset,
    });

    if (error) {
      logger.error({ error }, 'Failed to fetch clusters');
      throw new HttpError(500, 'Failed to fetch clusters', 'DB_ERROR');
    }

    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clusters/:id
 * Get a single cluster with its reports.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cluster, error: clusterError } = await (supabaseAdmin as any).rpc('get_cluster_detail', { p_cluster_id: id });

    if (clusterError) {
      throw new HttpError(500, 'Failed to fetch cluster', 'DB_ERROR');
    }

    if (!cluster || (Array.isArray(cluster) && cluster.length === 0)) {
      throw new HttpError(404, 'Cluster not found', 'NOT_FOUND');
    }

    // Fetch status history
    const { data: history } = await supabaseAdmin
      .from('status_updates')
      .select('id, old_status, new_status, note, created_at, updated_by')
      .eq('cluster_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      cluster: Array.isArray(cluster) ? cluster[0] : cluster,
      status_history: history || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/clusters/:id/status
 * Update cluster status — restricted to department_staff and admin.
 * Writes an audit log entry to status_updates.
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole('department_staff', 'admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = UpdateStatusSchema.parse(req.body);

      // Fetch current cluster status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawCluster, error: fetchError } = await (supabaseAdmin as any)
        .from('issue_clusters')
        .select('id, status, department_id')
        .eq('id', id)
        .single();

      const currentCluster = rawCluster as { id: string; status: string; department_id: string | null } | null;
      if (fetchError || !currentCluster) {
        throw new HttpError(404, 'Cluster not found', 'NOT_FOUND');
      }

      // Department staff can only update clusters assigned to their department
      if (req.userRole === 'department_staff') {
        const reqWithDept = req as typeof req & { departmentId?: string };
        if (currentCluster.department_id !== reqWithDept.departmentId) {
          throw new HttpError(403, 'You can only update clusters assigned to your department', 'FORBIDDEN');
        }
      }

      const oldStatus = currentCluster.status;
      const newClusterStatus = body.status === 'resolved' ? 'resolved' : 'assigned';

      // Update cluster status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabaseAdmin as any)
        .from('issue_clusters')
        .update({
          status: newClusterStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw new HttpError(500, 'Failed to update cluster status', 'DB_ERROR');
      }

      // Update all reports in this cluster to the new status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('issue_reports')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('cluster_id', id);

      // Write audit trail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: auditError } = await (supabaseAdmin as any)
        .from('status_updates')
        .insert({
          cluster_id: id,
          updated_by: req.userId,
          old_status: oldStatus,
          new_status: body.status,
          note: body.note || null,
        });

      if (auditError) {
        logger.warn({ error: auditError, clusterId: id }, 'Failed to write status audit log');
      }

      logger.info(
        { clusterId: id, oldStatus, newStatus: body.status, updatedBy: req.userId },
        'Cluster status updated'
      );

      res.json({
        id,
        status: newClusterStatus,
        note: body.note || null,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
