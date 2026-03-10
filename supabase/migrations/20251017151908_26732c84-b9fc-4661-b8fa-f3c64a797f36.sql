-- Créer les types énumérés
CREATE TYPE public.app_role AS ENUM ('proprietaire', 'utilisateur');
CREATE TYPE public.programme_type AS ENUM ('INTER', 'INTRA');
CREATE TYPE public.remuneration_mode AS ENUM ('vacation', 'prestation_service', 'salarie', 'autre');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table des rôles utilisateurs
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si un utilisateur a un rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Table des programmes de formation
CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  code_description TEXT,
  type programme_type NOT NULL,
  date_debut DATE,
  date_fin DATE,
  is_retroactive BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

-- Table des classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  sous_code TEXT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Table des enseignants
CREATE TABLE public.enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  pays_residence TEXT,
  thematiques TEXT[],
  mode_remuneration remuneration_mode,
  date_debut_sejour DATE,
  date_fin_sejour DATE,
  adresse_residence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.enseignants ENABLE ROW LEVEL SECURITY;

-- Table des modules (cours/interventions)
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  code TEXT NOT NULL,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  duree_heures DECIMAL(5,2),
  invitation_envoyee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Table des affectations (enseignants aux modules)
CREATE TABLE public.affectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE CASCADE NOT NULL,
  confirmee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, enseignant_id)
);

ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;

-- Table des alertes
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  titre TEXT NOT NULL,
  description TEXT,
  enseignant_id UUID REFERENCES public.enseignants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Fonction et trigger pour créer le profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers pour updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.programmes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.enseignants FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.affectations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Politiques RLS pour profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politiques RLS pour user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Proprietaires can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'proprietaire'));

-- Politiques RLS pour programmes
CREATE POLICY "Authenticated users can view programmes"
  ON public.programmes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create programmes"
  ON public.programmes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update programmes"
  ON public.programmes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete programmes"
  ON public.programmes FOR DELETE
  TO authenticated
  USING (true);

-- Politiques RLS pour classes
CREATE POLICY "Authenticated users can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (true);

-- Politiques RLS pour enseignants
CREATE POLICY "Authenticated users can view enseignants"
  ON public.enseignants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage enseignants"
  ON public.enseignants FOR ALL
  TO authenticated
  USING (true);

-- Politiques RLS pour modules
CREATE POLICY "Authenticated users can view modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (true);

-- Politiques RLS pour affectations
CREATE POLICY "Authenticated users can view affectations"
  ON public.affectations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage affectations"
  ON public.affectations FOR ALL
  TO authenticated
  USING (true);

-- Politiques RLS pour alerts
CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage alerts"
  ON public.alerts FOR ALL
  TO authenticated
  USING (true);