-- Création des tables pour le système d'évaluations/enquêtes

-- Enum pour les types de questions
CREATE TYPE public.type_question AS ENUM (
  'texte_libre',
  'choix_unique',
  'choix_multiple',
  'echelle_5',
  'echelle_10',
  'oui_non',
  'note_20',
  'matrice'
);

-- Enum pour les types d'enquêtes
CREATE TYPE public.type_enquete AS ENUM (
  'a_chaud',
  'a_froid'
);

-- Table des modèles d'enquêtes (templates réutilisables)
CREATE TABLE public.modeles_enquete (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  type_enquete public.type_enquete NOT NULL,
  est_actif BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des questions de modèles
CREATE TABLE public.modeles_enquete_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modele_id UUID NOT NULL REFERENCES public.modeles_enquete(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type_question public.type_question NOT NULL DEFAULT 'texte_libre',
  options JSONB, -- Pour les choix multiples, échelles, matrices
  obligatoire BOOLEAN DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  condition_question_id UUID REFERENCES public.modeles_enquete_questions(id) ON DELETE SET NULL,
  condition_valeur JSONB, -- Valeur(s) qui déclenchent l'affichage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des enquêtes déployées
CREATE TABLE public.enquetes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  type_enquete public.type_enquete NOT NULL,
  modele_id UUID REFERENCES public.modeles_enquete(id),
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  date_session DATE, -- Pour les évaluations à chaud liées à une séance
  date_debut TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_fin TIMESTAMP WITH TIME ZONE,
  est_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des questions d'enquêtes déployées
CREATE TABLE public.enquetes_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquete_id UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type_question public.type_question NOT NULL DEFAULT 'texte_libre',
  options JSONB,
  obligatoire BOOLEAN DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  condition_question_id UUID REFERENCES public.enquetes_questions(id) ON DELETE SET NULL,
  condition_valeur JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des réponses des stagiaires
CREATE TABLE public.enquetes_reponses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enquete_id UUID NOT NULL REFERENCES public.enquetes(id) ON DELETE CASCADE,
  stagiaire_id UUID NOT NULL REFERENCES public.stagiaires(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(enquete_id, stagiaire_id)
);

-- Table des réponses par question
CREATE TABLE public.enquetes_reponses_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reponse_id UUID NOT NULL REFERENCES public.enquetes_reponses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.enquetes_questions(id) ON DELETE CASCADE,
  valeur_texte TEXT,
  valeur_numerique NUMERIC,
  valeur_json JSONB, -- Pour choix multiples, matrices
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configuration des enquêtes automatiques par classe
CREATE TABLE public.classes_enquetes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  modele_enquete_chaud_id UUID REFERENCES public.modeles_enquete(id),
  modele_enquete_froid_id UUID REFERENCES public.modeles_enquete(id),
  delai_enquete_froid_jours INTEGER DEFAULT 90, -- Délai après fin de programme
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(classe_id)
);

-- Enable RLS
ALTER TABLE public.modeles_enquete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modeles_enquete_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquetes_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquetes_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquetes_reponses_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes_enquetes_config ENABLE ROW LEVEL SECURITY;

-- Policies pour modeles_enquete
CREATE POLICY "Authenticated users can view modeles_enquete"
  ON public.modeles_enquete FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert modeles_enquete"
  ON public.modeles_enquete FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update modeles_enquete"
  ON public.modeles_enquete FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete modeles_enquete"
  ON public.modeles_enquete FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour modeles_enquete_questions
CREATE POLICY "Authenticated users can view modeles_enquete_questions"
  ON public.modeles_enquete_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert modeles_enquete_questions"
  ON public.modeles_enquete_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update modeles_enquete_questions"
  ON public.modeles_enquete_questions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete modeles_enquete_questions"
  ON public.modeles_enquete_questions FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour enquetes
CREATE POLICY "Authenticated users can view enquetes"
  ON public.enquetes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquetes"
  ON public.enquetes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update enquetes"
  ON public.enquetes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete enquetes"
  ON public.enquetes FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour enquetes_questions
CREATE POLICY "Authenticated users can view enquetes_questions"
  ON public.enquetes_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquetes_questions"
  ON public.enquetes_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update enquetes_questions"
  ON public.enquetes_questions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete enquetes_questions"
  ON public.enquetes_questions FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour enquetes_reponses (stagiaires peuvent voir/modifier leurs propres réponses)
CREATE POLICY "Users can view their own enquetes_reponses"
  ON public.enquetes_reponses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquetes_reponses"
  ON public.enquetes_reponses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own enquetes_reponses"
  ON public.enquetes_reponses FOR UPDATE
  TO authenticated
  USING (true);

-- Policies pour enquetes_reponses_details
CREATE POLICY "Users can view enquetes_reponses_details"
  ON public.enquetes_reponses_details FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert enquetes_reponses_details"
  ON public.enquetes_reponses_details FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update enquetes_reponses_details"
  ON public.enquetes_reponses_details FOR UPDATE
  TO authenticated
  USING (true);

-- Policies pour classes_enquetes_config
CREATE POLICY "Authenticated users can view classes_enquetes_config"
  ON public.classes_enquetes_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert classes_enquetes_config"
  ON public.classes_enquetes_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update classes_enquetes_config"
  ON public.classes_enquetes_config FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete classes_enquetes_config"
  ON public.classes_enquetes_config FOR DELETE
  TO authenticated
  USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_modeles_enquete_updated_at
  BEFORE UPDATE ON public.modeles_enquete
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enquetes_updated_at
  BEFORE UPDATE ON public.enquetes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enquetes_reponses_updated_at
  BEFORE UPDATE ON public.enquetes_reponses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_enquetes_config_updated_at
  BEFORE UPDATE ON public.classes_enquetes_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour performances
CREATE INDEX idx_enquetes_programme_id ON public.enquetes(programme_id);
CREATE INDEX idx_enquetes_classe_id ON public.enquetes(classe_id);
CREATE INDEX idx_enquetes_module_id ON public.enquetes(module_id);
CREATE INDEX idx_enquetes_reponses_stagiaire_id ON public.enquetes_reponses(stagiaire_id);
CREATE INDEX idx_enquetes_reponses_enquete_id ON public.enquetes_reponses(enquete_id);