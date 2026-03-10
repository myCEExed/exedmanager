-- Create table for programme costs
CREATE TABLE public.programme_couts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  type_cout TEXT NOT NULL, -- 'enseignant', 'deplacement', 'restauration', 'hebergement', 'transfert', 'outils_pedagogiques', 'autre'
  description TEXT,
  montant NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.programme_couts ENABLE ROW LEVEL SECURITY;

-- Only admins can view programme costs
CREATE POLICY "Only admins can view programme costs"
ON public.programme_couts
FOR SELECT
USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Only admins can create programme costs
CREATE POLICY "Only admins can create programme costs"
ON public.programme_couts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrateur'::app_role));

-- Only admins can update programme costs
CREATE POLICY "Only admins can update programme costs"
ON public.programme_couts
FOR UPDATE
USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Only admins can delete programme costs
CREATE POLICY "Only admins can delete programme costs"
ON public.programme_couts
FOR DELETE
USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_programme_couts_updated_at
BEFORE UPDATE ON public.programme_couts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();