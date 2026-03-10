-- Create enum for currencies
CREATE TYPE devise AS ENUM ('EUR', 'MAD');

-- Create table for exchange rates
CREATE TABLE taux_change (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taux_eur_to_mad NUMERIC(10,4) NOT NULL,
  date_application DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT taux_positif CHECK (taux_eur_to_mad > 0)
);

-- Enable RLS on taux_change
ALTER TABLE taux_change ENABLE ROW LEVEL SECURITY;

-- RLS policies for taux_change
CREATE POLICY "Admins and financiers can manage exchange rates"
ON taux_change
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role) OR 
  has_role(auth.uid(), 'financier'::app_role)
);

CREATE POLICY "All authenticated users can view exchange rates"
ON taux_change
FOR SELECT
TO authenticated
USING (true);

-- Add currency columns to financial tables
ALTER TABLE factures ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE factures ADD COLUMN montant_total_devise_origine NUMERIC(10,2);
ALTER TABLE factures ADD COLUMN montant_paye_devise_origine NUMERIC(10,2);

ALTER TABLE paiements ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE paiements ADD COLUMN montant_devise_origine NUMERIC(10,2);

ALTER TABLE devis ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE devis ADD COLUMN montant_total_devise_origine NUMERIC(10,2);
ALTER TABLE devis ADD COLUMN montant_ht_devise_origine NUMERIC(10,2);

ALTER TABLE bons_commande ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE bons_commande ADD COLUMN montant_total_devise_origine NUMERIC(10,2);

ALTER TABLE budget_items ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE budget_items ADD COLUMN montant_prevu_devise_origine NUMERIC(10,2);
ALTER TABLE budget_items ADD COLUMN montant_realise_devise_origine NUMERIC(10,2);

ALTER TABLE programme_couts ADD COLUMN devise devise DEFAULT 'EUR';
ALTER TABLE programme_couts ADD COLUMN montant_devise_origine NUMERIC(10,2);

-- Create trigger for updating taux_change updated_at
CREATE TRIGGER update_taux_change_updated_at
  BEFORE UPDATE ON taux_change
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert initial exchange rate (example: 1 EUR = 10.80 MAD)
INSERT INTO taux_change (taux_eur_to_mad, notes, date_application)
VALUES (10.80, 'Taux de change initial', CURRENT_DATE);

-- Create function to get current exchange rate
CREATE OR REPLACE FUNCTION get_current_exchange_rate()
RETURNS NUMERIC(10,4)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT taux_eur_to_mad
  FROM taux_change
  WHERE date_application <= CURRENT_DATE
  ORDER BY date_application DESC, created_at DESC
  LIMIT 1;
$$;

-- Create function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
  p_montant NUMERIC,
  p_from_devise devise,
  p_to_devise devise
)
RETURNS NUMERIC
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux NUMERIC(10,4);
  v_result NUMERIC;
BEGIN
  IF p_from_devise = p_to_devise THEN
    RETURN p_montant;
  END IF;
  
  v_taux := get_current_exchange_rate();
  
  IF p_from_devise = 'EUR' AND p_to_devise = 'MAD' THEN
    v_result := p_montant * v_taux;
  ELSIF p_from_devise = 'MAD' AND p_to_devise = 'EUR' THEN
    v_result := p_montant / v_taux;
  END IF;
  
  RETURN ROUND(v_result, 2);
END;
$$;