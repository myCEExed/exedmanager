-- Fix security warnings: set search_path for validation functions
CREATE OR REPLACE FUNCTION validate_classes_dates()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_programmes_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;