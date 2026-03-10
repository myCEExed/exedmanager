-- Create history tables for tracking modifications
CREATE TABLE IF NOT EXISTS public.devis_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'creation', 'modification', 'envoi', 'acceptation', 'refus'
  ancien_montant NUMERIC,
  nouveau_montant NUMERIC,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  commentaire TEXT,
  modified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bons_commande_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commande(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'creation', 'modification', 'avenant_ajout', 'avenant_reduction', 'cloture'
  ancien_montant NUMERIC,
  nouveau_montant NUMERIC,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  motif TEXT,
  commentaire TEXT,
  modified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lignes_bon_commande table
CREATE TABLE IF NOT EXISTS public.lignes_bon_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES public.bons_commande(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite NUMERIC NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC NOT NULL,
  montant_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add montant_facture and montant_restant to bons_commande
ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS montant_facture NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS montant_restant NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS est_cloture BOOLEAN DEFAULT FALSE;

-- Add bon_commande_id to factures for linking
ALTER TABLE public.factures 
ADD COLUMN IF NOT EXISTS bon_commande_id UUID REFERENCES public.bons_commande(id);

-- Enable RLS
ALTER TABLE public.devis_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commande_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_bon_commande ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devis_historique
CREATE POLICY "Admins and gestionnaires can manage devis_historique"
  ON public.devis_historique FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view devis_historique"
  ON public.devis_historique FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- RLS Policies for bons_commande_historique
CREATE POLICY "Admins and gestionnaires can manage bons_commande_historique"
  ON public.bons_commande_historique FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view bons_commande_historique"
  ON public.bons_commande_historique FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- RLS Policies for lignes_bon_commande
CREATE POLICY "Admins and gestionnaires can manage lignes_bon_commande"
  ON public.lignes_bon_commande FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view lignes_bon_commande"
  ON public.lignes_bon_commande FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- Add trigger for updated_at on lignes_bon_commande
CREATE TRIGGER update_lignes_bon_commande_updated_at
  BEFORE UPDATE ON public.lignes_bon_commande
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();