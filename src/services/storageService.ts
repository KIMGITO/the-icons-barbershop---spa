import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Storage Service - Supabase Storage ready abstraction.
 * UI components interact only with this service, keeping storage implementation details decoupled.
 */

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const storageService = {
  /**
   * Validate file format and size
   */
  validateImage(file: File): ValidationResult {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Unsupported format (${file.type || 'unknown'}). Please upload JPG, PNG, or WEBP.` 
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.` 
      };
    }

    return { valid: true };
  },

  /**
   * Upload image to storage bucket.
   * Uses Supabase Storage when configured; falls back to Data URL for local dev.
   */
  async uploadImage(
    file: File,
    bucket: 'avatars' | 'services' | 'business' | 'products' = 'avatars'
  ): Promise<UploadResult> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file');
    }

    if (isSupabaseConfigured) {
      const path = bucket + '/' + Date.now() + '_' + file.name.replace(/\s+/g, '_');
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (error || !data) {
        throw new Error(error?.message || 'Failed to upload image.');
      }
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return {
        url: pubData.publicUrl,
        fileName: data.path,
        fileSize: file.size
      };
    }

    // Convert file to Data URL for local prototype
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setTimeout(() => {
          resolve({
            url: result,
            fileName: bucket + '/' + Date.now() + '_' + file.name.replace(/\s+/g, '_'),
            fileSize: file.size
          });
        }, 400);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read and process image file.'));
      };
      reader.readAsDataURL(file);
    });
  }
};
