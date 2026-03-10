
-- 1. Ajouter une colonne optionnelle pour lier les notes aux devoirs
ALTER TABLE public.notes_stagiaires 
ADD COLUMN IF NOT EXISTS devoir_id UUID REFERENCES public.devoirs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS soumission_devoir_id UUID REFERENCES public.soumissions_devoirs(id) ON DELETE CASCADE;

-- 2. Rendre evaluation_id optionnel (car une note peut venir d'un devoir OU d'une évaluation)
ALTER TABLE public.notes_stagiaires 
ALTER COLUMN evaluation_id DROP NOT NULL;

-- 3. Ajouter une contrainte pour s'assurer qu'une note a soit une évaluation, soit un devoir
ALTER TABLE public.notes_stagiaires 
ADD CONSTRAINT check_note_source 
CHECK (evaluation_id IS NOT NULL OR devoir_id IS NOT NULL);

-- 4. Ajouter un type de source pour faciliter les requêtes
ALTER TABLE public.notes_stagiaires 
ADD COLUMN IF NOT EXISTS type_source TEXT DEFAULT 'evaluation' 
CHECK (type_source IN ('evaluation', 'devoir'));

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notes_stagiaires_devoir ON public.notes_stagiaires(devoir_id) WHERE devoir_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_stagiaires_soumission ON public.notes_stagiaires(soumission_devoir_id) WHERE soumission_devoir_id IS NOT NULL;

-- 6. Créer une vue consolidée des notes (évaluations + devoirs)
CREATE OR REPLACE VIEW public.notes_consolidees AS
SELECT 
  ns.id,
  ns.stagiaire_id,
  ns.note,
  ns.commentaire,
  ns.type_source,
  ns.created_at,
  -- Info évaluation
  e.id as evaluation_id,
  e.titre as evaluation_titre,
  e.type_evaluation,
  e.coefficient as evaluation_coefficient,
  e.note_max as evaluation_note_max,
  e.module_id as evaluation_module_id,
  e.classe_id as evaluation_classe_id,
  -- Info devoir
  d.id as devoir_id,
  d.titre as devoir_titre,
  d.type_devoir,
  d.points_max as devoir_points_max,
  d.module_id as devoir_module_id,
  d.classe_id as devoir_classe_id,
  -- Info consolidée
  COALESCE(e.module_id, d.module_id) as module_id,
  COALESCE(e.classe_id, d.classe_id) as classe_id,
  COALESCE(e.titre, d.titre) as titre,
  COALESCE(e.note_max, d.points_max) as note_max,
  COALESCE(e.coefficient, 1) as coefficient
FROM public.notes_stagiaires ns
LEFT JOIN public.evaluations e ON e.id = ns.evaluation_id
LEFT JOIN public.devoirs d ON d.id = ns.devoir_id;

-- 7. Créer une fonction pour synchroniser les notes des soumissions vers notes_stagiaires
CREATE OR REPLACE FUNCTION public.sync_devoir_note_to_notes_stagiaires()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quand une note est ajoutée/modifiée sur une soumission de devoir
  IF NEW.note IS NOT NULL AND (OLD IS NULL OR OLD.note IS DISTINCT FROM NEW.note) THEN
    -- Insérer ou mettre à jour dans notes_stagiaires
    INSERT INTO public.notes_stagiaires (
      stagiaire_id,
      devoir_id,
      soumission_devoir_id,
      note,
      commentaire,
      type_source
    ) VALUES (
      NEW.stagiaire_id,
      NEW.devoir_id,
      NEW.id,
      NEW.note,
      NEW.commentaire_enseignant,
      'devoir'
    )
    ON CONFLICT (soumission_devoir_id) 
    WHERE soumission_devoir_id IS NOT NULL
    DO UPDATE SET
      note = EXCLUDED.note,
      commentaire = EXCLUDED.commentaire,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Créer un index unique partiel pour éviter les doublons de soumissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_stagiaires_soumission_unique 
ON public.notes_stagiaires(soumission_devoir_id) 
WHERE soumission_devoir_id IS NOT NULL;

-- 9. Créer le trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS trigger_sync_devoir_note ON public.soumissions_devoirs;
CREATE TRIGGER trigger_sync_devoir_note
AFTER INSERT OR UPDATE OF note, commentaire_enseignant ON public.soumissions_devoirs
FOR EACH ROW
EXECUTE FUNCTION public.sync_devoir_note_to_notes_stagiaires();
