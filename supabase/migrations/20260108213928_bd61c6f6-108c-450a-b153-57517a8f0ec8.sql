-- Ajouter les rôles manquants à l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'proprietaire';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'commercial';