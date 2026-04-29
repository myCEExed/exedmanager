
-- Helper: extract entity uuid from photo filename "<uuid>_<timestamp>.<ext>"
CREATE OR REPLACE FUNCTION public.photo_entity_id(_name text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(split_part(split_part(_name, '/', -1), '_', 1), '')::uuid
$$;

-- Helper: do two stagiaires share a class?
CREATE OR REPLACE FUNCTION public.stagiaires_share_classe(_user_id uuid, _other_stagiaire_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stagiaires s
    JOIN inscriptions i1 ON i1.stagiaire_id = s.id
    JOIN inscriptions i2 ON i2.classe_id = i1.classe_id
    WHERE s.user_id = _user_id
      AND i2.stagiaire_id = _other_stagiaire_id
  )
$$;

-- Helper: does the auth user (stagiaire) share a classe with this enseignant?
CREATE OR REPLACE FUNCTION public.stagiaire_shares_classe_with_enseignant(_user_id uuid, _enseignant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stagiaires s
    JOIN inscriptions i ON i.stagiaire_id = s.id
    JOIN modules m ON m.classe_id = i.classe_id
    JOIN affectations a ON a.module_id = m.id
    WHERE s.user_id = _user_id
      AND a.enseignant_id = _enseignant_id
  )
$$;

-- Helper: does the auth user (enseignant) share a classe with this stagiaire?
CREATE OR REPLACE FUNCTION public.enseignant_shares_classe_with_stagiaire(_user_id uuid, _stagiaire_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enseignants e
    JOIN affectations a ON a.enseignant_id = e.id
    JOIN modules m ON m.id = a.module_id
    JOIN inscriptions i ON i.classe_id = m.classe_id
    WHERE e.user_id = _user_id
      AND i.stagiaire_id = _stagiaire_id
  )
$$;

-- Helper: do two enseignants share a classe (teach in modules of same classe)?
CREATE OR REPLACE FUNCTION public.enseignants_share_classe(_user_id uuid, _other_enseignant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enseignants e1
    JOIN affectations a1 ON a1.enseignant_id = e1.id
    JOIN modules m1 ON m1.id = a1.module_id
    JOIN modules m2 ON m2.classe_id = m1.classe_id
    JOIN affectations a2 ON a2.module_id = m2.id
    WHERE e1.user_id = _user_id
      AND a2.enseignant_id = _other_enseignant_id
  )
$$;

-- Helper: is this stagiaire row owned by the auth user?
CREATE OR REPLACE FUNCTION public.is_my_stagiaire(_user_id uuid, _stagiaire_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM stagiaires WHERE id = _stagiaire_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_my_enseignant(_user_id uuid, _enseignant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM enseignants WHERE id = _enseignant_id AND user_id = _user_id)
$$;

-- ============ Drop permissive SELECT policies ============
DROP POLICY IF EXISTS "Authenticated read enseignant-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read stagiaire-photos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view enseignant photos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view stagiaire photos" ON storage.objects;

-- ============ stagiaire-photos: restricted SELECT ============
CREATE POLICY "Restricted view of stagiaire photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'stagiaire-photos'
  AND (
    -- Admin staff
    public.has_role(auth.uid(), 'administrateur'::app_role)
    OR public.has_role(auth.uid(), 'proprietaire'::app_role)
    OR public.has_role(auth.uid(), 'responsable_scolarite'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
    -- Owner of the photo
    OR public.is_my_stagiaire(auth.uid(), public.photo_entity_id(name))
    -- Another stagiaire sharing a class
    OR (
      public.has_role(auth.uid(), 'stagiaire'::app_role)
      AND public.stagiaires_share_classe(auth.uid(), public.photo_entity_id(name))
    )
    -- Enseignant teaching in a class where this stagiaire is enrolled
    OR (
      public.has_role(auth.uid(), 'enseignant'::app_role)
      AND public.enseignant_shares_classe_with_stagiaire(auth.uid(), public.photo_entity_id(name))
    )
  )
);

-- ============ enseignant-photos: restricted SELECT ============
CREATE POLICY "Restricted view of enseignant photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'enseignant-photos'
  AND (
    -- Admin staff
    public.has_role(auth.uid(), 'administrateur'::app_role)
    OR public.has_role(auth.uid(), 'proprietaire'::app_role)
    OR public.has_role(auth.uid(), 'responsable_scolarite'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
    -- Owner of the photo
    OR public.is_my_enseignant(auth.uid(), public.photo_entity_id(name))
    -- Stagiaire sharing a class with this enseignant
    OR (
      public.has_role(auth.uid(), 'stagiaire'::app_role)
      AND public.stagiaire_shares_classe_with_enseignant(auth.uid(), public.photo_entity_id(name))
    )
    -- Another enseignant teaching in the same classe
    OR (
      public.has_role(auth.uid(), 'enseignant'::app_role)
      AND public.enseignants_share_classe(auth.uid(), public.photo_entity_id(name))
    )
  )
);
