-- Step 1: Add chauffeur role to enum (must be done first and separately)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chauffeur';