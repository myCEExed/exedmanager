-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Stagiaires can view their own submissions" ON storage.objects;

-- Create comprehensive SELECT policy for soumissions-devoirs bucket
CREATE POLICY "Access submissions files" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'soumissions-devoirs' AND (
    -- Le stagiaire peut voir ses propres fichiers
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin, Propriétaire, Responsable Scolarité peuvent tout voir
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('administrateur'::app_role, 'proprietaire'::app_role, 'responsable_scolarite'::app_role)
    )
    OR
    -- Gestionnaire Scolarité assigné au programme du devoir
    EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN programme_gestionnaires pg ON pg.gestionnaire_user_id = auth.uid()
      JOIN soumissions_devoirs sd ON sd.fichier_url LIKE '%' || name || '%'
      JOIN devoirs d ON d.id = sd.devoir_id
      JOIN classes c ON c.id = d.classe_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'gestionnaire_scolarite'::app_role
      AND pg.programme_id = c.programme_id
    )
    OR
    -- Enseignant affecté au module ou à la classe du devoir
    EXISTS (
      SELECT 1
      FROM enseignants e
      JOIN affectations a ON a.enseignant_id = e.id AND a.confirmee = true
      JOIN modules m ON m.id = a.module_id
      JOIN soumissions_devoirs sd ON sd.fichier_url LIKE '%' || name || '%'
      JOIN devoirs d ON d.id = sd.devoir_id
      WHERE e.user_id = auth.uid()
      AND (d.module_id = m.id OR d.classe_id = m.classe_id)
    )
  )
);