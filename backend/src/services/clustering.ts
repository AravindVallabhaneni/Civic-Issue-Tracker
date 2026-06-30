import { supabaseAdmin } from '../config/supabase';
import { logger } from '../config/logger';
import { config } from '../config/env';
import type { IssueCategory, ClusterStatus } from '../types/database';

interface ClusteringInput {
  reportId: string;
  category: IssueCategory;
  lat: number;
  lng: number;
}

interface ClusterRow {
  id: string;
  category: IssueCategory;
  report_count: number;
  department_id: string | null;
  status: ClusterStatus;
  priority: number;
  created_at: string;
}

/**
 * Compute cluster priority as a function of report count and age.
 *
 * Priority algorithm:
 *   base  = log2(report_count + 1) × 10     — grows with reports (diminishing returns)
 *   age   = hoursSinceCreation / 24           — days elapsed
 *   score = base + (age × 2)                  — older clusters with more reports escalate faster
 *
 * This gives interviewers something concrete to discuss: why log2? It prevents
 * a single flood of duplicate reports from instantly maxing out priority.
 * Why add age? Because a 1-report cluster that's been ignored for a week is more
 * urgent than a new 1-report cluster.
 *
 * Range: roughly 0–100 in normal operation. Clamp to [1, 100].
 */
export function computePriority(reportCount: number, createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  const base = Math.log2(reportCount + 1) * 10;
  const ageFactor = ageDays * 2;

  const score = Math.round(base + ageFactor);
  return Math.max(1, Math.min(100, score));
}

/**
 * Core deduplication + clustering engine.
 *
 * When a new report arrives:
 * 1. Query issue_clusters for open clusters of the same category within
 *    CLUSTER_RADIUS_METERS using PostGIS ST_DWithin (uses the gist index).
 * 2. If match found → attach report to nearest cluster, recompute centroid,
 *    increment report_count, recompute priority.
 * 3. If no match → create a new cluster, auto-route to a department.
 *
 * Returns the cluster ID the report was assigned to.
 *
 * Scalability note (for interviews):
 * - At 1M+ reports/day, ST_DWithin with a gist index is still fast for small
 *   radii (~150m) because PostGIS generates a bounding-box pre-filter before
 *   the exact distance check, keeping the candidate set small.
 * - If further scale is needed: geohash the location, shard by geohash prefix,
 *   and use Redis GEOSEARCH for sub-millisecond proximity queries.
 * - The 150m radius is a judgment call: small enough to avoid clustering
 *   issues from different streets, large enough to catch reports of the
 *   same physical problem from nearby vantage points.
 */
export async function clusterReport(input: ClusteringInput): Promise<string> {
  const { reportId, category, lat, lng } = input;
  const radius = config.clusterRadiusMeters;

  logger.info({ reportId, category, lat, lng, radius }, 'Running clustering for new report');

  // Find nearby open clusters using PostGIS via raw SQL through the RPC layer.
  // If RPCs are unavailable (schema not applied), skip clustering gracefully.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nearbyClusters, error: queryError } = await (supabaseAdmin as any).rpc(
    'find_nearby_clusters',
    {
      p_category: category,
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: radius,
    }
  );

  if (queryError) {
    logger.warn({ error: queryError }, 'Clustering RPC unavailable — creating standalone cluster via direct insert');
    // Fall back to creating a cluster with direct inserts (no PostGIS centroid)
    return await createClusterDirect(reportId, category, lat, lng);
  }

  let clusterId: string;

  if (nearbyClusters && nearbyClusters.length > 0) {
    // Join to the nearest existing cluster
    const nearest = nearbyClusters[0] as ClusterRow;
    clusterId = nearest.id;

    logger.info({ clusterId, existingCount: nearest.report_count }, 'Found existing cluster — joining');

    // Increment report_count and recompute priority
    const newCount = nearest.report_count + 1;
    const newPriority = computePriority(newCount, nearest.created_at);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('issue_clusters')
      .update({
        report_count: newCount,
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId);

    // Try to update centroid via RPC (non-fatal if unavailable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).rpc('update_cluster_centroid', { p_cluster_id: clusterId }).catch(() => {});

  } else {
    // No nearby cluster — create a new one via direct insert
    logger.info({ category, lat, lng }, 'No nearby cluster found — creating new cluster');
    clusterId = await createClusterDirect(reportId, category, lat, lng);
  }

  // Attach the report to the cluster
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: reportUpdateError } = await (supabaseAdmin as any)
    .from('issue_reports')
    .update({
      cluster_id: clusterId,
      status: 'acknowledged',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportUpdateError) {
    logger.error({ error: reportUpdateError }, 'Failed to link report to cluster');
    throw new Error(`Report-cluster linking failed: ${reportUpdateError.message}`);
  }

  logger.info({ reportId, clusterId }, '✅ Report successfully clustered');
  return clusterId;
}

/**
 * Create a cluster with direct table insert (no PostGIS RPC needed).
 * Uses EWKT string for the centroid geometry which PostgREST accepts.
 */
async function createClusterDirect(
  _reportId: string,
  category: IssueCategory,
  lat: number,
  lng: number
): Promise<string> {
  const clusterId = crypto.randomUUID();
  const departmentId = await findDepartmentForCategory(category);
  const priority = computePriority(1, new Date().toISOString());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from('issue_clusters')
    .insert({
      id: clusterId,
      category,
      centroid: `SRID=4326;POINT(${lng} ${lat})`,
      report_count: 1,
      department_id: departmentId,
      status: departmentId ? 'assigned' : 'open',
      priority,
    });

  if (error) {
    logger.error({ error }, 'Failed to create cluster via direct insert');
    throw new Error(`Cluster creation failed: ${error.message}`);
  }

  logger.info({ clusterId, departmentId }, 'New cluster created via direct insert');
  return clusterId;
}

/**
 * Auto-routing: look up departments table by matching category against category_keys.
 * Returns department_id if found, null otherwise.
 *
 * Production extension: also filter by jurisdiction_geom using ST_Contains
 * to support ward-based routing.
 */
async function findDepartmentForCategory(category: IssueCategory): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('departments')
    .select('id, name, category_keys')
    .contains('category_keys', [category])
    .limit(1)
    .single();

  if (error || !data) {
    logger.warn({ category }, 'No department found for category — cluster will be unassigned');
    return null;
  }

  const dept = data as { id: string; name: string };
  logger.info({ departmentId: dept.id, departmentName: dept.name, category }, 'Auto-routed to department');
  return dept.id;
}

/**
 * Escalation logic: called by the cron job.
 * Bumps priority for stale open/assigned clusters.
 */
export async function escalateStaleClusters(thresholdDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staleClusters, error } = await (supabaseAdmin as any)
    .from('issue_clusters')
    .select('id, report_count, priority, created_at, updated_at')
    .in('status', ['open', 'assigned'])
    .lt('updated_at', cutoffDate.toISOString());

  if (error) {
    logger.error({ error }, 'Failed to query stale clusters');
    return 0;
  }

  if (!staleClusters || staleClusters.length === 0) {
    logger.info('No stale clusters to escalate');
    return 0;
  }

  logger.info({ count: staleClusters.length, thresholdDays }, 'Escalating stale clusters');

  let escalated = 0;
  for (const cluster of staleClusters) {
    // Recompute priority using original created_at (not updated_at) so age keeps growing
    const newPriority = Math.min(100, computePriority(cluster.report_count, cluster.created_at) + 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabaseAdmin as any)
      .from('issue_clusters')
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (cluster as { id: string }).id);

    if (!updateError) escalated++;
    else logger.warn({ clusterId: (cluster as { id: string }).id, error: updateError }, 'Failed to escalate cluster');
  }

  logger.info({ escalated }, '✅ Escalation job complete');
  return escalated;
}
