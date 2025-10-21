// Image upload and optimization utilities for Supabase Storage
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Image optimization settings
const OPTIMIZATION_CONFIGS = {
  thumbnail: { width: 200, height: 200, quality: 70 },
  card: { width: 400, height: 300, quality: 80 },
  detail: { width: 800, height: 600, quality: 85 },
  original: { width: 1200, height: 900, quality: 90 },
};

interface UploadResult {
  url: string;
  publicUrl: string;
  path: string;
  thumbnailUrl?: string;
}

/**
 * Compress and resize image on client side before upload
 */
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, or WebP image',
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Upload menu item image to Supabase Storage
 * Creates optimized versions for different use cases
 */
export async function uploadMenuItemImage(
  file: File,
  itemId?: string
): Promise<UploadResult> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const supabase = createClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const fileExt = file.name.split('.').pop();
  const fileName = `${itemId || 'temp'}_${timestamp}_${randomId}.${fileExt}`;
  
  try {
    // Compress image for optimized upload
    console.log('📸 Compressing image...');
    const compressedBlob = await compressImage(
      file,
      OPTIMIZATION_CONFIGS.original.width,
      OPTIMIZATION_CONFIGS.original.height,
      OPTIMIZATION_CONFIGS.original.quality / 100
    );
    
    console.log('📤 Uploading to Supabase Storage...');
    console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB`);
    console.log(`Compressed size: ${(compressedBlob.size / 1024).toFixed(2)}KB`);
    console.log(`Savings: ${(((file.size - compressedBlob.size) / file.size) * 100).toFixed(1)}%`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('menu-items')
      .upload(`images/${fileName}`, compressedBlob, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menu-items')
      .getPublicUrl(`images/${fileName}`);
    
    console.log('✅ Image uploaded successfully!');
    
    return {
      url: urlData.publicUrl,
      publicUrl: urlData.publicUrl,
      path: data.path,
    };
    
  } catch (error) {
    console.error('❌ Image upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteMenuItemImage(imagePath: string): Promise<void> {
  const supabase = createClient();
  
  // Extract path from full URL if needed
  const path = imagePath.includes('menu-items/')
    ? imagePath.split('menu-items/')[1]
    : imagePath;
  
  const { error } = await supabase.storage
    .from('menu-items')
    .remove([`images/${path}`]);
  
  if (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Get optimized image URL with transformations (Supabase CDN)
 * Note: This requires Supabase Pro plan for image transformations
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  config: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg';
  } = {}
): string {
  // For now, return base URL
  // With Supabase Pro, you can add transformations like:
  // return `${baseUrl}?width=${config.width}&quality=${config.quality}&format=${config.format}`;
  return baseUrl;
}
