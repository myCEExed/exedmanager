-- Create invoice templates table
CREATE TABLE public.modeles_facture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  en_tete_html TEXT,
  pied_page_html TEXT,
  couleur_principale TEXT DEFAULT '#3b82f6',
  afficher_logo BOOLEAN DEFAULT true,
  afficher_conditions BOOLEAN DEFAULT true,
  conditions_paiement TEXT,
  mentions_legales TEXT,
  prefixe_numero TEXT DEFAULT 'FAC',
  prochain_numero INTEGER DEFAULT 1,
  format_numero TEXT DEFAULT '{prefixe}-{annee}{mois}-{numero}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.modeles_facture ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and gestionnaires can manage modeles_facture"
ON public.modeles_facture
FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Financiers can view modeles_facture"
ON public.modeles_facture
FOR SELECT
USING (has_role(auth.uid(), 'financier'::app_role));

-- Add modele_facture_id to factures table
ALTER TABLE public.factures ADD COLUMN modele_facture_id UUID REFERENCES public.modeles_facture(id);