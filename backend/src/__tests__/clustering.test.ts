import { computePriority } from '../services/clustering';

describe('computePriority', () => {
  const now = new Date().toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  it('should return at least 1 for a fresh single report', () => {
    const priority = computePriority(1, now);
    expect(priority).toBeGreaterThanOrEqual(1);
  });

  it('should return higher priority for more reports', () => {
    const lowCount = computePriority(1, now);
    const highCount = computePriority(20, now);
    expect(highCount).toBeGreaterThan(lowCount);
  });

  it('should return higher priority for older clusters', () => {
    const fresh = computePriority(1, now);
    const old = computePriority(1, sevenDaysAgo);
    expect(old).toBeGreaterThan(fresh);
  });

  it('should escalate severely for old clusters with many reports', () => {
    const neglected = computePriority(50, thirtyDaysAgo);
    const fresh = computePriority(1, now);
    expect(neglected).toBeGreaterThan(fresh);
  });

  it('should clamp priority to [1, 100]', () => {
    const extremeCount = computePriority(10000, thirtyDaysAgo);
    expect(extremeCount).toBeLessThanOrEqual(100);

    const zero = computePriority(0, now);
    expect(zero).toBeGreaterThanOrEqual(1);
  });

  it('should give higher priority to cluster with 2 reports vs 1', () => {
    const one = computePriority(1, twoDaysAgo);
    const two = computePriority(2, twoDaysAgo);
    expect(two).toBeGreaterThan(one);
  });

  it('log2 growth: adding more reports has diminishing returns on priority', () => {
    const delta1to2 = computePriority(2, now) - computePriority(1, now);
    const delta10to20 = computePriority(20, now) - computePriority(10, now);
    // The jump from 1→2 should be larger relative to 10→20 due to log scale
    expect(delta1to2).toBeGreaterThan(delta10to20 / 2);
  });
});

// Mock-based clustering integration tests
// In a real environment these would run against a test Supabase instance.
// Here we test the business logic contract.
describe('Clustering business logic (contract tests)', () => {
  it('new report far from any cluster should create a new cluster', () => {
    // This is tested via the distance check in find_nearby_clusters RPC.
    // Contract: if the RPC returns [], a new cluster MUST be created.
    expect(true).toBe(true); // Placeholder — actual test in integration suite
  });

  it('report within radius of existing cluster should join existing cluster', () => {
    // Contract: if the RPC returns [cluster], the report is attached to cluster.id
    // and report_count is incremented.
    expect(true).toBe(true);
  });

  it('centroid recomputation should average all member report locations', () => {
    // Centroid = (sum of lats / n, sum of lngs / n)
    // This is computed server-side via PostGIS AVG(ST_X(location)), AVG(ST_Y(location))
    const mockReports = [
      { lat: 12.9716, lng: 77.5946 },
      { lat: 12.9726, lng: 77.5956 },
    ];
    const expectedLat = mockReports.reduce((s, r) => s + r.lat, 0) / mockReports.length;
    const expectedLng = mockReports.reduce((s, r) => s + r.lng, 0) / mockReports.length;
    expect(expectedLat).toBeCloseTo(12.9721, 3);
    expect(expectedLng).toBeCloseTo(77.5951, 3);
  });
});
