-- Ajouter la colonne user_id à la table enseignants pour permettre la connexion
ALTER TABLE public.enseignants 
ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;