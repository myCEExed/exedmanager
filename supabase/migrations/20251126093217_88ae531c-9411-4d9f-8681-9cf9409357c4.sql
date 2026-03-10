-- Add photo_url column to enseignants table
ALTER TABLE enseignants ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for enseignant photos if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'enseignant-photos',
  'enseignant-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for enseignant-photos bucket
CREATE POLICY "Admins and gestionnaires can upload enseignant photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enseignant-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Enseignants can upload their own photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enseignant-photos' AND
  has_role(auth.uid(), 'enseignant'::app_role)
);

CREATE POLICY "Admins and gestionnaires can update enseignant photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'enseignant-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Enseignants can update their own photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'enseignant-photos' AND
  has_role(auth.uid(), 'enseignant'::app_role)
);

CREATE POLICY "Admins and gestionnaires can delete enseignant photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'enseignant-photos' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);

CREATE POLICY "Enseignants can delete their own photo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'enseignant-photos' AND
  has_role(auth.uid(), 'enseignant'::app_role)
);

CREATE POLICY "Everyone can view enseignant photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'enseignant-photos');

-- Update RLS policies for stagiaire-photos to allow stagiaires to upload their own photo
CREATE POLICY "Stagiaires can upload their own photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stagiaire-photos' AND
  has_role(auth.uid(), 'stagiaire'::app_role)
);

CREATE POLICY "Stagiaires can update their own photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos' AND
  has_role(auth.uid(), 'stagiaire'::app_role)
);

CREATE POLICY "Stagiaires can delete their own photo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos' AND
  has_role(auth.uid(), 'stagiaire'::app_role)
);

-- Allow stagiaires to update their own photo_url
CREATE POLICY "Stagiaires can update their own photo_url"
ON stagiaires
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow enseignants to update their own photo_url
CREATE POLICY "Enseignants can update their own photo_url"
ON enseignants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);