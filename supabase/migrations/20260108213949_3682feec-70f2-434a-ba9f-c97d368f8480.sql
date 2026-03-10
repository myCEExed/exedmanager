-- Créer la table d'affectation des gestionnaires de scolarité aux programmes
CREATE TABLE IF NOT EXISTS public.programme_gestionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  gestionnaire_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(programme_id, gestionnaire_user_id)
);

-- Enable RLS
ALTER TABLE public.programme_gestionnaires ENABLE ROW LEVEL SECURITY;

-- Policy: Les administrateurs, propriétaires et responsables scolarité peuvent gérer les affectations
CREATE POLICY "Admins and responsables can manage programme gestionnaires"
ON public.programme_gestionnaires
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'proprietaire'::app_role) OR
  has_role(auth.uid(), 'responsable_scolarite'::app_role)
);

-- Policy: Les gestionnaires peuvent voir leurs propres affectations
CREATE POLICY "Gestionnaires can view their own assignments"
ON public.programme_gestionnaires
FOR SELECT
TO authenticated
USING (
  gestionnaire_user_id = auth.uid()
);

-- Fonction pour vérifier si un gestionnaire est affecté à un programme
CREATE OR REPLACE FUNCTION public.is_gestionnaire_for_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programme_gestionnaires
    WHERE gestionnaire_user_id = _user_id
      AND programme_id = _programme_id
  )
$$;

-- Fonction pour vérifier si un utilisateur peut gérer un programme 
-- (admin, proprio, resp scolarité, ou gestionnaire affecté)
CREATE OR REPLACE FUNCTION public.can_manage_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'administrateur'::app_role) OR
    has_role(_user_id, 'proprietaire'::app_role) OR
    has_role(_user_id, 'responsable_scolarite'::app_role) OR
    is_gestionnaire_for_programme(_user_id, _programme_id)
$$;