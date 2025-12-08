-- Storage bucket setup for Mini-Pauta logos
-- Run this in Supabase SQL Editor or Dashboard

-- Create storage bucket for mini-pauta assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('mini-pauta-assets', 'mini-pauta-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for mini-pauta-assets bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mini-pauta-assets' AND (storage.foldername(name))[1] = 'logos');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mini-pauta-assets' AND (storage.foldername(name))[1] = 'logos');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mini-pauta-assets' AND (storage.foldername(name))[1] = 'logos');

-- Allow public read access to all files in the bucket
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mini-pauta-assets');
