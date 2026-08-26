import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slipradar.wallacecloud.online';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NzMxODMyLCJleHAiOjE5NDU0MTE4MzJ9.1hdl-Y_PDMuAfAijUMcugBqUPTlp0CyPstpl0gDGmPw';

// Singleton Supabase Client with Realtime Websockets enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

// Helper to get public CDN URL for images / assets from Supabase Storage
export function getSupabaseAssetUrl(folder: string, filename: string, bucket = 'sports-assets'): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(`${folder}/${filename}`);
  return data.publicUrl;
}

// Upload helper to Supabase Storage
export async function uploadToSupabaseStorage(
  file: File | Blob,
  path: string,
  bucket = 'sports-assets'
) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (error) {
    console.warn('Supabase storage upload error:', error);
    return null;
  }
  return data;
}
