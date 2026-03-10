-- Ajouter les colonnes pour le stockage de fichiers dans ressources_pedagogiques
ALTER TABLE public.ressources_pedagogiques 
ADD COLUMN IF NOT EXISTS fichier_url TEXT,
ADD COLUMN IF NOT EXISTS fichier_type TEXT;