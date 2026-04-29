-- Remove overly permissive SELECT policy on chauffeurs
DROP POLICY IF EXISTS "All authenticated users can view chauffeurs" ON public.chauffeurs;

-- Replace existing self/admin view policy with a restricted one
DROP POLICY IF EXISTS "Chauffeurs can view their own profile" ON public.chauffeurs;

CREATE POLICY "Restricted view of chauffeurs"
ON public.chauffeurs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);