import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const API_KEY = Deno.env.get('CLOUDINARY_API_KEY');
    const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      throw new Error('Cloudinary credentials not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileUrl = formData.get('file_url') as string | null;
    const folder = (formData.get('folder') as string) || 'products';
    const resourceType = (formData.get('resource_type') as string) || 'image';

    // Build Cloudinary upload form
    const uploadData = new FormData();
    
    if (file) {
      uploadData.append('file', file);
    } else if (fileUrl) {
      uploadData.append('file', fileUrl);
    } else {
      throw new Error('No file or file_url provided');
    }

    // Use unique_filename + overwrite=false for deduplication
    // Cloudinary's built-in duplicate detection via upload_preset or unique hash
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Generate signature
    const paramsToSign = `folder=${folder}&overwrite=false&timestamp=${timestamp}&unique_filename=true${API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(paramsToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    uploadData.append('folder', folder);
    uploadData.append('timestamp', timestamp);
    uploadData.append('api_key', API_KEY);
    uploadData.append('signature', signature);
    uploadData.append('overwrite', 'false');
    uploadData.append('unique_filename', 'true');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Cloudinary upload failed');
    }

    return new Response(JSON.stringify({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      existing: result.existing || false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
