import { supabaseAdmin } from '../config/supabase';
import { logger } from '../config/logger';

const STORAGE_BUCKET = 'issue-photos';
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export class StorageService {
  /**
   * Upload a photo to Supabase Storage.
   * Returns the public URL of the uploaded file.
   */
  async uploadPhoto(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    reportId: string
  ): Promise<string> {
    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file size
    const sizeMB = fileBuffer.length / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${sizeMB.toFixed(1)}MB. Max: ${MAX_FILE_SIZE_MB}MB`);
    }

    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `reports/${reportId}/photo-${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error({ error, reportId }, 'Photo upload failed');
      throw new Error(`Photo upload failed: ${error.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    logger.info({ path: data.path, reportId }, 'Photo uploaded successfully');
    return urlData.publicUrl;
  }

  /**
   * Delete a photo from Supabase Storage.
   */
  async deletePhoto(photoUrl: string): Promise<void> {
    // Extract path from URL
    const urlObj = new URL(photoUrl);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (!pathMatch) {
      logger.warn({ photoUrl }, 'Could not extract storage path from URL');
      return;
    }

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([pathMatch[1]]);

    if (error) {
      logger.warn({ error, photoUrl }, 'Failed to delete photo');
    }
  }
}

export const storageService = new StorageService();
