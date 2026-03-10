-- Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table pour stocker les modèles de contrats
CREATE TABLE public.modeles_contrat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(200) NOT NULL,
  description TEXT,
  type_contrat VARCHAR(50) NOT NULL CHECK (type_contrat IN ('vacation', 'prestation_service')),
  template_url TEXT,
  champs_variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table pour lier les contrats aux programmes et modules
CREATE TABLE public.contrats_lignes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrat_id UUID NOT NULL REFERENCES public.contrats_intervention(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id),
  module_ids UUID[] DEFAULT '{}',
  designation TEXT NOT NULL,
  unite VARCHAR(20) NOT NULL CHECK (unite IN ('heure', 'jour')),
  quantite NUMERIC(10,2) NOT NULL DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter colonnes à contrats_intervention
ALTER TABLE public.contrats_intervention
  ADD COLUMN IF NOT EXISTS modele_contrat_id UUID REFERENCES public.modeles_contrat(id),
  ADD COLUMN IF NOT EXISTS programme_id UUID REFERENCES public.programmes(id),
  ADD COLUMN IF NOT EXISTS objet TEXT,
  ADD COLUMN IF NOT EXISTS unite VARCHAR(20) CHECK (unite IN ('heure', 'jour')),
  ADD COLUMN IF NOT EXISTS quantite NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC(12,2);

-- Enable RLS
ALTER TABLE public.modeles_contrat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrats_lignes ENABLE ROW LEVEL SECURITY;

-- Policies pour modeles_contrat
CREATE POLICY "Authenticated users can view contract templates"
  ON public.modeles_contrat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can manage contract templates"
  ON public.modeles_contrat FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour contrats_lignes
CREATE POLICY "Authenticated users can view contract lines"
  ON public.contrats_lignes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Editors can manage contract lines"
  ON public.contrats_lignes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Triggers updated_at
CREATE TRIGGER update_modeles_contrat_updated_at
  BEFORE UPDATE ON public.modeles_contrat
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contrats_lignes_updated_at
  BEFORE UPDATE ON public.contrats_lignes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();