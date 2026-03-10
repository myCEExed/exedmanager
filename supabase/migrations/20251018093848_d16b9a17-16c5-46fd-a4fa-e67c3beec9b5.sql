-- Create RLS policies for documents storage bucket

-- Allow authenticated users with proper roles to upload documents
CREATE POLICY "Enseignants and admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR 
   has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) OR
   has_role(auth.uid(), 'enseignant'::app_role))
);

-- Allow users to download documents they have access to
CREATE POLICY "Users can download documents they have access to"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
    -- Admins and gestionnaires can access all
    has_role(auth.uid(), 'administrateur'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) OR
    -- Enseignants can access documents for their classes
    (has_role(auth.uid(), 'enseignant'::app_role) AND EXISTS (
      SELECT 1 FROM documents d
      JOIN modules m ON (m.classe_id = d.classe_id OR m.id = d.module_id)
      JOIN affectations a ON a.module_id = m.id
      JOIN enseignants e ON e.id = a.enseignant_id
      WHERE e.user_id = auth.uid() 
        AND d.url LIKE '%' || storage.objects.name || '%'
    )) OR
    -- Stagiaires can access documents for their enrolled classes
    (has_role(auth.uid(), 'stagiaire'::app_role) AND EXISTS (
      SELECT 1 FROM documents d
      JOIN modules m ON (m.classe_id = d.classe_id OR m.id = d.module_id)
      JOIN inscriptions i ON i.classe_id = m.classe_id
      JOIN stagiaires s ON s.id = i.stagiaire_id
      WHERE s.user_id = auth.uid() 
        AND d.url LIKE '%' || storage.objects.name || '%'
    ))
  )
);

-- Allow admins and gestionnaires to delete documents
CREATE POLICY "Admins and gestionnaires can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (has_role(auth.uid(), 'administrateur'::app_role) OR 
   has_role(auth.uid(), 'gestionnaire_scolarite'::app_role))
);