-- Tables (avec IF NOT EXISTS pour éviter les erreurs)
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stagiaire_id UUID NOT NULL REFERENCES public.stagiaires(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date_inscription TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  statut TEXT DEFAULT 'inscrit' CHECK (statut IN ('inscrit', 'en_cours', 'termine', 'annule')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stagiaire_id, classe_id)
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('enseignant', 'stagiaire')),
  token TEXT NOT NULL UNIQUE,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE CASCADE,
  stagiaire_id UUID REFERENCES public.stagiaires(id) ON DELETE CASCADE,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  utilisee BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  expediteur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinataire_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type_destinataire TEXT CHECK (type_destinataire IN ('individuel', 'collectif')),
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  type_fichier TEXT,
  url TEXT NOT NULL,
  taille INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (créer uniquement si elles n'existent pas)
DO $$ BEGIN
  CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les stagiaires"
  ON public.stagiaires FOR ALL
  USING (has_role(auth.uid(), 'gestionnaire') OR has_role(auth.uid(), 'proprietaire'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Stagiaires peuvent voir leur propre profil"
  ON public.stagiaires FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Enseignants peuvent voir les stagiaires de leurs classes"
  ON public.stagiaires FOR SELECT
  USING (
    has_role(auth.uid(), 'enseignant') AND
    EXISTS (
      SELECT 1 FROM public.inscriptions i
      JOIN public.classes c ON c.id = i.classe_id
      JOIN public.modules m ON m.classe_id = c.id
      JOIN public.affectations a ON a.module_id = m.id
      JOIN public.enseignants e ON e.id = a.enseignant_id
      WHERE i.stagiaire_id = stagiaires.id AND e.user_id = auth.uid()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les inscriptions"
  ON public.inscriptions FOR ALL
  USING (has_role(auth.uid(), 'gestionnaire') OR has_role(auth.uid(), 'proprietaire'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Stagiaires peuvent voir leurs inscriptions"
  ON public.inscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stagiaires s
      WHERE s.id = inscriptions.stagiaire_id AND s.user_id = auth.uid()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Enseignants peuvent voir les inscriptions de leurs classes"
  ON public.inscriptions FOR SELECT
  USING (
    has_role(auth.uid(), 'enseignant') AND
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.modules m ON m.classe_id = c.id
      JOIN public.affectations a ON a.module_id = m.id
      JOIN public.enseignants e ON e.id = a.enseignant_id
      WHERE c.id = inscriptions.classe_id AND e.user_id = auth.uid()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les invitations"
  ON public.invitations FOR ALL
  USING (has_role(auth.uid(), 'gestionnaire') OR has_role(auth.uid(), 'proprietaire'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Gestionnaires et proprietaires peuvent voir tous les messages"
  ON public.messages FOR SELECT
  USING (has_role(auth.uid(), 'gestionnaire') OR has_role(auth.uid(), 'proprietaire'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Utilisateurs peuvent voir leurs messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = expediteur_id OR auth.uid() = destinataire_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Messages collectifs visibles par les membres de la classe"
  ON public.messages FOR SELECT
  USING (
    type_destinataire = 'collectif' AND
    (
      EXISTS (
        SELECT 1 FROM public.inscriptions i
        JOIN public.stagiaires s ON s.id = i.stagiaire_id
        WHERE i.classe_id = messages.classe_id AND s.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.modules m
        JOIN public.affectations a ON a.module_id = m.id
        JOIN public.enseignants e ON e.id = a.enseignant_id
        WHERE m.classe_id = messages.classe_id AND e.user_id = auth.uid()
      )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Enseignants et gestionnaires peuvent créer des messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'enseignant') OR 
    has_role(auth.uid(), 'gestionnaire') OR 
    has_role(auth.uid(), 'proprietaire')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Stagiaires peuvent répondre aux messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'stagiaire') AND
    auth.uid() = expediteur_id
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Gestionnaires et proprietaires peuvent gérer les documents"
  ON public.documents FOR ALL
  USING (has_role(auth.uid(), 'gestionnaire') OR has_role(auth.uid(), 'proprietaire'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Enseignants peuvent voir et créer des documents pour leurs classes"
  ON public.documents FOR SELECT
  USING (
    has_role(auth.uid(), 'enseignant') AND
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.affectations a ON a.module_id = m.id
      JOIN public.enseignants e ON e.id = a.enseignant_id
      WHERE (m.classe_id = documents.classe_id OR m.id = documents.module_id)
      AND e.user_id = auth.uid()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Enseignants peuvent uploader des documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'enseignant') AND auth.uid() = uploaded_by
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Stagiaires peuvent voir les documents de leurs classes"
  ON public.documents FOR SELECT
  USING (
    has_role(auth.uid(), 'stagiaire') AND
    EXISTS (
      SELECT 1 FROM public.inscriptions i
      JOIN public.stagiaires s ON s.id = i.stagiaire_id
      JOIN public.modules m ON m.classe_id = i.classe_id
      WHERE s.user_id = auth.uid() 
      AND (m.classe_id = documents.classe_id OR m.id = documents.module_id)
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_stagiaires_updated_at ON public.stagiaires;
CREATE TRIGGER update_stagiaires_updated_at
BEFORE UPDATE ON public.stagiaires
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_inscriptions_updated_at ON public.inscriptions;
CREATE TRIGGER update_inscriptions_updated_at
BEFORE UPDATE ON public.inscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Créer un bucket storage pour les documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;