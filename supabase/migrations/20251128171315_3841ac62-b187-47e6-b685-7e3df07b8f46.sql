-- Table d'historique des modifications des programmes
CREATE TABLE IF NOT EXISTS public.programme_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES programmes(id) ON DELETE CASCADE NOT NULL,
  modified_by uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('programme', 'module', 'classe', 'cout')),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_audit_programme_id ON public.programme_audit_log(programme_id);
CREATE INDEX idx_audit_modified_by ON public.programme_audit_log(modified_by);
CREATE INDEX idx_audit_created_at ON public.programme_audit_log(created_at DESC);

-- RLS policies pour l'historique
ALTER TABLE public.programme_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et responsables peuvent voir l'historique"
ON public.programme_audit_log
FOR SELECT
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'responsable_scolarite'::app_role) OR
  has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
);

CREATE POLICY "Système peut insérer dans l'historique"
ON public.programme_audit_log
FOR INSERT
WITH CHECK (auth.uid() = modified_by);

-- Fonction pour créer automatiquement un log d'audit
CREATE OR REPLACE FUNCTION log_programme_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type text;
  changes jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    changes := to_jsonb(OLD);
  END IF;

  INSERT INTO programme_audit_log (
    programme_id,
    modified_by,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    description
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    TG_OP || ' on ' || TG_TABLE_NAME
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Triggers pour audit automatique
DROP TRIGGER IF EXISTS audit_programmes_trigger ON public.programmes;
CREATE TRIGGER audit_programmes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.programmes
  FOR EACH ROW
  EXECUTE FUNCTION log_programme_audit();

DROP TRIGGER IF EXISTS audit_programme_modules_trigger ON public.programme_modules;
CREATE TRIGGER audit_programme_modules_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.programme_modules
  FOR EACH ROW
  EXECUTE FUNCTION log_programme_audit();

DROP TRIGGER IF EXISTS audit_programme_couts_trigger ON public.programme_couts;
CREATE TRIGGER audit_programme_couts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.programme_couts
  FOR EACH ROW
  EXECUTE FUNCTION log_programme_audit();

DROP TRIGGER IF EXISTS audit_classes_trigger ON public.classes;
CREATE TRIGGER audit_classes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION log_programme_audit();