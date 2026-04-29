-- Remove SELECT policy that exposes invitation tokens to chauffeurs.
-- Tokens must only be validated via the invitation link (AcceptInvitation flow uses
-- a token-based lookup, not RLS-based SELECT). Admin/gestionnaire roles keep full
-- access through the existing "Admins and gestionnaires can manage invitations" policy.
DROP POLICY IF EXISTS "Chauffeurs can view their invitations" ON public.invitations;