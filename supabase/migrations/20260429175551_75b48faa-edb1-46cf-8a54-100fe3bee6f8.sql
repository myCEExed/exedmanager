-- Fix 1: Restrict "Chauffeurs can view their invitations" to authenticated users only
DROP POLICY IF EXISTS "Chauffeurs can view their invitations" ON public.invitations;

CREATE POLICY "Chauffeurs can view their invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  chauffeur_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.chauffeurs c
    WHERE c.id = invitations.chauffeur_id
      AND c.user_id = auth.uid()
  )
);

-- Fix 2: Replace overly permissive SELECT on enquetes_reponses_details
DROP POLICY IF EXISTS "Users can view enquetes_reponses_details" ON public.enquetes_reponses_details;

CREATE POLICY "Staff and owning stagiaire can view response details"
ON public.enquetes_reponses_details
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role)
  OR has_role(auth.uid(), 'proprietaire'::app_role)
  OR has_role(auth.uid(), 'responsable_scolarite'::app_role)
  OR has_role(auth.uid(), 'direction_financiere'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.enquetes_reponses er
    JOIN public.stagiaires s ON s.id = er.stagiaire_id
    WHERE er.id = enquetes_reponses_details.reponse_id
      AND s.user_id = auth.uid()
  )
);