
-- Re-apply idempotently
ALTER VIEW public.kpis_financiers_globaux SET (security_invoker = true);
ALTER VIEW public.kpis_financiers_programme SET (security_invoker = true);
ALTER VIEW public.kpis_financiers_classe SET (security_invoker = true);

-- Contracts: drop ALL existing policies on these tables, then recreate properly
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('modeles_contrat', 'contrats_lignes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Admins and financiers manage contract templates"
  ON public.modeles_contrat FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role) OR
    public.has_role(auth.uid(), 'financier'::app_role) OR
    public.has_role(auth.uid(), 'direction_financiere'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role) OR
    public.has_role(auth.uid(), 'financier'::app_role) OR
    public.has_role(auth.uid(), 'direction_financiere'::app_role)
  );

CREATE POLICY "Authenticated users can view contract templates"
  ON public.modeles_contrat FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and financiers manage contract lines"
  ON public.contrats_lignes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role) OR
    public.has_role(auth.uid(), 'financier'::app_role) OR
    public.has_role(auth.uid(), 'direction_financiere'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role) OR
    public.has_role(auth.uid(), 'financier'::app_role) OR
    public.has_role(auth.uid(), 'direction_financiere'::app_role)
  );

CREATE POLICY "Authenticated users can view contract lines"
  ON public.contrats_lignes FOR SELECT
  TO authenticated
  USING (true);

-- enquetes_reponses: drop existing SELECT policies and recreate
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enquetes_reponses' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enquetes_reponses', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Stagiaires view own responses, staff view all"
  ON public.enquetes_reponses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrateur'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role) OR
    public.has_role(auth.uid(), 'responsable_scolarite'::app_role) OR
    public.has_role(auth.uid(), 'direction_financiere'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.stagiaires s
      WHERE s.id = enquetes_reponses.stagiaire_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les documents" ON storage.objects;
