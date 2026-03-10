-- Update RLS policies for programmes table based on roles
DROP POLICY IF EXISTS "Authenticated users can view programmes" ON public.programmes;
DROP POLICY IF EXISTS "Authenticated users can create programmes" ON public.programmes;
DROP POLICY IF EXISTS "Authenticated users can update programmes" ON public.programmes;
DROP POLICY IF EXISTS "Authenticated users can delete programmes" ON public.programmes;
DROP POLICY IF EXISTS "All authenticated users can view programmes" ON public.programmes;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can create programmes" ON public.programmes;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can update programmes" ON public.programmes;
DROP POLICY IF EXISTS "Proprietaires can delete programmes" ON public.programmes;

CREATE POLICY "All authenticated users can view programmes"
ON public.programmes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can create programmes"
ON public.programmes FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

CREATE POLICY "Gestionnaires and proprietaires can update programmes"
ON public.programmes FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

CREATE POLICY "Proprietaires can delete programmes"
ON public.programmes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'::app_role));

-- Update RLS policies for classes table
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can manage classes" ON public.classes;
DROP POLICY IF EXISTS "All authenticated users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage classes" ON public.classes;

CREATE POLICY "All authenticated users can view classes"
ON public.classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can manage classes"
ON public.classes FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

-- Update RLS policies for enseignants table
DROP POLICY IF EXISTS "Authenticated users can view enseignants" ON public.enseignants;
DROP POLICY IF EXISTS "Authenticated users can manage enseignants" ON public.enseignants;
DROP POLICY IF EXISTS "All authenticated users can view enseignants" ON public.enseignants;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage enseignants" ON public.enseignants;

CREATE POLICY "All authenticated users can view enseignants"
ON public.enseignants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can manage enseignants"
ON public.enseignants FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

-- Update RLS policies for modules table
DROP POLICY IF EXISTS "Authenticated users can view modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated users can manage modules" ON public.modules;
DROP POLICY IF EXISTS "All authenticated users can view modules" ON public.modules;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage modules" ON public.modules;

CREATE POLICY "All authenticated users can view modules"
ON public.modules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can manage modules"
ON public.modules FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

-- Update RLS policies for affectations table
DROP POLICY IF EXISTS "Authenticated users can view affectations" ON public.affectations;
DROP POLICY IF EXISTS "Authenticated users can manage affectations" ON public.affectations;
DROP POLICY IF EXISTS "All authenticated users can view affectations" ON public.affectations;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage affectations" ON public.affectations;

CREATE POLICY "All authenticated users can view affectations"
ON public.affectations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can manage affectations"
ON public.affectations FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);

-- Update RLS policies for alerts table
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can manage alerts" ON public.alerts;
DROP POLICY IF EXISTS "All authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Gestionnaires and proprietaires can manage alerts" ON public.alerts;

CREATE POLICY "All authenticated users can view alerts"
ON public.alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestionnaires and proprietaires can manage alerts"
ON public.alerts FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestionnaire'::app_role) OR 
  public.has_role(auth.uid(), 'proprietaire'::app_role)
);