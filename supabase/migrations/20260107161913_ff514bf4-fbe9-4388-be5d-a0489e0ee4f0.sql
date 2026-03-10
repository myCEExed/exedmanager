-- Fix security definer views by making them use invoker security
DROP VIEW IF EXISTS public.notes_consolidees;

CREATE VIEW public.notes_consolidees 
WITH (security_invoker = true)
AS
SELECT 
  ns.id,
  ns.stagiaire_id,
  ns.note,
  ns.commentaire,
  ns.type_source,
  ns.created_at,
  ns.updated_at,
  -- Evaluation fields
  ns.evaluation_id,
  e.titre as evaluation_titre,
  e.type_evaluation,
  e.note_max as evaluation_note_max,
  e.coefficient as evaluation_coefficient,
  e.classe_id as evaluation_classe_id,
  e.module_id as evaluation_module_id,
  -- Devoir fields
  ns.devoir_id,
  d.titre as devoir_titre,
  d.type_devoir,
  d.points_max as devoir_points_max,
  d.coefficient as devoir_coefficient,
  d.classe_id as devoir_classe_id,
  d.module_id as devoir_module_id,
  -- Unified fields for easier queries
  COALESCE(e.titre, d.titre) as titre,
  COALESCE(e.note_max, d.points_max) as note_max,
  COALESCE(e.coefficient, d.coefficient) as coefficient,
  COALESCE(e.classe_id, d.classe_id) as classe_id,
  COALESCE(e.module_id, d.module_id) as module_id
FROM public.notes_stagiaires ns
LEFT JOIN public.evaluations e ON ns.evaluation_id = e.id
LEFT JOIN public.devoirs d ON ns.devoir_id = d.id
WHERE ns.note IS NOT NULL;