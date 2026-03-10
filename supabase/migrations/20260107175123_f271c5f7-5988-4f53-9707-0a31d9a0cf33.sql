-- Ajouter une contrainte unique pour permettre l'upsert des présences
-- Cela permet à la saisie manuelle de compléter/modifier les scans QR
ALTER TABLE public.assiduite 
ADD CONSTRAINT assiduite_stagiaire_module_session_unique 
UNIQUE (stagiaire_id, module_id, date_session);