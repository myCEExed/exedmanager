-- Add user_id to chauffeurs table for portal access
ALTER TABLE public.chauffeurs 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chauffeurs_user_id ON public.chauffeurs(user_id);

-- Update invitations to support chauffeur type  
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS chauffeur_id uuid REFERENCES public.chauffeurs(id);

-- RLS policy for chauffeurs to view their own profile
DROP POLICY IF EXISTS "Chauffeurs can view their own profile" ON public.chauffeurs;
CREATE POLICY "Chauffeurs can view their own profile"
  ON public.chauffeurs FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  );

-- RLS policy for chauffeurs to view their assigned transfers
DROP POLICY IF EXISTS "Chauffeurs can view their assigned transferts" ON public.transferts;
CREATE POLICY "Chauffeurs can view their assigned transferts"
  ON public.transferts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chauffeur'::app_role) AND
    EXISTS (
      SELECT 1 FROM chauffeurs c
      WHERE c.id = transferts.chauffeur_id AND c.user_id = auth.uid()
    )
  );

-- RLS policy for chauffeurs to view their invitations
DROP POLICY IF EXISTS "Chauffeurs can view their invitations" ON public.invitations;
CREATE POLICY "Chauffeurs can view their invitations"
  ON public.invitations FOR SELECT
  USING (
    chauffeur_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM chauffeurs c 
      WHERE c.id = invitations.chauffeur_id AND c.email = invitations.email
    )
  );