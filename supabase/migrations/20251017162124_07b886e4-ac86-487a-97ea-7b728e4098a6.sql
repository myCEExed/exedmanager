-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Enseignants peuvent voir leurs stagiaires" ON public.stagiaires;

-- Recreate the policy without the self-reference that causes recursion
CREATE POLICY "Enseignants peuvent voir leurs stagiaires"
ON public.stagiaires
FOR SELECT
USING (
  has_role(auth.uid(), 'enseignant'::app_role) 
  AND id IN (
    SELECT i.stagiaire_id
    FROM inscriptions i
    JOIN classes c ON c.id = i.classe_id
    JOIN modules m ON m.classe_id = c.id
    JOIN affectations a ON a.module_id = m.id
    JOIN enseignants e ON e.id = a.enseignant_id
    WHERE e.user_id = auth.uid()
  )
);