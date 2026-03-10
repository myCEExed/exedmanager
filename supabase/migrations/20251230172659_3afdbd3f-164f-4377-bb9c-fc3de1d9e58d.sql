-- Add stagiaire_id to bons_commande for individual trainee orders
ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS stagiaire_id uuid REFERENCES public.stagiaires(id) ON DELETE SET NULL;

-- Add type_payeur to distinguish who pays
ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS type_payeur text DEFAULT 'client' CHECK (type_payeur IN ('client', 'stagiaire', 'mixte'));

-- Add part info for split payments (percentage or fixed amount)
ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS mode_repartition text CHECK (mode_repartition IN ('total', 'pourcentage', 'montant_fixe'));

ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS pourcentage_part numeric;

ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS montant_part numeric;

-- Add reference to parent devis for tracking split orders
ALTER TABLE public.bons_commande 
ADD COLUMN IF NOT EXISTS devis_parent_id uuid REFERENCES public.devis(id) ON DELETE SET NULL;

-- Make client_id nullable to allow stagiaire-only orders
ALTER TABLE public.bons_commande 
ALTER COLUMN client_id DROP NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bons_commande_stagiaire_id ON public.bons_commande(stagiaire_id);
CREATE INDEX IF NOT EXISTS idx_bons_commande_devis_parent_id ON public.bons_commande(devis_parent_id);

-- Comment for documentation
COMMENT ON COLUMN public.bons_commande.type_payeur IS 'client = tiers payant only, stagiaire = trainee only, mixte = split between both';
COMMENT ON COLUMN public.bons_commande.mode_repartition IS 'total = full amount, pourcentage = percentage of devis, montant_fixe = fixed amount';
COMMENT ON COLUMN public.bons_commande.pourcentage_part IS 'Percentage of the total when mode_repartition is pourcentage';
COMMENT ON COLUMN public.bons_commande.montant_part IS 'Fixed amount when mode_repartition is montant_fixe';