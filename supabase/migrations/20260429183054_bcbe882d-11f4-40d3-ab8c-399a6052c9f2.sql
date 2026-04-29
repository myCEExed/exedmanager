
-- ===== STAGIAIRES : restreindre INSERT/UPDATE/DELETE à la propre photo =====
DROP POLICY IF EXISTS "Stagiaires can upload their own photo" ON storage.objects;
DROP POLICY IF EXISTS "Stagiaires can update their own photo" ON storage.objects;
DROP POLICY IF EXISTS "Stagiaires can delete their own photo" ON storage.objects;

CREATE POLICY "Stagiaires can upload only their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stagiaire-photos'
  AND public.has_role(auth.uid(), 'stagiaire'::app_role)
  AND public.is_my_stagiaire(auth.uid(), public.photo_entity_id(name))
);

CREATE POLICY "Stagiaires can update only their own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos'
  AND public.has_role(auth.uid(), 'stagiaire'::app_role)
  AND public.is_my_stagiaire(auth.uid(), public.photo_entity_id(name))
)
WITH CHECK (
  bucket_id = 'stagiaire-photos'
  AND public.has_role(auth.uid(), 'stagiaire'::app_role)
  AND public.is_my_stagiaire(auth.uid(), public.photo_entity_id(name))
);

CREATE POLICY "Stagiaires can delete only their own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stagiaire-photos'
  AND public.has_role(auth.uid(), 'stagiaire'::app_role)
  AND public.is_my_stagiaire(auth.uid(), public.photo_entity_id(name))
);

-- ===== ENSEIGNANTS : même restriction =====
DROP POLICY IF EXISTS "Enseignants can upload their own photo" ON storage.objects;
DROP POLICY IF EXISTS "Enseignants can update their own photo" ON storage.objects;
DROP POLICY IF EXISTS "Enseignants can delete their own photo" ON storage.objects;

CREATE POLICY "Enseignants can upload only their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enseignant-photos'
  AND public.has_role(auth.uid(), 'enseignant'::app_role)
  AND public.is_my_enseignant(auth.uid(), public.photo_entity_id(name))
);

CREATE POLICY "Enseignants can update only their own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'enseignant-photos'
  AND public.has_role(auth.uid(), 'enseignant'::app_role)
  AND public.is_my_enseignant(auth.uid(), public.photo_entity_id(name))
)
WITH CHECK (
  bucket_id = 'enseignant-photos'
  AND public.has_role(auth.uid(), 'enseignant'::app_role)
  AND public.is_my_enseignant(auth.uid(), public.photo_entity_id(name))
);

CREATE POLICY "Enseignants can delete only their own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'enseignant-photos'
  AND public.has_role(auth.uid(), 'enseignant'::app_role)
  AND public.is_my_enseignant(auth.uid(), public.photo_entity_id(name))
);
