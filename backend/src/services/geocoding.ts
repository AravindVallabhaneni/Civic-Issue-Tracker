import { logger } from '../config/logger';

interface NominatimResult {
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/**
 * Reverse-geocode a lat/lng to a human-readable address using Nominatim.
 * Nominatim is free, no API key required.
 *
 * Rate limit: Nominatim's usage policy requires max 1 request/second.
 * For production, consider caching results or using a paid provider.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'HyperlocalCivicTracker/1.0 (contact@example.com)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      logger.warn({ status: response.status, lat, lng }, 'Nominatim returned non-OK status');
      return formatFallbackAddress(lat, lng);
    }

    const result = (await response.json()) as NominatimResult;

    if (!result.display_name) {
      return formatFallbackAddress(lat, lng);
    }

    // Build a compact address from structured components
    const addr = result.address;
    const parts = [
      addr.road,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.county,
      addr.state,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : result.display_name;
  } catch (error) {
    logger.warn({ error, lat, lng }, 'Reverse geocoding failed, using fallback');
    return formatFallbackAddress(lat, lng);
  }
}

function formatFallbackAddress(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Auto-suggest category from description keywords.
 * Simple heuristic — stretch goal is to replace with a real classifier.
 */
export function suggestCategory(description: string): string | null {
  const lower = description.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    streetlight: ['streetlight', 'street light', 'lamp post', 'light out', 'dark street', 'no light'],
    garbage: ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'pile up', 'smell'],
    water_leak: ['water', 'leak', 'pipe', 'flood', 'overflow', 'burst', 'sewage', 'drain'],
    pothole: ['pothole', 'pot hole', 'hole', 'crater', 'depression', 'broken road'],
    road_damage: ['crack', 'damaged road', 'road damage', 'pavement', 'sidewalk', 'curb'],
    noise_pollution: ['noise', 'loud', 'construction', 'sound', 'disturbance'],
    illegal_dumping: ['illegal dump', 'abandoned', 'dumping', 'discarded', 'junk'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return null;
}
