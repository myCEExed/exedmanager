-- Step 1: Drop all policies that depend on app_role
-- user_roles policies
DROP POLICY IF EXISTS "Proprietaires can manage all roles" ON user_roles;

-- programmes policies
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can create programmes" ON programmes;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can update programmes" ON programmes;
DROP POLICY IF EXISTS "Proprietaires can delete programmes" ON programmes;

-- classes policies
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage classes" ON classes;

-- enseignants policies
DROP POLICY IF EXISTS "All authenticated users can view enseignants" ON enseignants;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage enseignants" ON enseignants;

-- modules policies
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage modules" ON modules;

-- affectations policies
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage affectations" ON affectations;

-- alerts policies
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage alerts" ON alerts;

-- stagiaires policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les stagiaires" ON stagiaires;
DROP POLICY IF EXISTS "Enseignants peuvent voir leurs stagiaires" ON stagiaires;

-- inscriptions policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les inscriptions" ON inscriptions;
DROP POLICY IF EXISTS "Enseignants peuvent voir les inscriptions de leurs classes" ON inscriptions;

-- invitations policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les invitations" ON invitations;

-- messages policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent voir tous les messages" ON messages;
DROP POLICY IF EXISTS "Enseignants et gestionnaires peuvent créer des messages" ON messages;
DROP POLICY IF EXISTS "Stagiaires peuvent répondre aux messages" ON messages;

-- documents policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les documents" ON documents;
DROP POLICY IF EXISTS "Enseignants peuvent voir et créer des documents pour leurs cla" ON documents;
DROP POLICY IF EXISTS "Enseignants peuvent uploader des documents" ON documents;
DROP POLICY IF EXISTS "Stagiaires peuvent voir les documents de leurs classes" ON documents;

-- storage.objects policies
DROP POLICY IF EXISTS "Enseignants et gestionnaires peuvent uploader des documents" ON storage.objects;
DROP POLICY IF EXISTS "Enseignants et gestionnaires peuvent supprimer leurs documents" ON storage.objects;

-- factures policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les factures" ON factures;

-- paiements policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les paiements" ON paiements;

-- relances policies
DROP POLICY IF EXISTS "Gestionnaires et proprietaires peuvent gérer les relances" ON relances;

-- Step 2: Drop has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.enseignant_can_see_stagiaire(uuid, uuid);

-- Step 3: Rename old enum
ALTER TYPE app_role RENAME TO app_role_old;

-- Step 4: Create new enum with updated roles
CREATE TYPE app_role AS ENUM (
  'administrateur',
  'gestionnaire_scolarite', 
  'financier',
  'collaborateur',
  'enseignant',
  'stagiaire'
);

-- Step 5: Migrate user_roles data
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING (
  CASE role::text
    WHEN 'proprietaire' THEN 'administrateur'::app_role
    WHEN 'gestionnaire' THEN 'gestionnaire_scolarite'::app_role
    WHEN 'lecteur' THEN 'collaborateur'::app_role
    WHEN 'utilisateur' THEN 'collaborateur'::app_role
    WHEN 'enseignant' THEN 'enseignant'::app_role
    WHEN 'stagiaire' THEN 'stagiaire'::app_role
  END
);

-- Step 6: Drop old enum
DROP TYPE app_role_old;

-- Step 7: Recreate helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

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

-- Step 8: Recreate all policies with new roles
-- user_roles policies
CREATE POLICY "Admins can manage all roles" 
ON user_roles FOR ALL 
USING (has_role(auth.uid(), 'administrateur'));

-- programmes policies
CREATE POLICY "Admins and gestionnaires can create programmes" 
ON programmes FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Admins and gestionnaires can update programmes" 
ON programmes FOR UPDATE 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Admins can delete programmes" 
ON programmes FOR DELETE 
USING (has_role(auth.uid(), 'administrateur'));

-- classes policies
CREATE POLICY "Admins and gestionnaires can manage classes" 
ON classes FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- enseignants policies (FIXED - no longer public!)
CREATE POLICY "Admins and gestionnaires can view enseignants" 
ON enseignants FOR SELECT 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants can view their own data" 
ON enseignants FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and gestionnaires can insert enseignants" 
ON enseignants FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Admins and gestionnaires can update enseignants" 
ON enseignants FOR UPDATE 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Admins can delete enseignants" 
ON enseignants FOR DELETE 
USING (has_role(auth.uid(), 'administrateur'));

-- modules policies
CREATE POLICY "Admins and gestionnaires can manage modules" 
ON modules FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- affectations policies
CREATE POLICY "Admins and gestionnaires can manage affectations" 
ON affectations FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- alerts policies
CREATE POLICY "Admins and gestionnaires can manage alerts" 
ON alerts FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- stagiaires policies
CREATE POLICY "Admins and gestionnaires can manage stagiaires" 
ON stagiaires FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants can view their stagiaires" 
ON stagiaires FOR SELECT 
USING (has_role(auth.uid(), 'enseignant') AND enseignant_can_see_stagiaire(auth.uid(), id));

-- inscriptions policies
CREATE POLICY "Admins and gestionnaires can manage inscriptions" 
ON inscriptions FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants can view inscriptions in their classes" 
ON inscriptions FOR SELECT 
USING (
  has_role(auth.uid(), 'enseignant') 
  AND EXISTS (
    SELECT 1 FROM classes c
    JOIN modules m ON m.classe_id = c.id
    JOIN affectations a ON a.module_id = m.id
    JOIN enseignants e ON e.id = a.enseignant_id
    WHERE c.id = inscriptions.classe_id AND e.user_id = auth.uid()
  )
);

-- invitations policies
CREATE POLICY "Admins and gestionnaires can manage invitations" 
ON invitations FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- messages policies
CREATE POLICY "Admins and gestionnaires can view all messages" 
ON messages FOR SELECT 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants and gestionnaires can create messages" 
ON messages FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'enseignant') 
  OR has_role(auth.uid(), 'gestionnaire_scolarite') 
  OR has_role(auth.uid(), 'administrateur')
);

CREATE POLICY "Stagiaires can reply to messages" 
ON messages FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'stagiaire') AND auth.uid() = expediteur_id);

-- documents policies
CREATE POLICY "Admins and gestionnaires can manage documents" 
ON documents FOR ALL 
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants can view and create documents for their classes" 
ON documents FOR SELECT 
USING (
  has_role(auth.uid(), 'enseignant') 
  AND EXISTS (
    SELECT 1 FROM modules m
    JOIN affectations a ON a.module_id = m.id
    JOIN enseignants e ON e.id = a.enseignant_id
    WHERE (m.classe_id = documents.classe_id OR m.id = documents.module_id) 
      AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Enseignants can upload documents" 
ON documents FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'enseignant') AND auth.uid() = uploaded_by);

CREATE POLICY "Stagiaires can view documents in their classes" 
ON documents FOR SELECT 
USING (
  has_role(auth.uid(), 'stagiaire') 
  AND EXISTS (
    SELECT 1 FROM inscriptions i
    JOIN stagiaires s ON s.id = i.stagiaire_id
    JOIN modules m ON m.classe_id = i.classe_id
    WHERE s.user_id = auth.uid() 
      AND (m.classe_id = documents.classe_id OR m.id = documents.module_id)
  )
);

-- storage.objects policies
CREATE POLICY "Enseignants and gestionnaires can upload documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' 
  AND (has_role(auth.uid(), 'enseignant') OR has_role(auth.uid(), 'gestionnaire_scolarite') OR has_role(auth.uid(), 'administrateur'))
);

CREATE POLICY "Enseignants and gestionnaires can delete their documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents' 
  AND (has_role(auth.uid(), 'enseignant') OR has_role(auth.uid(), 'gestionnaire_scolarite') OR has_role(auth.uid(), 'administrateur'))
);

-- factures policies
CREATE POLICY "Admins, gestionnaires and financiers can manage factures" 
ON factures FOR ALL 
USING (
  has_role(auth.uid(), 'administrateur') 
  OR has_role(auth.uid(), 'gestionnaire_scolarite') 
  OR has_role(auth.uid(), 'financier')
);

-- paiements policies
CREATE POLICY "Admins, gestionnaires and financiers can manage paiements" 
ON paiements FOR ALL 
USING (
  has_role(auth.uid(), 'administrateur') 
  OR has_role(auth.uid(), 'gestionnaire_scolarite') 
  OR has_role(auth.uid(), 'financier')
);

-- relances policies
CREATE POLICY "Admins, gestionnaires and financiers can manage relances" 
ON relances FOR ALL 
USING (
  has_role(auth.uid(), 'administrateur') 
  OR has_role(auth.uid(), 'gestionnaire_scolarite') 
  OR has_role(auth.uid(), 'financier')
);