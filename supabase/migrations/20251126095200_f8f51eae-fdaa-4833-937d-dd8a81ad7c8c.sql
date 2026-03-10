-- Create vehicules table
CREATE TABLE public.vehicules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  immatriculation TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- voiture, minibus, bus
  capacite INTEGER NOT NULL DEFAULT 4,
  statut TEXT NOT NULL DEFAULT 'disponible', -- disponible, en_maintenance, en_mission
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chauffeurs table
CREATE TABLE public.chauffeurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+212',
  email TEXT,
  disponible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT,
  ville TEXT NOT NULL,
  pays TEXT NOT NULL DEFAULT 'Maroc',
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+212',
  email TEXT,
  site_web TEXT,
  etoiles INTEGER CHECK (etoiles >= 1 AND etoiles <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transferts table
CREATE TABLE public.transferts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enseignant_id UUID NOT NULL REFERENCES public.enseignants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  date_depart TIMESTAMP WITH TIME ZONE NOT NULL,
  date_retour TIMESTAMP WITH TIME ZONE,
  ville_depart TEXT NOT NULL,
  ville_arrivee TEXT NOT NULL,
  type_transport TEXT NOT NULL, -- avion, train, voiture, taxi
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE SET NULL,
  chauffeur_id UUID REFERENCES public.chauffeurs(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  statut TEXT NOT NULL DEFAULT 'planifie', -- planifie, confirme, en_cours, termine, annule
  cout NUMERIC(10,2),
  devise devise DEFAULT 'EUR',
  cout_devise_origine NUMERIC(10,2),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicules
CREATE POLICY "Admins and gestionnaires can manage vehicules"
  ON public.vehicules FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "All authenticated users can view vehicules"
  ON public.vehicules FOR SELECT
  USING (true);

-- RLS Policies for chauffeurs
CREATE POLICY "Admins and gestionnaires can manage chauffeurs"
  ON public.chauffeurs FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "All authenticated users can view chauffeurs"
  ON public.chauffeurs FOR SELECT
  USING (true);

-- RLS Policies for hotels
CREATE POLICY "Admins and gestionnaires can manage hotels"
  ON public.hotels FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "All authenticated users can view hotels"
  ON public.hotels FOR SELECT
  USING (true);

-- RLS Policies for transferts
CREATE POLICY "Admins and gestionnaires can manage transferts"
  ON public.transferts FOR ALL
  USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

CREATE POLICY "Enseignants can view their own transferts"
  ON public.transferts FOR SELECT
  USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND
    EXISTS (
      SELECT 1 FROM enseignants e
      WHERE e.id = transferts.enseignant_id AND e.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_vehicules_updated_at
  BEFORE UPDATE ON public.vehicules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_chauffeurs_updated_at
  BEFORE UPDATE ON public.chauffeurs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_transferts_updated_at
  BEFORE UPDATE ON public.transferts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();