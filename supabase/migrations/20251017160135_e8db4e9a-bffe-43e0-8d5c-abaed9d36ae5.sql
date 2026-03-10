-- Ajouter les rôles enseignant et stagiaire à l'enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'enseignant';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'stagiaire';