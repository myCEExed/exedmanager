-- Fix the function to only set classe_id (not both programme_id and classe_id)
CREATE OR REPLACE FUNCTION public.sync_restauration_to_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_classe_id UUID;
  v_programme_id UUID;
  v_prix_unitaire NUMERIC;
  v_cout_total NUMERIC;
  v_module_titre TEXT;
  v_offre_label TEXT;
  v_existing_id UUID;
BEGIN
  -- For DELETE, we need to use OLD values
  IF TG_OP = 'DELETE' THEN
    -- Find and delete the corresponding budget item
    DELETE FROM budget_items
    WHERE classe_id = (
      SELECT m.classe_id FROM modules m WHERE m.id = OLD.module_id
    )
    AND categorie = 'Restauration'
    AND description LIKE '%Module: ' || OLD.module_id || '%';
    
    RETURN OLD;
  END IF;

  -- For INSERT/UPDATE, use NEW values
  -- Get module and class info
  SELECT m.classe_id, m.titre, c.programme_id
  INTO v_classe_id, v_module_titre, v_programme_id
  FROM modules m
  JOIN classes c ON c.id = m.classe_id
  WHERE m.id = NEW.module_id;

  -- Get offre info and calculate cost
  SELECT 
    o.prix_unitaire,
    o.prix_unitaire * COALESCE(NEW.nombre_total_unites, 0),
    o.nature_restauration || ' - ' || o.formule_restauration
  INTO v_prix_unitaire, v_cout_total, v_offre_label
  FROM offres_restauration o
  WHERE o.id = NEW.offre_restauration_id;

  -- Skip if no cost
  IF v_cout_total IS NULL OR v_cout_total = 0 THEN
    -- Delete existing if any
    DELETE FROM budget_items
    WHERE classe_id = v_classe_id
    AND categorie = 'Restauration'
    AND description LIKE '%Module: ' || NEW.module_id || '%';
    RETURN NEW;
  END IF;

  -- Check if a budget item already exists for this specific module
  SELECT id INTO v_existing_id
  FROM budget_items
  WHERE classe_id = v_classe_id
  AND categorie = 'Restauration'
  AND description LIKE '%Module: ' || NEW.module_id || '%'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE budget_items
    SET 
      montant_prevu = v_cout_total,
      montant_realise = v_cout_total,
      description = v_module_titre || ' (' || v_offre_label || ', ' || COALESCE(NEW.nombre_total_unites, 0) || ' unités) - Module: ' || NEW.module_id,
      updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    -- Insert new - only set classe_id, not programme_id (due to budget_scope_check constraint)
    INSERT INTO budget_items (
      type,
      categorie,
      description,
      montant_prevu,
      montant_realise,
      programme_id,
      classe_id,
      created_by
    ) VALUES (
      'charge',
      'Restauration',
      v_module_titre || ' (' || v_offre_label || ', ' || COALESCE(NEW.nombre_total_unites, 0) || ' unités) - Module: ' || NEW.module_id,
      v_cout_total,
      v_cout_total,
      NULL,  -- Don't set programme_id to avoid constraint violation
      v_classe_id,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;