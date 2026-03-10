-- 1. Créer le catalogue de modules
CREATE TABLE IF NOT EXISTS module_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  descriptif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Association modules-enseignants dans le catalogue
CREATE TABLE IF NOT EXISTS module_enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_catalogue_id UUID NOT NULL REFERENCES module_catalogue(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_catalogue_id, enseignant_id)
);

-- 3. Créer le type pour l'unité de durée
DO $$ BEGIN
  CREATE TYPE unite_duree AS ENUM ('heures', 'jours');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Association programme-modules avec durée
CREATE TABLE IF NOT EXISTS programme_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  module_catalogue_id UUID NOT NULL REFERENCES module_catalogue(id) ON DELETE RESTRICT,
  duree DECIMAL(10,2) NOT NULL CHECK (duree > 0),
  unite_duree unite_duree NOT NULL,
  ordre INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Modifier modules pour lier au programme_module (pour la planification)
ALTER TABLE modules 
  ADD COLUMN IF NOT EXISTS programme_module_id UUID REFERENCES programme_modules(id) ON DELETE SET NULL;

-- Rendre certains champs nullable pour permettre la transition
ALTER TABLE modules ALTER COLUMN classe_id DROP NOT NULL;
ALTER TABLE modules ALTER COLUMN date_debut DROP NOT NULL;
ALTER TABLE modules ALTER COLUMN date_fin DROP NOT NULL;

-- 6. RLS policies pour module_catalogue
ALTER TABLE module_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and gestionnaires can manage module_catalogue" ON module_catalogue;
CREATE POLICY "Admins and gestionnaires can manage module_catalogue"
ON module_catalogue FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

DROP POLICY IF EXISTS "All authenticated users can view module_catalogue" ON module_catalogue;
CREATE POLICY "All authenticated users can view module_catalogue"
ON module_catalogue FOR SELECT
USING (true);

-- 7. RLS policies pour module_enseignants
ALTER TABLE module_enseignants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and gestionnaires can manage module_enseignants" ON module_enseignants;
CREATE POLICY "Admins and gestionnaires can manage module_enseignants"
ON module_enseignants FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

DROP POLICY IF EXISTS "All authenticated users can view module_enseignants" ON module_enseignants;
CREATE POLICY "All authenticated users can view module_enseignants"
ON module_enseignants FOR SELECT
USING (true);

-- 8. RLS policies pour programme_modules
ALTER TABLE programme_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and gestionnaires can manage programme_modules" ON programme_modules;
CREATE POLICY "Admins and gestionnaires can manage programme_modules"
ON programme_modules FOR ALL
USING (has_role(auth.uid(), 'administrateur'::app_role) OR has_role(auth.uid(), 'gestionnaire_scolarite'::app_role));

DROP POLICY IF EXISTS "All authenticated users can view programme_modules" ON programme_modules;
CREATE POLICY "All authenticated users can view programme_modules"
ON programme_modules FOR SELECT
USING (true);

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_module_catalogue_updated_at ON module_catalogue;
CREATE TRIGGER update_module_catalogue_updated_at
  BEFORE UPDATE ON module_catalogue
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_programme_modules_updated_at ON programme_modules;
CREATE TRIGGER update_programme_modules_updated_at
  BEFORE UPDATE ON programme_modules
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_module_enseignants_module ON module_enseignants(module_catalogue_id);
CREATE INDEX IF NOT EXISTS idx_module_enseignants_enseignant ON module_enseignants(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_programme_modules_programme ON programme_modules(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_modules_module ON programme_modules(module_catalogue_id);
CREATE INDEX IF NOT EXISTS idx_modules_programme_module ON modules(programme_module_id);