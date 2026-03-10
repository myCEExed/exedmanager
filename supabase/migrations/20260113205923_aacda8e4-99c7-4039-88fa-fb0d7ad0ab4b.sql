-- Create storage bucket for homework submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soumissions-devoirs',
  'soumissions-devoirs',
  false,
  20971520, -- 20MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Stagiaires can upload their own submissions
CREATE POLICY "Stagiaires can upload their submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'soumissions-devoirs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Stagiaires can view their own submissions
CREATE POLICY "Stagiaires can view their own submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'soumissions-devoirs' AND
  (
    -- Stagiaires can see their own files
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Admins, gestionnaires, enseignants can see all
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('administrateur', 'gestionnaire_scolarite', 'enseignant')
    )
  )
);

-- RLS policy: Stagiaires can delete their own submissions
CREATE POLICY "Stagiaires can delete their own submissions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'soumissions-devoirs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Stagiaires can update their own submissions
CREATE POLICY "Stagiaires can update their own submissions"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'soumissions-devoirs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add RLS policies for soumissions_devoirs table to allow stagiaires to insert/update their own submissions
DROP POLICY IF EXISTS "Stagiaires can insert their own submissions" ON public.soumissions_devoirs;
CREATE POLICY "Stagiaires can insert their own submissions"
ON public.soumissions_devoirs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stagiaires s
    WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Stagiaires can update their own submissions" ON public.soumissions_devoirs;
CREATE POLICY "Stagiaires can update their own submissions"
ON public.soumissions_devoirs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stagiaires s
    WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
  )
);