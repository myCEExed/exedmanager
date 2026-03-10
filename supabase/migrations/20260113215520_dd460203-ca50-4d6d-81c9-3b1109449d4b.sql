-- Supprimer la policy qui cause la récursion infinie
DROP POLICY IF EXISTS "Chauffeurs can view enseignants for their transferts" ON public.enseignants;

-- Créer une fonction SECURITY DEFINER pour vérifier si un chauffeur peut voir un enseignant
-- Cela évite la récursion car la fonction contourne RLS
CREATE OR REPLACE FUNCTION public.chauffeur_can_view_enseignant(enseignant_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.transferts t
    JOIN public.chauffeurs c ON c.id = t.chauffeur_id
    WHERE t.enseignant_id = enseignant_uuid
      AND c.user_id = auth.uid()
  );
$$;

-- Recréer la policy en utilisant la fonction
CREATE POLICY "Chauffeurs can view enseignants for their transferts"
ON public.enseignants
FOR SELECT
USING (
  has_role(auth.uid(), 'chauffeur'::app_role)
  AND public.chauffeur_can_view_enseignant(id)
);