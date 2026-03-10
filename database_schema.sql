-- ============================================
-- EXED MANAGER - Script de création de base de données
-- Version: 1.0
-- Compatible: PostgreSQL 14+ / Supabase
-- ============================================

-- ============================================
-- 1. TYPES ÉNUMÉRÉS
-- ============================================

CREATE TYPE app_role AS ENUM (
  'administrateur',
  'gestionnaire_scolarite',
  'financier',
  'collaborateur',
  'enseignant',
  'stagiaire',
  'responsable_scolarite',
  'direction_financiere',
  'chauffeur',
  'proprietaire',
  'commercial'
);

CREATE TYPE devise AS ENUM ('EUR', 'MAD');

CREATE TYPE mode_paiement AS ENUM ('virement', 'cheque', 'especes', 'carte', 'autre');

CREATE TYPE programme_type AS ENUM ('INTER', 'INTRA');

CREATE TYPE remuneration_mode AS ENUM ('vacation', 'prestation_service', 'salarie', 'autre');

CREATE TYPE statut_facture AS ENUM ('brouillon', 'envoyee', 'payee', 'partielle', 'annulee');

CREATE TYPE type_enquete AS ENUM ('a_chaud', 'a_froid');

CREATE TYPE type_question AS ENUM (
  'texte_libre',
  'choix_unique',
  'choix_multiple',
  'echelle_5',
  'echelle_10',
  'oui_non',
  'note_20',
  'matrice'
);

CREATE TYPE unite_duree AS ENUM ('heures', 'jours');

-- ============================================
-- 2. FONCTIONS UTILITAIRES
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT taux_eur_to_mad
  FROM taux_change
  WHERE date_application <= CURRENT_DATE
  ORDER BY date_application DESC, created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.convert_currency(
  p_montant numeric,
  p_from_devise devise,
  p_to_devise devise
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_discussion_participant(_user_id uuid, _discussion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discussion_participants
    WHERE user_id = _user_id
      AND discussion_id = _discussion_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_gestionnaire_for_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programme_gestionnaires
    WHERE gestionnaire_user_id = _user_id
      AND programme_id = _programme_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_programme(_user_id uuid, _programme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    has_role(_user_id, 'administrateur'::app_role) OR
    has_role(_user_id, 'proprietaire'::app_role) OR
    has_role(_user_id, 'responsable_scolarite'::app_role) OR
    is_gestionnaire_for_programme(_user_id, _programme_id)
$$;

CREATE OR REPLACE FUNCTION public.enseignant_can_see_stagiaire(_enseignant_user_id uuid, _stagiaire_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM inscriptions i
    JOIN classes c ON c.id = i.classe_id
    JOIN modules m ON m.classe_id = c.id
    JOIN affectations a ON a.module_id = m.id
    JOIN enseignants e ON e.id = a.enseignant_id
    WHERE i.stagiaire_id = _stagiaire_id
      AND e.user_id = _enseignant_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.chauffeur_can_view_enseignant(enseignant_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.transferts t
    JOIN public.chauffeurs c ON c.id = t.chauffeur_id
    WHERE t.enseignant_id = enseignant_uuid
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_classes_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_programmes_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
    IF NEW.date_debut > NEW.date_fin THEN
      RAISE EXCEPTION 'La date de début ne peut pas être après la date de fin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_facture_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  total_paye DECIMAL(10,2);
  montant_facture DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(montant), 0) INTO total_paye
  FROM paiements
  WHERE facture_id = NEW.facture_id;

  SELECT montant_total INTO montant_facture
  FROM factures
  WHERE id = NEW.facture_id;

  UPDATE factures
  SET 
    montant_paye = total_paye,
    statut = CASE
      WHEN total_paye = 0 THEN 'envoyee'::statut_facture
      WHEN total_paye < montant_facture THEN 'partielle'::statut_facture
      WHEN total_paye >= montant_facture THEN 'payee'::statut_facture
    END
  WHERE id = NEW.facture_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_devoir_note_to_notes_stagiaires()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.note IS NOT NULL AND (OLD IS NULL OR OLD.note IS DISTINCT FROM NEW.note) THEN
    INSERT INTO public.notes_stagiaires (
      stagiaire_id,
      devoir_id,
      soumission_devoir_id,
      note,
      commentaire,
      type_source
    ) VALUES (
      NEW.stagiaire_id,
      NEW.devoir_id,
      NEW.id,
      NEW.note,
      NEW.commentaire_enseignant,
      'devoir'
    )
    ON CONFLICT (soumission_devoir_id) 
    WHERE soumission_devoir_id IS NOT NULL
    DO UPDATE SET
      note = EXCLUDED.note,
      commentaire = EXCLUDED.commentaire,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_programme_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  action_type text;
  v_programme_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  IF TG_TABLE_NAME = 'programmes' THEN
    v_programme_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'classes' THEN
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id);
  ELSIF TG_TABLE_NAME = 'modules' THEN
    SELECT c.programme_id INTO v_programme_id
    FROM classes c
    WHERE c.id = COALESCE(NEW.classe_id, OLD.classe_id);
  ELSIF TG_TABLE_NAME = 'programme_couts' THEN
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id);
  ELSE
    v_programme_id := COALESCE(NEW.programme_id, OLD.programme_id, NEW.id, OLD.id);
  END IF;

  IF v_programme_id IS NOT NULL THEN
    INSERT INTO programme_audit_log (
      programme_id,
      modified_by,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      description
    ) VALUES (
      v_programme_id,
      auth.uid(),
      action_type,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      TG_OP || ' on ' || TG_TABLE_NAME
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_restauration_to_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_classe_id UUID;
  v_programme_id UUID;
  v_prix_unitaire NUMERIC;
  v_cout_total NUMERIC;
  v_module_titre TEXT;
  v_offre_label TEXT;
  v_existing_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM budget_items
    WHERE classe_id = (
      SELECT m.classe_id FROM modules m WHERE m.id = OLD.module_id
    )
    AND categorie = 'Restauration'
    AND description LIKE '%Module: ' || OLD.module_id || '%';
    
    RETURN OLD;
  END IF;

  SELECT m.classe_id, m.titre, c.programme_id
  INTO v_classe_id, v_module_titre, v_programme_id
  FROM modules m
  JOIN classes c ON c.id = m.classe_id
  WHERE m.id = NEW.module_id;

  SELECT 
    o.prix_unitaire,
    o.prix_unitaire * COALESCE(NEW.nombre_total_unites, 0),
    o.nature_restauration || ' - ' || o.formule_restauration
  INTO v_prix_unitaire, v_cout_total, v_offre_label
  FROM offres_restauration o
  WHERE o.id = NEW.offre_restauration_id;

  IF v_cout_total IS NULL OR v_cout_total = 0 THEN
    DELETE FROM budget_items
    WHERE classe_id = v_classe_id
    AND categorie = 'Restauration'
    AND description LIKE '%Module: ' || NEW.module_id || '%';
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id
  FROM budget_items
  WHERE classe_id = v_classe_id
  AND categorie = 'Restauration'
  AND description LIKE '%Module: ' || NEW.module_id || '%'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE budget_items
    SET 
      montant_prevu = v_cout_total,
      montant_realise = v_cout_total,
      description = v_module_titre || ' (' || v_offre_label || ', ' || COALESCE(NEW.nombre_total_unites, 0) || ' unités) - Module: ' || NEW.module_id,
      updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO budget_items (
      type,
      categorie,
      description,
      montant_prevu,
      montant_realise,
      programme_id,
      classe_id,
      created_by
    ) VALUES (
      'charge',
      'Restauration',
      v_module_titre || ' (' || v_offre_label || ', ' || COALESCE(NEW.nombre_total_unites, 0) || ' unités) - Module: ' || NEW.module_id,
      v_cout_total,
      v_cout_total,
      NULL,
      v_classe_id,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_all_restauration_on_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT e.* FROM etats_restauration e 
    WHERE e.offre_restauration_id = NEW.id
  LOOP
    UPDATE etats_restauration 
    SET updated_at = NOW() 
    WHERE id = r.id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_matching_classe_for_transfer(
  p_enseignant_id uuid,
  p_date_transfert timestamp with time zone
)
RETURNS TABLE(
  classe_id uuid,
  programme_id uuid,
  module_id uuid,
  date_debut timestamp with time zone,
  date_fin timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (m.classe_id)
    m.classe_id,
    c.programme_id,
    m.id as module_id,
    m.date_debut,
    m.date_fin
  FROM modules m
  INNER JOIN affectations a ON a.module_id = m.id
  INNER JOIN classes c ON c.id = m.classe_id
  WHERE a.enseignant_id = p_enseignant_id
    AND m.classe_id IS NOT NULL
    AND (
      (m.date_debut IS NOT NULL AND m.date_fin IS NOT NULL AND 
       m.date_debut <= (p_date_transfert + INTERVAL '7 days') AND
       m.date_fin >= (p_date_transfert - INTERVAL '7 days'))
      OR
      (m.date_debut IS NOT NULL AND 
       m.date_debut BETWEEN (p_date_transfert - INTERVAL '7 days') AND (p_date_transfert + INTERVAL '7 days'))
    )
  ORDER BY m.classe_id, 
    ABS(EXTRACT(EPOCH FROM (m.date_debut - p_date_transfert)))
  LIMIT 1;
END;
$$;

-- ============================================
-- 3. TABLES PRINCIPALES
-- ============================================

-- Profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rôles utilisateurs
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Taux de change
CREATE TABLE public.taux_change (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taux_eur_to_mad NUMERIC(10,4) NOT NULL,
  date_application DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Programmes de formation
CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  type_programme programme_type DEFAULT 'INTER',
  date_debut DATE,
  date_fin DATE,
  budget_global NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gestionnaires de programmes
CREATE TABLE public.programme_gestionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  gestionnaire_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(programme_id, gestionnaire_user_id)
);

-- Coûts des programmes
CREATE TABLE public.programme_couts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  libelle TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  devise devise DEFAULT 'EUR',
  montant_devise_origine NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  sous_code TEXT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modules du catalogue
CREATE TABLE public.module_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT,
  duree_heures INTEGER,
  thematique TEXT,
  objectifs TEXT,
  prerequis TEXT,
  public_cible TEXT,
  methodes_pedagogiques TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modules planifiés
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  module_catalogue_id UUID REFERENCES module_catalogue(id),
  titre TEXT NOT NULL,
  description TEXT,
  date_debut TIMESTAMP WITH TIME ZONE,
  date_fin TIMESTAMP WITH TIME ZONE,
  lieu TEXT,
  salle TEXT,
  capacite INTEGER,
  statut TEXT DEFAULT 'planifie',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lien programme-modules
CREATE TABLE public.programme_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  module_catalogue_id UUID NOT NULL REFERENCES module_catalogue(id) ON DELETE CASCADE,
  ordre INTEGER DEFAULT 0,
  obligatoire BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(programme_id, module_catalogue_id)
);

-- Enseignants
CREATE TABLE public.enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  photo_url TEXT,
  thematiques TEXT[],
  mode_remuneration remuneration_mode,
  raison_sociale TEXT,
  numero_identification TEXT,
  pays_residence TEXT,
  adresse_residence TEXT,
  date_debut_sejour DATE,
  date_fin_sejour DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lien module-enseignants
CREATE TABLE public.module_enseignants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  role_enseignant TEXT DEFAULT 'principal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, enseignant_id)
);

-- Affectations enseignants
CREATE TABLE public.affectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enseignant_id UUID NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  confirmee BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, enseignant_id)
);

-- Stagiaires
CREATE TABLE public.stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  photo_url TEXT,
  date_naissance DATE,
  nationalite TEXT,
  entreprise TEXT,
  fonction TEXT,
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  pays TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inscriptions
CREATE TABLE public.inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date_inscription DATE DEFAULT CURRENT_DATE,
  statut TEXT DEFAULT 'inscrit',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stagiaire_id, classe_id)
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  adresse TEXT,
  ville TEXT,
  code_postal TEXT,
  pays TEXT,
  secteur_activite TEXT,
  site_web TEXT,
  contact_principal_nom TEXT,
  contact_principal_email TEXT,
  contact_principal_telephone TEXT,
  contact_principal_fonction TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prospects
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  entreprise TEXT,
  fonction TEXT,
  source TEXT,
  statut TEXT DEFAULT 'nouveau',
  notes TEXT,
  programmes_interets TEXT[],
  date_premier_contact DATE DEFAULT CURRENT_DATE,
  date_dernier_contact DATE,
  probabilite_conversion INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actions prospects
CREATE TABLE public.prospect_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  type_action TEXT NOT NULL,
  date_action TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  resultat TEXT,
  prochaine_action TEXT,
  date_prochaine_action DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commentaires prospects
CREATE TABLE public.prospect_commentaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devis
CREATE TABLE public.devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_devis TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id),
  prospect_id UUID REFERENCES prospects(id),
  programme_id UUID REFERENCES programmes(id),
  date_emission DATE NOT NULL,
  date_validite DATE NOT NULL,
  description TEXT,
  montant_ht NUMERIC(12,2) DEFAULT 0,
  tva NUMERIC(5,2) DEFAULT 20,
  montant_total NUMERIC(12,2) DEFAULT 0,
  devise devise DEFAULT 'EUR',
  montant_ht_devise_origine NUMERIC(12,2),
  montant_total_devise_origine NUMERIC(12,2),
  statut TEXT DEFAULT 'brouillon',
  conditions TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lignes de devis
CREATE TABLE public.lignes_devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite INTEGER DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL,
  montant_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historique des devis
CREATE TABLE public.devis_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  ancien_montant NUMERIC(12,2),
  nouveau_montant NUMERIC(12,2),
  commentaire TEXT,
  modified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bons de commande
CREATE TABLE public.bons_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_bc TEXT NOT NULL UNIQUE,
  devis_id UUID REFERENCES devis(id),
  devis_parent_id UUID REFERENCES devis(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id),
  stagiaire_id UUID REFERENCES stagiaires(id) ON DELETE SET NULL,
  programme_id UUID REFERENCES programmes(id),
  montant_total NUMERIC(12,2) NOT NULL,
  montant_facture NUMERIC(12,2) DEFAULT 0,
  montant_restant NUMERIC(12,2),
  montant_part NUMERIC(12,2),
  pourcentage_part NUMERIC(5,2),
  type_payeur TEXT,
  mode_repartition TEXT,
  devise devise DEFAULT 'EUR',
  montant_total_devise_origine NUMERIC(12,2),
  statut TEXT DEFAULT 'en_attente',
  est_cloture BOOLEAN DEFAULT false,
  date_emission DATE NOT NULL,
  date_livraison_prevue DATE,
  conditions TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lignes de bon de commande
CREATE TABLE public.lignes_bon_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite INTEGER DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL,
  montant_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historique des bons de commande
CREATE TABLE public.bons_commande_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  ancien_montant NUMERIC(12,2),
  nouveau_montant NUMERIC(12,2),
  motif TEXT,
  commentaire TEXT,
  modified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modèles de facture
CREATE TABLE public.modeles_facture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  en_tete TEXT,
  pied_page TEXT,
  mentions_legales TEXT,
  couleur_principale TEXT DEFAULT '#000000',
  est_defaut BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Factures
CREATE TABLE public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_facture TEXT NOT NULL UNIQUE,
  bon_commande_id UUID REFERENCES bons_commande(id),
  stagiaire_id UUID REFERENCES stagiaires(id),
  classe_id UUID REFERENCES classes(id),
  modele_facture_id UUID REFERENCES modeles_facture(id),
  montant_total NUMERIC(12,2) NOT NULL,
  montant_paye NUMERIC(12,2) DEFAULT 0,
  devise devise DEFAULT 'EUR',
  montant_total_devise_origine NUMERIC(12,2),
  montant_paye_devise_origine NUMERIC(12,2),
  statut statut_facture DEFAULT 'brouillon',
  date_emission DATE NOT NULL,
  date_echeance DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paiements
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  montant NUMERIC(12,2) NOT NULL,
  devise devise DEFAULT 'EUR',
  montant_devise_origine NUMERIC(12,2),
  mode_paiement mode_paiement DEFAULT 'virement',
  date_paiement DATE NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relances
CREATE TABLE public.relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  type_relance TEXT NOT NULL,
  date_relance TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contenu TEXT,
  reponse TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget items
CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  categorie TEXT NOT NULL,
  description TEXT,
  montant_prevu NUMERIC(12,2) DEFAULT 0,
  montant_realise NUMERIC(12,2) DEFAULT 0,
  devise devise DEFAULT 'EUR',
  montant_prevu_devise_origine NUMERIC(12,2),
  montant_realise_devise_origine NUMERIC(12,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modèles de contrat
CREATE TABLE public.modeles_contrat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_contrat TEXT NOT NULL,
  description TEXT,
  template_url TEXT,
  champs_variables JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contrats d'intervention
CREATE TABLE public.contrats_intervention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES programmes(id),
  modele_contrat_id UUID REFERENCES modeles_contrat(id),
  objet TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  montant NUMERIC(12,2),
  devise devise DEFAULT 'EUR',
  quantite NUMERIC(10,2),
  unite TEXT,
  prix_unitaire NUMERIC(12,2),
  document_url TEXT,
  statut_validation TEXT DEFAULT 'brouillon',
  valide_par UUID REFERENCES profiles(id),
  valide_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lignes de contrat
CREATE TABLE public.contrats_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id UUID NOT NULL REFERENCES contrats_intervention(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES programmes(id),
  module_ids TEXT[],
  designation TEXT NOT NULL,
  quantite NUMERIC(10,2) DEFAULT 1,
  unite TEXT NOT NULL,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  montant_total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assiduité
CREATE TABLE public.assiduite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  date_session TIMESTAMP WITH TIME ZONE NOT NULL,
  present BOOLEAN DEFAULT false,
  retard_minutes INTEGER DEFAULT 0,
  justification TEXT,
  document_justificatif_url TEXT,
  qr_code_scan_time TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stagiaire_id, module_id, date_session)
);

-- QR Codes assiduité
CREATE TABLE public.qr_codes_assiduite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  date_session DATE NOT NULL,
  code_secret TEXT NOT NULL,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devoirs
CREATE TABLE public.devoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  type_devoir TEXT NOT NULL,
  date_ouverture TIMESTAMP WITH TIME ZONE NOT NULL,
  date_limite TIMESTAMP WITH TIME ZONE NOT NULL,
  coefficient NUMERIC(3,2) DEFAULT 1,
  points_max INTEGER,
  accepte_fichiers BOOLEAN DEFAULT true,
  formats_acceptes TEXT[],
  taille_max_mb INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Soumissions de devoirs
CREATE TABLE public.soumissions_devoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id UUID NOT NULL REFERENCES devoirs(id) ON DELETE CASCADE,
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  contenu TEXT,
  fichier_url TEXT,
  nom_fichier TEXT,
  date_soumission TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note NUMERIC(5,2),
  commentaire_enseignant TEXT,
  statut TEXT DEFAULT 'soumis',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(devoir_id, stagiaire_id)
);

-- Évaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  type_evaluation TEXT NOT NULL,
  date_evaluation DATE,
  coefficient NUMERIC(3,2) DEFAULT 1,
  note_max NUMERIC(5,2) DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes des stagiaires
CREATE TABLE public.notes_stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE,
  devoir_id UUID REFERENCES devoirs(id) ON DELETE CASCADE,
  soumission_devoir_id UUID REFERENCES soumissions_devoirs(id) ON DELETE CASCADE,
  note NUMERIC(5,2),
  commentaire TEXT,
  type_source TEXT DEFAULT 'evaluation',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes consolidées
CREATE TABLE public.notes_consolidees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  moyenne NUMERIC(5,2),
  appreciation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stagiaire_id, classe_id, module_id)
);

-- Résultats stagiaires
CREATE TABLE public.resultats_stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  moyenne_generale NUMERIC(5,2),
  rang INTEGER,
  mention TEXT,
  decision TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stagiaire_id, classe_id)
);

-- Progression stagiaires
CREATE TABLE public.progression_stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  progression NUMERIC(5,2) DEFAULT 0,
  date_debut TIMESTAMP WITH TIME ZONE,
  date_fin TIMESTAMP WITH TIME ZONE,
  statut TEXT DEFAULT 'non_commence',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stagiaire_id, module_id)
);

-- Ressources pédagogiques
CREATE TABLE public.ressources_pedagogiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  module_catalogue_id UUID REFERENCES module_catalogue(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  type_ressource TEXT NOT NULL,
  url TEXT NOT NULL,
  taille INTEGER,
  ordre INTEGER DEFAULT 0,
  est_visible BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  classe_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  type_fichier TEXT,
  taille INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modèles d'enquête
CREATE TABLE public.modeles_enquete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  type_enquete type_enquete NOT NULL,
  est_actif BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions des modèles d'enquête
CREATE TABLE public.modeles_enquete_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modele_id UUID NOT NULL REFERENCES modeles_enquete(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type_question type_question DEFAULT 'texte_libre',
  options JSONB,
  ordre INTEGER DEFAULT 0,
  obligatoire BOOLEAN DEFAULT false,
  condition_question_id UUID REFERENCES modeles_enquete_questions(id),
  condition_valeur JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration enquêtes par classe
CREATE TABLE public.classes_enquetes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL UNIQUE REFERENCES classes(id) ON DELETE CASCADE,
  modele_enquete_chaud_id UUID REFERENCES modeles_enquete(id),
  modele_enquete_froid_id UUID REFERENCES modeles_enquete(id),
  delai_enquete_froid_jours INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enquêtes
CREATE TABLE public.enquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modele_id UUID REFERENCES modeles_enquete(id),
  programme_id UUID REFERENCES programmes(id),
  classe_id UUID REFERENCES classes(id),
  module_id UUID REFERENCES modules(id),
  titre TEXT NOT NULL,
  description TEXT,
  type_enquete type_enquete NOT NULL,
  date_debut TIMESTAMP WITH TIME ZONE,
  date_fin TIMESTAMP WITH TIME ZONE,
  date_session DATE,
  est_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions d'enquête
CREATE TABLE public.enquetes_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id UUID NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type_question type_question DEFAULT 'texte_libre',
  options JSONB,
  ordre INTEGER DEFAULT 0,
  obligatoire BOOLEAN DEFAULT false,
  condition_question_id UUID REFERENCES enquetes_questions(id),
  condition_valeur JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Réponses aux enquêtes
CREATE TABLE public.enquetes_reponses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquete_id UUID NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(enquete_id, stagiaire_id)
);

-- Détails des réponses
CREATE TABLE public.enquetes_reponses_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reponse_id UUID NOT NULL REFERENCES enquetes_reponses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES enquetes_questions(id) ON DELETE CASCADE,
  valeur_texte TEXT,
  valeur_numerique NUMERIC(5,2),
  valeur_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur_id UUID NOT NULL,
  destinataire_id UUID,
  classe_id UUID REFERENCES classes(id),
  type_destinataire TEXT,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussions
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  type_discussion TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants aux discussions
CREATE TABLE public.discussion_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Messages de discussion
CREATE TABLE public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags de discussion
CREATE TABLE public.discussion_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  couleur TEXT DEFAULT '#6366f1',
  type_tag TEXT DEFAULT 'custom',
  programme_id UUID REFERENCES programmes(id),
  classe_id UUID REFERENCES classes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lien discussions-tags
CREATE TABLE public.discussions_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES discussion_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discussion_id, tag_id)
);

-- Alertes
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  titre TEXT NOT NULL,
  description TEXT,
  enseignant_id UUID REFERENCES enseignants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  enseignant_id UUID REFERENCES enseignants(id),
  stagiaire_id UUID REFERENCES stagiaires(id),
  chauffeur_id UUID REFERENCES chauffeurs(id),
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  utilisee BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit des programmes
CREATE TABLE public.programme_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  modified_by UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chauffeurs
CREATE TABLE public.chauffeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  disponible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Véhicules
CREATE TABLE public.vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation TEXT NOT NULL UNIQUE,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  couleur TEXT,
  nombre_places INTEGER DEFAULT 4,
  type_vehicule TEXT DEFAULT 'berline',
  disponible BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hôtels
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT,
  ville TEXT NOT NULL,
  pays TEXT DEFAULT 'France',
  etoiles INTEGER,
  email TEXT,
  telephone TEXT,
  telephone_indicatif TEXT DEFAULT '+33',
  site_web TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tarifs transfert
CREATE TABLE public.tarifs_transfert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origine TEXT NOT NULL,
  destination TEXT NOT NULL,
  prix NUMERIC(10,2) NOT NULL,
  devise devise DEFAULT 'EUR',
  type_trajet TEXT DEFAULT 'simple',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transferts
CREATE TABLE public.transferts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id UUID REFERENCES enseignants(id) ON DELETE CASCADE,
  chauffeur_id UUID REFERENCES chauffeurs(id),
  vehicule_id UUID REFERENCES vehicules(id),
  programme_id UUID REFERENCES programmes(id),
  classe_id UUID REFERENCES classes(id),
  type_transfert TEXT NOT NULL,
  origine TEXT NOT NULL,
  destination TEXT NOT NULL,
  date_transfert TIMESTAMP WITH TIME ZONE NOT NULL,
  heure_prise_en_charge TIME,
  statut TEXT DEFAULT 'planifie',
  prix NUMERIC(10,2),
  devise devise DEFAULT 'EUR',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bénéficiaires des transferts
CREATE TABLE public.transfert_beneficiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfert_id UUID NOT NULL REFERENCES transferts(id) ON DELETE CASCADE,
  enseignant_id UUID REFERENCES enseignants(id) ON DELETE CASCADE,
  stagiaire_id UUID REFERENCES stagiaires(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offres de restauration
CREATE TABLE public.offres_restauration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nature_restauration TEXT NOT NULL,
  formule_restauration TEXT NOT NULL,
  prix_unitaire NUMERIC(10,2) NOT NULL,
  devise devise DEFAULT 'EUR',
  description TEXT,
  est_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- États de restauration
CREATE TABLE public.etats_restauration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
  offre_restauration_id UUID REFERENCES offres_restauration(id),
  nombre_total_unites INTEGER DEFAULT 0,
  nombre_invites INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. VUES MATÉRIALISÉES / VUES
-- ============================================

-- KPIs financiers par programme
CREATE OR REPLACE VIEW public.kpis_financiers_programme AS
SELECT 
  p.id AS programme_id,
  p.code,
  p.nom,
  COALESCE(SUM(bc.montant_total) FILTER (WHERE bc.statut != 'annule'), 0) AS total_bc,
  COALESCE(SUM(f.montant_total), 0) AS total_facture,
  COALESCE(SUM(f.montant_paye), 0) AS total_encaisse,
  COALESCE(SUM(bi.montant_realise) FILTER (WHERE bi.type = 'charge'), 0) AS total_charges
FROM programmes p
LEFT JOIN bons_commande bc ON bc.programme_id = p.id
LEFT JOIN factures f ON f.bon_commande_id = bc.id
LEFT JOIN budget_items bi ON bi.programme_id = p.id
GROUP BY p.id, p.code, p.nom;

-- KPIs financiers par classe
CREATE OR REPLACE VIEW public.kpis_financiers_classe AS
SELECT 
  c.id AS classe_id,
  c.programme_id,
  c.nom AS classe_nom,
  p.code AS programme_code,
  COALESCE(SUM(f.montant_total), 0) AS total_facture,
  COALESCE(SUM(f.montant_paye), 0) AS total_encaisse,
  COALESCE(SUM(bi.montant_realise) FILTER (WHERE bi.type = 'charge'), 0) AS total_charges
FROM classes c
JOIN programmes p ON p.id = c.programme_id
LEFT JOIN factures f ON f.classe_id = c.id
LEFT JOIN budget_items bi ON bi.classe_id = c.id
GROUP BY c.id, c.programme_id, c.nom, p.code;

-- KPIs financiers globaux
CREATE OR REPLACE VIEW public.kpis_financiers_globaux AS
SELECT 
  COALESCE(SUM(bc.montant_total) FILTER (WHERE bc.statut != 'annule'), 0) AS total_bc,
  COALESCE(SUM(f.montant_total), 0) AS total_facture,
  COALESCE(SUM(f.montant_paye), 0) AS total_encaisse,
  COALESCE(SUM(bi.montant_realise) FILTER (WHERE bi.type = 'charge'), 0) AS total_charges
FROM bons_commande bc
FULL OUTER JOIN factures f ON true
FULL OUTER JOIN budget_items bi ON true;

-- ============================================
-- 5. INDEX
-- ============================================

CREATE INDEX idx_affectations_module ON affectations(module_id);
CREATE INDEX idx_affectations_enseignant ON affectations(enseignant_id);
CREATE INDEX idx_assiduite_module ON assiduite(module_id);
CREATE INDEX idx_assiduite_stagiaire ON assiduite(stagiaire_id);
CREATE INDEX idx_bons_commande_programme ON bons_commande(programme_id);
CREATE INDEX idx_bons_commande_client ON bons_commande(client_id);
CREATE INDEX idx_bons_commande_stagiaire ON bons_commande(stagiaire_id);
CREATE INDEX idx_bons_commande_devis_parent ON bons_commande(devis_parent_id);
CREATE INDEX idx_budget_items_programme ON budget_items(programme_id);
CREATE INDEX idx_budget_items_classe ON budget_items(classe_id);
CREATE INDEX idx_budget_items_type ON budget_items(type);
CREATE INDEX idx_chauffeurs_user ON chauffeurs(user_id);
CREATE INDEX idx_classes_programme ON classes(programme_id);
CREATE INDEX idx_devoirs_module ON devoirs(module_id);
CREATE INDEX idx_devoirs_classe ON devoirs(classe_id);
CREATE INDEX idx_devoirs_date_limite ON devoirs(date_limite);
CREATE INDEX idx_enquetes_programme ON enquetes(programme_id);
CREATE INDEX idx_enquetes_classe ON enquetes(classe_id);
CREATE INDEX idx_enquetes_module ON enquetes(module_id);
CREATE INDEX idx_factures_bc ON factures(bon_commande_id);
CREATE INDEX idx_factures_statut ON factures(statut);
CREATE INDEX idx_inscriptions_stagiaire ON inscriptions(stagiaire_id);
CREATE INDEX idx_inscriptions_classe ON inscriptions(classe_id);
CREATE INDEX idx_modules_classe ON modules(classe_id);
CREATE INDEX idx_notes_stagiaires_stagiaire ON notes_stagiaires(stagiaire_id);
CREATE INDEX idx_notes_stagiaires_evaluation ON notes_stagiaires(evaluation_id);
CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_progression_stagiaire ON progression_stagiaires(stagiaire_id);
CREATE INDEX idx_progression_module ON progression_stagiaires(module_id);
CREATE INDEX idx_prospects_statut ON prospects(statut);
CREATE INDEX idx_soumissions_devoir ON soumissions_devoirs(devoir_id);
CREATE INDEX idx_soumissions_stagiaire ON soumissions_devoirs(stagiaire_id);
CREATE INDEX idx_transferts_enseignant ON transferts(enseignant_id);
CREATE INDEX idx_transferts_chauffeur ON transferts(chauffeur_id);
CREATE INDEX idx_transferts_date ON transferts(date_transfert);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger création profil utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON affectations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_assiduite_updated_at BEFORE UPDATE ON assiduite FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_bons_commande_updated_at BEFORE UPDATE ON bons_commande FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_chauffeurs_updated_at BEFORE UPDATE ON chauffeurs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_classes_enquetes_config_updated_at BEFORE UPDATE ON classes_enquetes_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_contrats_intervention_updated_at BEFORE UPDATE ON contrats_intervention FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_contrats_lignes_updated_at BEFORE UPDATE ON contrats_lignes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devis_updated_at BEFORE UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_devoirs_updated_at BEFORE UPDATE ON devoirs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_discussion_messages_updated_at BEFORE UPDATE ON discussion_messages FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_enquetes_updated_at BEFORE UPDATE ON enquetes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enquetes_reponses_updated_at BEFORE UPDATE ON enquetes_reponses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON enseignants FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_etats_restauration_updated_at BEFORE UPDATE ON etats_restauration FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_inscriptions_updated_at BEFORE UPDATE ON inscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_modeles_contrat_updated_at BEFORE UPDATE ON modeles_contrat FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_modeles_enquete_updated_at BEFORE UPDATE ON modeles_enquete FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modeles_facture_updated_at BEFORE UPDATE ON modeles_facture FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_module_catalogue_updated_at BEFORE UPDATE ON module_catalogue FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_notes_stagiaires_updated_at BEFORE UPDATE ON notes_stagiaires FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_offres_restauration_updated_at BEFORE UPDATE ON offres_restauration FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_programme_couts_updated_at BEFORE UPDATE ON programme_couts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programmes_updated_at BEFORE UPDATE ON programmes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_progression_stagiaires_updated_at BEFORE UPDATE ON progression_stagiaires FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_ressources_pedagogiques_updated_at BEFORE UPDATE ON ressources_pedagogiques FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_soumissions_devoirs_updated_at BEFORE UPDATE ON soumissions_devoirs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_stagiaires_updated_at BEFORE UPDATE ON stagiaires FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_tarifs_transfert_updated_at BEFORE UPDATE ON tarifs_transfert FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_transferts_updated_at BEFORE UPDATE ON transferts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_vehicules_updated_at BEFORE UPDATE ON vehicules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Triggers de validation
CREATE TRIGGER validate_classes_dates_trigger BEFORE INSERT OR UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION validate_classes_dates();
CREATE TRIGGER validate_programmes_dates_trigger BEFORE INSERT OR UPDATE ON programmes FOR EACH ROW EXECUTE FUNCTION validate_programmes_dates();

-- Triggers d'audit
CREATE TRIGGER audit_programmes_trigger AFTER INSERT OR UPDATE OR DELETE ON programmes FOR EACH ROW EXECUTE FUNCTION log_programme_audit();
CREATE TRIGGER audit_classes_trigger AFTER INSERT OR UPDATE OR DELETE ON classes FOR EACH ROW EXECUTE FUNCTION log_programme_audit();
CREATE TRIGGER audit_modules_trigger AFTER INSERT OR UPDATE OR DELETE ON modules FOR EACH ROW EXECUTE FUNCTION log_programme_audit();
CREATE TRIGGER audit_programme_couts_trigger AFTER INSERT OR UPDATE OR DELETE ON programme_couts FOR EACH ROW EXECUTE FUNCTION log_programme_audit();

-- Triggers métier
CREATE TRIGGER trigger_update_facture_statut AFTER INSERT OR UPDATE ON paiements FOR EACH ROW EXECUTE FUNCTION update_facture_statut();
CREATE TRIGGER trigger_sync_devoir_note AFTER INSERT OR UPDATE ON soumissions_devoirs FOR EACH ROW EXECUTE FUNCTION sync_devoir_note_to_notes_stagiaires();
CREATE TRIGGER trigger_sync_restauration_budget AFTER INSERT OR UPDATE OR DELETE ON etats_restauration FOR EACH ROW EXECUTE FUNCTION sync_restauration_to_budget();
CREATE TRIGGER trigger_sync_restauration_price AFTER UPDATE ON offres_restauration FOR EACH ROW EXECUTE FUNCTION sync_all_restauration_on_price_change();

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assiduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_commande_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chauffeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_enquetes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats_intervention ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes_reponses_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE enseignants ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_restauration ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_bon_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_contrat ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_enquete ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_enquete_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modeles_facture ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_enseignants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE offres_restauration ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_couts ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_gestionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_commentaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes_assiduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources_pedagogiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE soumissions_devoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifs_transfert ENABLE ROW LEVEL SECURITY;
ALTER TABLE taux_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfert_beneficiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;

-- Exemples de politiques RLS (à adapter selon vos besoins)
-- Profils
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE POLICY "Admins can manage user roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'administrateur'));
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Programmes
CREATE POLICY "Authenticated users can view programmes" ON programmes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage programmes" ON programmes FOR ALL USING (
  has_role(auth.uid(), 'administrateur') OR 
  has_role(auth.uid(), 'proprietaire') OR
  has_role(auth.uid(), 'responsable_scolarite')
);

-- Classes
CREATE POLICY "Authenticated users can view classes" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and gestionnaires can manage classes" ON classes FOR ALL USING (
  has_role(auth.uid(), 'administrateur') OR 
  has_role(auth.uid(), 'gestionnaire_scolarite') OR
  has_role(auth.uid(), 'responsable_scolarite')
);

-- Modules
CREATE POLICY "Authenticated users can view modules" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and gestionnaires can manage modules" ON modules FOR ALL USING (
  has_role(auth.uid(), 'administrateur') OR 
  has_role(auth.uid(), 'gestionnaire_scolarite')
);

-- Enseignants
CREATE POLICY "Authenticated users can view enseignants" ON enseignants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enseignants can update own profile" ON enseignants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage enseignants" ON enseignants FOR ALL USING (
  has_role(auth.uid(), 'administrateur') OR 
  has_role(auth.uid(), 'gestionnaire_scolarite')
);

-- Stagiaires
CREATE POLICY "Authenticated users can view stagiaires" ON stagiaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "Stagiaires can update own profile" ON stagiaires FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage stagiaires" ON stagiaires FOR ALL USING (
  has_role(auth.uid(), 'administrateur') OR 
  has_role(auth.uid(), 'gestionnaire_scolarite')
);

-- ============================================
-- 8. STORAGE BUCKETS (Supabase)
-- ============================================

-- À exécuter dans la console Supabase ou via l'API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('stagiaire-photos', 'stagiaire-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('enseignant-photos', 'enseignant-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-assets', 'invoice-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('soumissions-devoirs', 'soumissions-devoirs', false);

-- ============================================
-- FIN DU SCRIPT
-- ============================================
