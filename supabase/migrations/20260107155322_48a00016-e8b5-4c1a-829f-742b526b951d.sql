
-- 1. Créer une fonction SECURITY DEFINER pour vérifier si un utilisateur participe à une discussion
CREATE OR REPLACE FUNCTION public.is_discussion_participant(_user_id uuid, _discussion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discussion_participants
    WHERE user_id = _user_id
      AND discussion_id = _discussion_id
  )
$$;

-- 2. Supprimer l'ancienne politique qui cause la récursion
DROP POLICY IF EXISTS "Participants peuvent voir les participants" ON public.discussion_participants;

-- 3. Créer la nouvelle politique sans récursion
CREATE POLICY "Participants peuvent voir les participants"
ON public.discussion_participants
FOR SELECT
USING (public.is_discussion_participant(auth.uid(), discussion_id));
