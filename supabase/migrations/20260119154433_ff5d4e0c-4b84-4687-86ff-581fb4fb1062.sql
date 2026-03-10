-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Gestionnaires peuvent gérer les QR codes" ON public.qr_codes_assiduite;

-- Créer une nouvelle politique incluant le rôle proprietaire
CREATE POLICY "Gestionnaires peuvent gérer les QR codes" 
ON public.qr_codes_assiduite 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'responsable_scolarite'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) OR
  has_role(auth.uid(), 'proprietaire'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'responsable_scolarite'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) OR
  has_role(auth.uid(), 'proprietaire'::app_role)
);