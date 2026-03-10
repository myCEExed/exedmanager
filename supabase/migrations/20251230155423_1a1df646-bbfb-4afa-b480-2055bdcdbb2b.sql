-- Add new columns to prospects table for sources and interests
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS sources text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_autre_commentaire text,
ADD COLUMN IF NOT EXISTS interet_thematiques text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interet_programme_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interet_module_ids uuid[] DEFAULT '{}';