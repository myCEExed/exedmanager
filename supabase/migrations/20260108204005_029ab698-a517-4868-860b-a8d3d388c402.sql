-- Table des tarifs de transfert (liste de prix prédéfinis)
CREATE TABLE public.tarifs_transfert (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  type_transport TEXT NOT NULL, -- 'avion', 'train', 'voiture', 'taxi', 'navette', etc.
  trajet TEXT, -- ex: 'Aéroport Casablanca - Centre-ville'
  prix NUMERIC(10,2) NOT NULL DEFAULT 0,
  devise devise NOT NULL DEFAULT 'MAD',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour optimiser les recherches
CREATE INDEX idx_tarifs_transfert_actif ON public.tarifs_transfert(actif);
CREATE INDEX idx_tarifs_transfert_type ON public.tarifs_transfert(type_transport);

-- RLS pour tarifs_transfert
ALTER TABLE public.tarifs_transfert ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestionnaires can manage tarifs_transfert"
ON public.tarifs_transfert
FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "All authenticated users can view tarifs_transfert"
ON public.tarifs_transfert
FOR SELECT
USING (true);

-- Ajouter les colonnes à la table transferts
ALTER TABLE public.transferts
ADD COLUMN IF NOT EXISTS tarif_transfert_id UUID REFERENCES public.tarifs_transfert(id),
ADD COLUMN IF NOT EXISTS classe_id UUID REFERENCES public.classes(id),
ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id),
ADD COLUMN IF NOT EXISTS cout_affecte BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cout_par_enseignant NUMERIC(10,2);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_transferts_tarif ON public.transferts(tarif_transfert_id);
CREATE INDEX IF NOT EXISTS idx_transferts_classe ON public.transferts(classe_id);
CREATE INDEX IF NOT EXISTS idx_transferts_programme ON public.transferts(programme_id);
CREATE INDEX IF NOT EXISTS idx_transferts_date ON public.transferts(date_depart);

-- Table de liaison pour transferts multi-enseignants
CREATE TABLE public.transfert_beneficiaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfert_id UUID NOT NULL REFERENCES public.transferts(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id),
  programme_id UUID REFERENCES public.programmes(id),
  cout_part NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transfert_id, enseignant_id)
);

-- Index pour transfert_beneficiaires
CREATE INDEX idx_transfert_beneficiaires_transfert ON public.transfert_beneficiaires(transfert_id);
CREATE INDEX idx_transfert_beneficiaires_enseignant ON public.transfert_beneficiaires(enseignant_id);
CREATE INDEX idx_transfert_beneficiaires_classe ON public.transfert_beneficiaires(classe_id);

-- RLS pour transfert_beneficiaires
ALTER TABLE public.transfert_beneficiaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestionnaires can manage transfert_beneficiaires"
ON public.transfert_beneficiaires
FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "All authenticated users can view transfert_beneficiaires"
ON public.transfert_beneficiaires
FOR SELECT
USING (true);

-- Fonction pour trouver la classe correspondante à un enseignant dans une fenêtre de ±7 jours
CREATE OR REPLACE FUNCTION public.find_matching_classe_for_transfer(
  p_enseignant_id UUID,
  p_date_transfert TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  classe_id UUID,
  programme_id UUID,
  module_id UUID,
  date_debut TIMESTAMP WITH TIME ZONE,
  date_fin TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (m.classe_id)
    m.classe_id,
    c.programme_id,
    m.id as module_id,
    m.date_debut,
    m.date_fin
  FROM modules m
  INNER JOIN affectations a ON a.module_id = m.id
  INNER JOIN classes c ON c.id = m.classe_id
  WHERE a.enseignant_id = p_enseignant_id
    AND m.classe_id IS NOT NULL
    AND (
      -- Le module chevauche la date du transfert ±7 jours
      (m.date_debut IS NOT NULL AND m.date_fin IS NOT NULL AND 
       m.date_debut <= (p_date_transfert + INTERVAL '7 days') AND
       m.date_fin >= (p_date_transfert - INTERVAL '7 days'))
      OR
      -- Ou la date de début est dans la fenêtre
      (m.date_debut IS NOT NULL AND 
       m.date_debut BETWEEN (p_date_transfert - INTERVAL '7 days') AND (p_date_transfert + INTERVAL '7 days'))
    )
  ORDER BY m.classe_id, 
    ABS(EXTRACT(EPOCH FROM (m.date_debut - p_date_transfert)))
  LIMIT 1;
END;
$$;

-- Ajouter 'Transfert' dans les catégories de budget_items si pas déjà présent
-- (Les catégories sont en texte libre, donc pas de contrainte à modifier)