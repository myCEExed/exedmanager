-- Autoriser les chauffeurs à lire les enseignants uniquement lorsqu'ils sont liés à un transfert qui leur est assigné
CREATE POLICY "Chauffeurs can view enseignants for their transferts"
ON public.enseignants
FOR SELECT
USING (
  has_role(auth.uid(), 'chauffeur'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.transferts t
    JOIN public.chauffeurs c ON c.id = t.chauffeur_id
    WHERE t.enseignant_id = enseignants.id
      AND c.user_id = auth.uid()
  )
);