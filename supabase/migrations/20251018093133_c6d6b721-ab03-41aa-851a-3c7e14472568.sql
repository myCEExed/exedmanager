-- Create clients table for INTRA organizations
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  secteur_activite TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  pays TEXT DEFAULT 'France',
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  email TEXT,
  site_web TEXT,
  contact_principal_nom TEXT,
  contact_principal_fonction TEXT,
  contact_principal_email TEXT,
  contact_principal_telephone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add client_id to programmes table for INTRA programs
ALTER TABLE public.programmes
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_programmes_client_id ON public.programmes(client_id);

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Admins and gestionnaires can view clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

CREATE POLICY "Admins and gestionnaires can create clients"
ON public.clients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

CREATE POLICY "Admins and gestionnaires can update clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Trigger for updating updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();