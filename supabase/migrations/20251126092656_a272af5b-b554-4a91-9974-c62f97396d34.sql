-- Add photo_url column to stagiaires table
ALTER TABLE stagiaires ADD COLUMN photo_url TEXT;

-- Create storage bucket for stagiaire photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stagiaire-photos',
  'stagiaire-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS policies for stagiaire-photos bucket
CREATE POLICY "Admins and gestionnaires can upload stagiaire photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stagiaire-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Admins and gestionnaires can update stagiaire photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Admins and gestionnaires can delete stagiaire photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Everyone can view stagiaire photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'stagiaire-photos');