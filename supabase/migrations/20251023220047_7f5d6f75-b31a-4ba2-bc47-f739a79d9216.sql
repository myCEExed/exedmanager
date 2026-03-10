-- Table pour les ressources pédagogiques (contenu)
CREATE TABLE IF NOT EXISTS public.ressources_pedagogiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  type_ressource TEXT NOT NULL CHECK (type_ressource IN ('video', 'pdf', 'presentation', 'document', 'lien', 'autre')),
  url TEXT,
  fichier_id TEXT,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  ordre INTEGER DEFAULT 0,
  duree_minutes INTEGER,
  obligatoire BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table pour les devoirs
CREATE TABLE IF NOT EXISTS public.devoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  date_ouverture TIMESTAMP WITH TIME ZONE NOT NULL,
  date_limite TIMESTAMP WITH TIME ZONE NOT NULL,
  points_max NUMERIC(5,2) DEFAULT 100,
  type_devoir TEXT NOT NULL CHECK (type_devoir IN ('individuel', 'groupe')),
  accepte_fichiers BOOLEAN DEFAULT true,
  formats_acceptes TEXT[],
  taille_max_mb INTEGER DEFAULT 10,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table pour les soumissions de devoirs
CREATE TABLE IF NOT EXISTS public.soumissions_devoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id UUID REFERENCES public.devoirs(id) ON DELETE CASCADE NOT NULL,
  stagiaire_id UUID REFERENCES public.stagiaires(id) ON DELETE CASCADE NOT NULL,
  fichier_url TEXT,
  fichier_nom TEXT,
  commentaire_stagiaire TEXT,
  date_soumission TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  note NUMERIC(5,2),
  commentaire_enseignant TEXT,
  statut TEXT DEFAULT 'soumis' CHECK (statut IN ('soumis', 'en_correction', 'corrige', 'refuse')),
  corrige_par UUID REFERENCES auth.users(id),
  date_correction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(devoir_id, stagiaire_id)
);

-- Table pour suivre la progression des stagiaires
CREATE TABLE IF NOT EXISTS public.progression_stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID REFERENCES public.stagiaires(id) ON DELETE CASCADE NOT NULL,
  ressource_id UUID REFERENCES public.ressources_pedagogiques(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  statut TEXT DEFAULT 'non_commence' CHECK (statut IN ('non_commence', 'en_cours', 'termine')),
  pourcentage_completion INTEGER DEFAULT 0 CHECK (pourcentage_completion >= 0 AND pourcentage_completion <= 100),
  temps_passe_minutes INTEGER DEFAULT 0,
  derniere_activite TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(stagiaire_id, ressource_id),
  UNIQUE(stagiaire_id, module_id)
);

-- Indexes pour performances
CREATE INDEX idx_ressources_module ON public.ressources_pedagogiques(module_id);
CREATE INDEX idx_ressources_classe ON public.ressources_pedagogiques(classe_id);
CREATE INDEX idx_devoirs_module ON public.devoirs(module_id);
CREATE INDEX idx_devoirs_classe ON public.devoirs(classe_id);
CREATE INDEX idx_devoirs_date_limite ON public.devoirs(date_limite);
CREATE INDEX idx_soumissions_devoir ON public.soumissions_devoirs(devoir_id);
CREATE INDEX idx_soumissions_stagiaire ON public.soumissions_devoirs(stagiaire_id);
CREATE INDEX idx_progression_stagiaire ON public.progression_stagiaires(stagiaire_id);
CREATE INDEX idx_progression_module ON public.progression_stagiaires(module_id);

-- RLS Policies pour ressources_pedagogiques
ALTER TABLE public.ressources_pedagogiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et gestionnaires peuvent tout gérer" ON public.ressources_pedagogiques
  FOR ALL USING (
    has_role(auth.uid(), 'administrateur'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  );

CREATE POLICY "Enseignants peuvent créer ressources" ON public.ressources_pedagogiques
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enseignant'::app_role) AND 
    auth.uid() = uploaded_by
  );

CREATE POLICY "Enseignants voient leurs ressources" ON public.ressources_pedagogiques
  FOR SELECT USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND (
      EXISTS (
        SELECT 1 FROM affectations a
        JOIN enseignants e ON e.id = a.enseignant_id
        JOIN modules m ON m.id = a.module_id
        WHERE e.user_id = auth.uid() 
        AND (m.id = ressources_pedagogiques.module_id OR m.classe_id = ressources_pedagogiques.classe_id)
      )
    )
  );

CREATE POLICY "Stagiaires voient ressources de leurs classes" ON public.ressources_pedagogiques
  FOR SELECT USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM inscriptions i
        JOIN stagiaires s ON s.id = i.stagiaire_id
        WHERE s.user_id = auth.uid() 
        AND i.classe_id = ressources_pedagogiques.classe_id
      )
    )
  );

-- RLS Policies pour devoirs
ALTER TABLE public.devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et gestionnaires gèrent devoirs" ON public.devoirs
  FOR ALL USING (
    has_role(auth.uid(), 'administrateur'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  );

CREATE POLICY "Enseignants créent devoirs" ON public.devoirs
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enseignant'::app_role) AND 
    auth.uid() = created_by
  );

CREATE POLICY "Enseignants voient leurs devoirs" ON public.devoirs
  FOR SELECT USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND (
      EXISTS (
        SELECT 1 FROM affectations a
        JOIN enseignants e ON e.id = a.enseignant_id
        JOIN modules m ON m.id = a.module_id
        WHERE e.user_id = auth.uid() 
        AND (m.id = devoirs.module_id OR m.classe_id = devoirs.classe_id)
      )
    )
  );

CREATE POLICY "Stagiaires voient devoirs de leurs classes" ON public.devoirs
  FOR SELECT USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM inscriptions i
        JOIN stagiaires s ON s.id = i.stagiaire_id
        WHERE s.user_id = auth.uid() 
        AND i.classe_id = devoirs.classe_id
      )
    )
  );

-- RLS Policies pour soumissions_devoirs
ALTER TABLE public.soumissions_devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et gestionnaires gèrent soumissions" ON public.soumissions_devoirs
  FOR ALL USING (
    has_role(auth.uid(), 'administrateur'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  );

CREATE POLICY "Stagiaires soumettent leurs devoirs" ON public.soumissions_devoirs
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM stagiaires s
        WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Stagiaires voient leurs soumissions" ON public.soumissions_devoirs
  FOR SELECT USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM stagiaires s
        WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Stagiaires modifient leurs soumissions" ON public.soumissions_devoirs
  FOR UPDATE USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND 
    statut = 'soumis' AND (
      EXISTS (
        SELECT 1 FROM stagiaires s
        WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enseignants voient soumissions de leurs classes" ON public.soumissions_devoirs
  FOR SELECT USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND (
      EXISTS (
        SELECT 1 FROM devoirs d
        JOIN affectations a ON a.module_id = d.module_id
        JOIN enseignants e ON e.id = a.enseignant_id
        WHERE e.user_id = auth.uid() 
        AND d.id = soumissions_devoirs.devoir_id
      )
    )
  );

CREATE POLICY "Enseignants corrigent soumissions" ON public.soumissions_devoirs
  FOR UPDATE USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND (
      EXISTS (
        SELECT 1 FROM devoirs d
        JOIN affectations a ON a.module_id = d.module_id
        JOIN enseignants e ON e.id = a.enseignant_id
        WHERE e.user_id = auth.uid() 
        AND d.id = soumissions_devoirs.devoir_id
      )
    )
  );

-- RLS Policies pour progression_stagiaires
ALTER TABLE public.progression_stagiaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et gestionnaires voient toute progression" ON public.progression_stagiaires
  FOR SELECT USING (
    has_role(auth.uid(), 'administrateur'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire_scolarite'::app_role)
  );

CREATE POLICY "Stagiaires voient leur progression" ON public.progression_stagiaires
  FOR SELECT USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM stagiaires s
        WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Stagiaires mettent à jour leur progression" ON public.progression_stagiaires
  FOR ALL USING (
    has_role(auth.uid(), 'stagiaire'::app_role) AND (
      EXISTS (
        SELECT 1 FROM stagiaires s
        WHERE s.id = stagiaire_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enseignants voient progression de leurs stagiaires" ON public.progression_stagiaires
  FOR SELECT USING (
    has_role(auth.uid(), 'enseignant'::app_role) AND 
    enseignant_can_see_stagiaire(auth.uid(), stagiaire_id)
  );

-- Triggers pour updated_at
CREATE TRIGGER update_ressources_pedagogiques_updated_at
  BEFORE UPDATE ON public.ressources_pedagogiques
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_devoirs_updated_at
  BEFORE UPDATE ON public.devoirs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_soumissions_devoirs_updated_at
  BEFORE UPDATE ON public.soumissions_devoirs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_progression_stagiaires_updated_at
  BEFORE UPDATE ON public.progression_stagiaires
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();