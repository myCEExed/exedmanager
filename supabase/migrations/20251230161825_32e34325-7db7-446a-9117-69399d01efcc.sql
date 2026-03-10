-- Add new columns to prospects table for interest level and commercial tracking
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS niveau_interet TEXT DEFAULT 'non_defini',
ADD COLUMN IF NOT EXISTS is_down BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS down_raison TEXT,
ADD COLUMN IF NOT EXISTS down_date TIMESTAMP WITH TIME ZONE;

-- Create prospect_commentaires table for tracking comments throughout lifecycle
CREATE TABLE public.prospect_commentaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  cible_formation TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prospect_actions table for commercial actions tracking
CREATE TABLE public.prospect_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  type_action TEXT NOT NULL,
  date_action TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsable TEXT,
  commentaire TEXT,
  resultat TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.prospect_commentaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prospect_commentaires
CREATE POLICY "Admins and gestionnaires can manage prospect_commentaires"
ON public.prospect_commentaires
FOR ALL
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

-- Create RLS policies for prospect_actions
CREATE POLICY "Admins and gestionnaires can manage prospect_actions"
ON public.prospect_actions
FOR ALL
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_commentaires_prospect_id ON public.prospect_commentaires(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_actions_prospect_id ON public.prospect_actions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_actions_date ON public.prospect_actions(date_action);
CREATE INDEX IF NOT EXISTS idx_prospects_niveau_interet ON public.prospects(niveau_interet);
CREATE INDEX IF NOT EXISTS idx_prospects_is_down ON public.prospects(is_down);