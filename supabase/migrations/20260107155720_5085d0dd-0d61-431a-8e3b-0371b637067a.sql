
-- Supprimer les tables si elles existent partiellement
DROP TABLE IF EXISTS public.discussions_tags CASCADE;
DROP TABLE IF EXISTS public.discussion_tags CASCADE;

-- 1. Créer une table pour les tags de discussion
CREATE TABLE public.discussion_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  couleur TEXT NOT NULL DEFAULT '#6366f1',
  type_tag TEXT NOT NULL DEFAULT 'thematique' CHECK (type_tag IN ('classe', 'programme', 'thematique')),
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Table de liaison discussions <-> tags (many-to-many)
CREATE TABLE public.discussions_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.discussion_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, tag_id)
);

-- 3. Activer RLS
ALTER TABLE public.discussion_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions_tags ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS pour discussion_tags (lecture pour tous les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can view tags"
ON public.discussion_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage tags"
ON public.discussion_tags FOR ALL
USING (public.has_role(auth.uid(), 'administrateur'));

-- 5. Politiques RLS pour discussions_tags
CREATE POLICY "Authenticated users can view discussions_tags"
ON public.discussions_tags FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert discussions_tags"
ON public.discussions_tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Insérer des tags par défaut basés sur les classes existantes
INSERT INTO public.discussion_tags (nom, couleur, type_tag, classe_id)
SELECT 
  'Classe: ' || c.nom, 
  '#3b82f6', 
  'classe', 
  c.id
FROM public.classes c;

-- 7. Insérer des tags par défaut basés sur les programmes existants
INSERT INTO public.discussion_tags (nom, couleur, type_tag, programme_id)
SELECT 
  'Programme: ' || p.titre, 
  '#10b981', 
  'programme', 
  p.id
FROM public.programmes p;

-- 8. Insérer des tags thématiques par défaut
INSERT INTO public.discussion_tags (nom, couleur, type_tag) VALUES
  ('Général', '#6366f1', 'thematique'),
  ('Pédagogie', '#f59e0b', 'thematique'),
  ('Organisation', '#ef4444', 'thematique'),
  ('Questions', '#8b5cf6', 'thematique'),
  ('Ressources', '#06b6d4', 'thematique');
