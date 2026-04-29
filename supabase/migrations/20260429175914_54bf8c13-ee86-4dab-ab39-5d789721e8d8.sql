-- Make photo buckets private; signed URLs will be used at render time
UPDATE storage.buckets
SET public = false
WHERE id IN ('stagiaire-photos', 'enseignant-photos');

-- Ensure authenticated users can read objects in these buckets via signed URLs
-- (createSignedUrl still needs SELECT on storage.objects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated read stagiaire-photos'
  ) THEN
    CREATE POLICY "Authenticated read stagiaire-photos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'stagiaire-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated read enseignant-photos'
  ) THEN
    CREATE POLICY "Authenticated read enseignant-photos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'enseignant-photos');
  END IF;
END
$$;