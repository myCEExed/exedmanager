-- Créer une table pour les budgets avec charges et produits
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'produit')),
  categorie TEXT NOT NULL,
  description TEXT,
  montant_prevu NUMERIC(10,2) NOT NULL DEFAULT 0,
  montant_realise NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT budget_scope_check CHECK (
    (programme_id IS NOT NULL AND classe_id IS NULL) OR
    (programme_id IS NULL AND classe_id IS NOT NULL) OR
    (programme_id IS NULL AND classe_id IS NULL)
  )
);

-- Index pour améliorer les performances
CREATE INDEX idx_budget_items_programme ON public.budget_items(programme_id);
CREATE INDEX idx_budget_items_classe ON public.budget_items(classe_id);
CREATE INDEX idx_budget_items_type ON public.budget_items(type);

-- Trigger pour updated_at
CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour budget_items
-- Administrateurs : lecture et modification
CREATE POLICY "Admins can manage budget items"
  ON public.budget_items
  FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Financiers : lecture seule
CREATE POLICY "Financiers can view budget items"
  ON public.budget_items
  FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- Gestionnaires scolarité : lecture seule
CREATE POLICY "Gestionnaires can view budget items"
  ON public.budget_items
  FOR SELECT
  USING (has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

-- Créer une vue pour les KPIs financiers globaux
CREATE OR REPLACE VIEW public.kpis_financiers_globaux AS
SELECT
  COALESCE(SUM(CASE WHEN type = 'charge' THEN montant_prevu ELSE 0 END), 0) as charges_prevues,
  COALESCE(SUM(CASE WHEN type = 'charge' THEN montant_realise ELSE 0 END), 0) as charges_realisees,
  COALESCE(SUM(CASE WHEN type = 'produit' THEN montant_prevu ELSE 0 END), 0) as produits_prevus,
  COALESCE(SUM(CASE WHEN type = 'produit' THEN montant_realise ELSE 0 END), 0) as produits_realises,
  COALESCE(SUM(CASE WHEN type = 'produit' THEN montant_prevu ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN type = 'charge' THEN montant_prevu ELSE 0 END), 0) as marge_prevue,
  COALESCE(SUM(CASE WHEN type = 'produit' THEN montant_realise ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN type = 'charge' THEN montant_realise ELSE 0 END), 0) as marge_realisee
FROM public.budget_items
WHERE programme_id IS NULL AND classe_id IS NULL;

-- Créer une vue pour les KPIs par programme
CREATE OR REPLACE VIEW public.kpis_financiers_programme AS
SELECT
  p.id as programme_id,
  p.code as programme_code,
  p.titre as programme_titre,
  COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_prevu ELSE 0 END), 0) as charges_prevues,
  COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_realise ELSE 0 END), 0) as charges_realisees,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_prevu ELSE 0 END), 0) as produits_prevus,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_realise ELSE 0 END), 0) as produits_realises,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_prevu ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_prevu ELSE 0 END), 0) as marge_prevue,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_realise ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_realise ELSE 0 END), 0) as marge_realisee
FROM public.programmes p
LEFT JOIN public.budget_items bi ON bi.programme_id = p.id
GROUP BY p.id, p.code, p.titre;

-- Créer une vue pour les KPIs par classe
CREATE OR REPLACE VIEW public.kpis_financiers_classe AS
SELECT
  c.id as classe_id,
  c.nom as classe_nom,
  c.sous_code as classe_code,
  p.id as programme_id,
  p.titre as programme_titre,
  COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_prevu ELSE 0 END), 0) as charges_prevues,
  COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_realise ELSE 0 END), 0) as charges_realisees,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_prevu ELSE 0 END), 0) as produits_prevus,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_realise ELSE 0 END), 0) as produits_realises,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_prevu ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_prevu ELSE 0 END), 0) as marge_prevue,
  COALESCE(SUM(CASE WHEN bi.type = 'produit' THEN bi.montant_realise ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN bi.type = 'charge' THEN bi.montant_realise ELSE 0 END), 0) as marge_realisee
FROM public.classes c
JOIN public.programmes p ON p.id = c.programme_id
LEFT JOIN public.budget_items bi ON bi.classe_id = c.id
GROUP BY c.id, c.nom, c.sous_code, p.id, p.titre;