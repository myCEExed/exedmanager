-- Create storage bucket for invoice logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-assets', 'invoice-assets', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload invoice assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-assets' AND auth.role() = 'authenticated');

-- Allow public read access to logos
CREATE POLICY "Public can view invoice assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-assets');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their invoice assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'invoice-assets' AND auth.role() = 'authenticated');

-- Allow users to delete their uploads
CREATE POLICY "Users can delete invoice assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoice-assets' AND auth.role() = 'authenticated');