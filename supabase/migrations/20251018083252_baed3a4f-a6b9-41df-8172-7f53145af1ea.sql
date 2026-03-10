-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enseignants peuvent voir les stagiaires de leurs classes" ON public.stagiaires;
DROP POLICY IF EXISTS "Enseignants peuvent voir leurs stagiaires" ON public.stagiaires;

-- Create a security definer function to check if an enseignant can see a stagiaire
CREATE OR REPLACE FUNCTION public.enseignant_can_see_stagiaire(_enseignant_user_id uuid, _stagiaire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM inscriptions i
    JOIN classes c ON c.id = i.classe_id
    JOIN modules m ON m.classe_id = c.id
    JOIN affectations a ON a.module_id = m.id
    JOIN enseignants e ON e.id = a.enseignant_id
    WHERE i.stagiaire_id = _stagiaire_id
      AND e.user_id = _enseignant_user_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Enseignants peuvent voir leurs stagiaires"
ON public.stagiaires
FOR SELECT
USING (
  has_role(auth.uid(), 'enseignant'::app_role) 
  AND public.enseignant_can_see_stagiaire(auth.uid(), id)
);