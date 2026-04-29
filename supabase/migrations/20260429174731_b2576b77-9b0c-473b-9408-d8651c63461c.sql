-- Table des codes d'invitation pour la démo
CREATE TABLE public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitation_codes_code ON public.invitation_codes(code) WHERE is_active = true;

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitation codes"
ON public.invitation_codes
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role) 
  OR has_role(auth.uid(), 'proprietaire'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrateur'::app_role) 
  OR has_role(auth.uid(), 'proprietaire'::app_role)
);

CREATE TRIGGER update_invitation_codes_updated_at
BEFORE UPDATE ON public.invitation_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des sessions démo (avec expiration 24h)
CREATE TABLE public.demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  invitation_code_id UUID REFERENCES public.invitation_codes(id) ON DELETE SET NULL,
  captcha_verified BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_expired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_sessions_expires ON public.demo_sessions(expires_at, is_expired);

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view demo sessions"
ON public.demo_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrateur'::app_role) 
  OR has_role(auth.uid(), 'proprietaire'::app_role)
);

-- Insérer un code d'invitation par défaut pour démarrer
INSERT INTO public.invitation_codes (code, description, max_uses, is_active)
VALUES ('EXED-DEMO-2025', 'Code par défaut généré automatiquement - à modifier ou désactiver', NULL, true);