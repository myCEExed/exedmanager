
-- Helper: stagiaire inscrit dans une classe d'un programme
CREATE OR REPLACE FUNCTION public.stagiaire_in_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stagiaires s
    JOIN inscriptions i ON i.stagiaire_id = s.id
    JOIN classes c ON c.id = i.classe_id
    WHERE s.user_id = _user_id
      AND c.programme_id = _programme_id
  )
$$;

CREATE OR REPLACE FUNCTION public.stagiaire_in_classe(_user_id uuid, _classe_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stagiaires s
    JOIN inscriptions i ON i.stagiaire_id = s.id
    WHERE s.user_id = _user_id AND i.classe_id = _classe_id
  )
$$;

-- Helper: enseignant affecté à un module d'un programme
CREATE OR REPLACE FUNCTION public.enseignant_in_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enseignants e
    JOIN affectations a ON a.enseignant_id = e.id
    JOIN modules m ON m.id = a.module_id
    JOIN classes c ON c.id = m.classe_id
    WHERE e.user_id = _user_id
      AND c.programme_id = _programme_id
  )
$$;

CREATE OR REPLACE FUNCTION public.enseignant_in_classe(_user_id uuid, _classe_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enseignants e
    JOIN affectations a ON a.enseignant_id = e.id
    JOIN modules m ON m.id = a.module_id
    WHERE e.user_id = _user_id AND m.classe_id = _classe_id
  )
$$;

CREATE OR REPLACE FUNCTION public.enseignant_assigned_to_module(_user_id uuid, _module_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enseignants e
    JOIN affectations a ON a.enseignant_id = e.id
    WHERE e.user_id = _user_id AND a.module_id = _module_id
  )
$$;

-- ============ PROGRAMMES ============
DROP POLICY IF EXISTS "All users can view programmes" ON public.programmes;
DROP POLICY IF EXISTS "Admins can delete programmes" ON public.programmes;

CREATE POLICY "Restricted view of programmes"
ON public.programmes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  OR is_gestionnaire_for_programme(auth.uid(), id)
  OR stagiaire_in_programme(auth.uid(), id)
  OR enseignant_in_programme(auth.uid(), id)
);

CREATE POLICY "Admins can delete programmes (authenticated)"
ON public.programmes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role));

-- ============ CLASSES ============
DROP POLICY IF EXISTS "All users can view classes" ON public.classes;

CREATE POLICY "Restricted view of classes"
ON public.classes FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  OR is_gestionnaire_for_programme(auth.uid(), programme_id)
  OR stagiaire_in_classe(auth.uid(), id)
  OR enseignant_in_classe(auth.uid(), id)
);

-- ============ MODULES ============
DROP POLICY IF EXISTS "All authenticated users can view modules" ON public.modules;

CREATE POLICY "Restricted view of modules"
ON public.modules FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  OR stagiaire_in_classe(auth.uid(), classe_id)
  OR enseignant_in_classe(auth.uid(), classe_id)
  OR enseignant_assigned_to_module(auth.uid(), id)
);

-- ============ PROGRAMME_MODULES ============
DROP POLICY IF EXISTS "All authenticated users can view programme_modules" ON public.programme_modules;

CREATE POLICY "Restricted view of programme_modules"
ON public.programme_modules FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  OR is_gestionnaire_for_programme(auth.uid(), programme_id)
  OR stagiaire_in_programme(auth.uid(), programme_id)
  OR enseignant_in_programme(auth.uid(), programme_id)
);
