-- Créer un type pour les statuts de facture
CREATE TYPE public.statut_facture AS ENUM ('brouillon', 'envoyee', 'payee', 'partielle', 'annulee');

-- Créer un type pour les modes de paiement
CREATE TYPE public.mode_paiement AS ENUM ('virement', 'cheque', 'especes', 'carte', 'autre');

-- Table des factures
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture TEXT NOT NULL UNIQUE,
  stagiaire_id UUID REFERENCES public.stagiaires(id) ON DELETE SET NULL,
  classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  montant_total DECIMAL(10,2) NOT NULL,
  montant_paye DECIMAL(10,2) DEFAULT 0,
  statut statut_facture DEFAULT 'brouillon',
  date_emission DATE NOT NULL,
  date_echeance DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des paiements
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES public.factures(id) ON DELETE CASCADE NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  mode_paiement mode_paiement NOT NULL,
  date_paiement DATE NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des relances
CREATE TABLE public.relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES public.factures(id) ON DELETE CASCADE NOT NULL,
  date_relance DATE NOT NULL,
  type_relance TEXT NOT NULL, -- 'email', 'courrier', 'telephone'
  contenu TEXT,
  envoyee_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relances ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour factures
CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les factures"
ON public.factures
FOR ALL
USING (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role));

CREATE POLICY "Stagiaires peuvent voir leurs factures"
ON public.factures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stagiaires s
    WHERE s.id = factures.stagiaire_id AND s.user_id = auth.uid()
  )
);

-- Politiques RLS pour paiements
CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les paiements"
ON public.paiements
FOR ALL
USING (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role));

CREATE POLICY "Stagiaires peuvent voir leurs paiements"
ON public.paiements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM factures f
    JOIN stagiaires s ON s.id = f.stagiaire_id
    WHERE f.id = paiements.facture_id AND s.user_id = auth.uid()
  )
);

-- Politiques RLS pour relances
CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les relances"
ON public.relances
FOR ALL
USING (has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'proprietaire'::app_role));

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_factures_updated_at
BEFORE UPDATE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Fonction pour calculer le montant payé et mettre à jour le statut
CREATE OR REPLACE FUNCTION public.update_facture_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paye DECIMAL(10,2);
  montant_facture DECIMAL(10,2);
BEGIN
  -- Calculer le total payé pour cette facture
  SELECT COALESCE(SUM(montant), 0) INTO total_paye
  FROM paiements
  WHERE facture_id = NEW.facture_id;

  -- Récupérer le montant total de la facture
  SELECT montant_total INTO montant_facture
  FROM factures
  WHERE id = NEW.facture_id;

  -- Mettre à jour le montant payé et le statut
  UPDATE factures
  SET 
    montant_paye = total_paye,
    statut = CASE
      WHEN total_paye = 0 THEN 'envoyee'::statut_facture
      WHEN total_paye < montant_facture THEN 'partielle'::statut_facture
      WHEN total_paye >= montant_facture THEN 'payee'::statut_facture
    END
  WHERE id = NEW.facture_id;

  RETURN NEW;
END;
$$;

-- Trigger pour mettre à jour automatiquement le statut de la facture
CREATE TRIGGER update_facture_after_paiement
AFTER INSERT OR UPDATE OR DELETE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.update_facture_statut();

-- Index pour améliorer les performances
CREATE INDEX idx_factures_stagiaire ON factures(stagiaire_id);
CREATE INDEX idx_factures_classe ON factures(classe_id);
CREATE INDEX idx_factures_statut ON factures(statut);
CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_relances_facture ON relances(facture_id);