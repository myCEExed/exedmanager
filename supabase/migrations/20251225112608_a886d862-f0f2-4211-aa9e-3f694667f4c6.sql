-- Supprimer l'ancienne contrainte
ALTER TABLE programme_audit_log DROP CONSTRAINT programme_audit_log_entity_type_check;

-- Ajouter la nouvelle contrainte avec les deux formes (singulier et pluriel)
ALTER TABLE programme_audit_log ADD CONSTRAINT programme_audit_log_entity_type_check 
CHECK (entity_type = ANY (ARRAY['programme', 'programmes', 'module', 'modules', 'classe', 'classes', 'cout', 'couts']));

-- Corriger la fonction de log pour utiliser les bonnes valeurs
CREATE OR REPLACE FUNCTION public.log_programme_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  action_type text;
  v_programme_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  -- Déterminer le programme_id en fonction de la table
  IF TG_TABLE_NAME = 'programmes' THEN
    v_programme_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'classes' THEN
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id);
  ELSIF TG_TABLE_NAME = 'modules' THEN
    -- Pour les modules, on doit récupérer le programme_id via la classe
    SELECT c.programme_id INTO v_programme_id
    FROM classes c
    WHERE c.id = COALESCE(NEW.classe_id, OLD.classe_id);
  ELSIF TG_TABLE_NAME = 'programme_couts' THEN
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id);
  ELSE
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id, NEW.id, OLD.id);
  END IF;

  -- Ne pas insérer si on n'a pas de programme_id valide
  IF v_programme_id IS NOT NULL THEN
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
      v_programme_id,
      auth.uid(),
      action_type,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      TG_OP || ' on ' || TG_TABLE_NAME
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;