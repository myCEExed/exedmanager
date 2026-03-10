-- Add created_by column to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop all existing classes policies
DROP POLICY IF EXISTS "Admins and gestionnaires can manage classes" ON public.classes;
DROP POLICY IF EXISTS "All authenticated users can view classes" ON public.classes;

-- New RLS policies for classes with creator check
CREATE POLICY "Admins and responsables can manage all classes"
ON public.classes
FOR ALL
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'responsable_scolarite'::app_role)
);

CREATE POLICY "Gestionnaires can manage their own classes"
ON public.classes
FOR ALL
USING (
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) AND 
  auth.uid() = created_by
);

CREATE POLICY "All users can view classes"
ON public.classes
FOR SELECT
USING (true);

-- Drop all existing programmes policies
DROP POLICY IF EXISTS "Admins and gestionnaires can manage programmes" ON public.programmes;
DROP POLICY IF EXISTS "All authenticated users can view programmes" ON public.programmes;

-- New RLS policies for programmes with creator check
CREATE POLICY "Admins and responsables can manage all programmes"
ON public.programmes
FOR ALL
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'responsable_scolarite'::app_role)
);

CREATE POLICY "Gestionnaires can manage their own programmes"
ON public.programmes
FOR ALL
USING (
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role) AND 
  auth.uid() = created_by
);

CREATE POLICY "All users can view programmes"
ON public.programmes
FOR SELECT
USING (true);

-- Create validation functions for date checks
CREATE OR REPLACE FUNCTION validate_classes_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_programmes_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for date validation
DROP TRIGGER IF EXISTS validate_classes_dates_trigger ON public.classes;
CREATE TRIGGER validate_classes_dates_trigger
  BEFORE INSERT OR UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION validate_classes_dates();

DROP TRIGGER IF EXISTS validate_programmes_dates_trigger ON public.programmes;
CREATE TRIGGER validate_programmes_dates_trigger
  BEFORE INSERT OR UPDATE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION validate_programmes_dates();