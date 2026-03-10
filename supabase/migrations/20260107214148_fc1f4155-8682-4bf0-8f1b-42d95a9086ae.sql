-- Supprimer l'ancienne politique pour les stagiaires
DROP POLICY IF EXISTS "Stagiaires peuvent voir leurs factures" ON public.factures;

-- Créer une nouvelle politique pour les stagiaires qui vérifie:
-- 1. Le stagiaire est bien le destinataire de la facture (stagiaire_id)
-- 2. Le programme est de type INTER
CREATE POLICY "Stagiaires peuvent voir leurs factures INTER uniquement"
ON public.factures
FOR SELECT
USING (
  -- Vérifier que la facture est bien adressée au stagiaire (pas à un tiers payant)
  stagiaire_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM stagiaires s
    JOIN inscriptions i ON i.stagiaire_id = s.id
    JOIN classes c ON c.id = i.classe_id
    JOIN programmes p ON p.id = c.programme_id
    WHERE s.id = factures.stagiaire_id
      AND s.user_id = auth.uid()
      AND factures.classe_id = c.id
      AND p.type = 'INTER'
  )
);