-- Ajouter les nouveaux rôles à l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'responsable_scolarite';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'direction_financiere';