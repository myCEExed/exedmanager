-- Add devise column to offres_restauration table
ALTER TABLE public.offres_restauration 
ADD COLUMN devise public.devise NOT NULL DEFAULT 'EUR';