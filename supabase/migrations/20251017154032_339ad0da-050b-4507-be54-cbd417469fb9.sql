-- Add missing role values to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gestionnaire';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'lecteur';