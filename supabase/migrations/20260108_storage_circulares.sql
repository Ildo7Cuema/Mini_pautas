-- Create storage bucket for circulars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('circulares', 'circulares', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload circular attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'circulares' );

-- Policy to allow public to view files (since they are official communications)
CREATE POLICY "Public can view circular attachments"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'circulares' );

-- Policy to allow users to delete their own uploads (optional, but good practice)
CREATE POLICY "Users can update their own circular attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'circulares' AND owner = auth.uid() );

CREATE POLICY "Users can delete their own circular attachments"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'circulares' AND owner = auth.uid() );
