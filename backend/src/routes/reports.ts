import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { clusterReport } from '../services/clustering';
import { reverseGeocode, suggestCategory } from '../services/geocoding';
import { storageService } from '../services/storage';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { reportRateLimit } from '../middleware/rateLimit';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import type { IssueCategory } from '../types/database';

const router = Router();

// Multer config — use memory storage so we can hand off to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

const VALID_CATEGORIES: IssueCategory[] = [
  'streetlight', 'garbage', 'water_leak', 'pothole',
  'road_damage', 'noise_pollution', 'illegal_dumping', 'other',
];

const CreateReportSchema = z.object({
  category: z.enum(VALID_CATEGORIES as [IssueCategory, ...IssueCategory[]]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/**
 * POST /api/reports
 * Create a new issue report with optional photo upload.
 * Triggers clustering synchronously.
 */
router.post(
  '/',
  reportRateLimit,
  optionalAuthenticate,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const body = CreateReportSchema.parse(req.body);
      const { category, description, lat, lng } = body;
      const reportId = crypto.randomUUID();

      logger.info({ reportId, category, lat, lng }, 'Creating new report');

      // 1. Upload photo if provided
      let photoUrl: string | undefined;
      if (req.file) {
        photoUrl = await storageService.uploadPhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          reportId
        );
      }

      // 2. Reverse geocode
      const addressText = await reverseGeocode(lat, lng);

      // 3. Insert report with PostGIS point
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: report, error: insertError } = await (supabaseAdmin as any).rpc('create_report', {
        p_id: reportId,
        p_reporter_id: req.userId || null,
        p_category: category,
        p_description: description || null,
        p_photo_url: photoUrl || null,
        p_lat: lat,
        p_lng: lng,
        p_address_text: addressText,
      });

      if (insertError) {
        logger.error({ error: insertError }, 'Failed to insert report');
        throw new HttpError(500, 'Failed to create report', 'DB_ERROR');
      }

      // 4. Run clustering (synchronous — fast enough for 150m radius with gist index)
      let clusterId: string | undefined;
      try {
        clusterId = await clusterReport({
          reportId,
          category,
          lat,
          lng,
        });
      } catch (clusterError) {
        // Clustering failure shouldn't fail the whole request
        logger.error({ error: clusterError, reportId }, 'Clustering failed — report saved without cluster');
      }

      // 5. Suggest auto-categorization hint based on description
      const suggestedCategory = description ? suggestCategory(description) : null;

      res.status(201).json({
        id: reportId,
        category,
        description: description || null,
        photo_url: photoUrl || null,
        lat,
        lng,
        address_text: addressText,
        status: 'acknowledged',
        cluster_id: clusterId || null,
        suggested_category: suggestedCategory !== category ? suggestedCategory : null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/:id
 * Get a single report by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_report_by_id', { p_id: id });

    if (error) {
      throw new HttpError(500, 'Failed to fetch report', 'DB_ERROR');
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new HttpError(404, 'Report not found', 'NOT_FOUND');
    }

    res.json(Array.isArray(data) ? data[0] : data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports
 * Get reports, optionally filtered by cluster_id.
 */
router.get('/', async (req, res, next) => {
  try {
    const { cluster_id, limit = '20', offset = '0' } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc('get_reports_geojson', {
      p_cluster_id: (cluster_id as string) || null,
      p_limit: parseInt(limit as string, 10),
      p_offset: parseInt(offset as string, 10),
    });

    if (error) {
      throw new HttpError(500, 'Failed to fetch reports', 'DB_ERROR');
    }

    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

export default router;
