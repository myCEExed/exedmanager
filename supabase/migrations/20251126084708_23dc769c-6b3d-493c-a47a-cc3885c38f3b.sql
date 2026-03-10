-- Create prospects table
CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brevo_contact_id TEXT UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT NOT NULL,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  entreprise TEXT,
  poste TEXT,
  secteur_activite TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  pays TEXT DEFAULT 'France',
  source TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devis table (quotations)
CREATE TABLE IF NOT EXISTS public.devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_devis TEXT NOT NULL UNIQUE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id),
  programme_id UUID REFERENCES public.programmes(id),
  montant_total NUMERIC NOT NULL DEFAULT 0,
  montant_ht NUMERIC NOT NULL DEFAULT 0,
  tva NUMERIC NOT NULL DEFAULT 20,
  date_emission DATE NOT NULL,
  date_validite DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  description TEXT,
  conditions TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lignes_devis table (quotation lines)
CREATE TABLE IF NOT EXISTS public.lignes_devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite NUMERIC NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC NOT NULL,
  montant_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bons_commande table (purchase orders)
CREATE TABLE IF NOT EXISTS public.bons_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_bc TEXT NOT NULL UNIQUE,
  devis_id UUID REFERENCES public.devis(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  programme_id UUID REFERENCES public.programmes(id),
  montant_total NUMERIC NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_emission DATE NOT NULL,
  date_livraison_prevue DATE,
  conditions TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lignes_devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bons_commande ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prospects
CREATE POLICY "Admins and gestionnaires can manage prospects"
  ON public.prospects FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

-- RLS Policies for devis
CREATE POLICY "Admins and gestionnaires can manage devis"
  ON public.devis FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view devis"
  ON public.devis FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- RLS Policies for lignes_devis
CREATE POLICY "Admins and gestionnaires can manage lignes_devis"
  ON public.lignes_devis FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view lignes_devis"
  ON public.lignes_devis FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- RLS Policies for bons_commande
CREATE POLICY "Admins and gestionnaires can manage bons_commande"
  ON public.bons_commande FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view bons_commande"
  ON public.bons_commande FOR SELECT
  USING (has_role(auth.uid(), 'financier'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_devis_updated_at
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bons_commande_updated_at
  BEFORE UPDATE ON public.bons_commande
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();