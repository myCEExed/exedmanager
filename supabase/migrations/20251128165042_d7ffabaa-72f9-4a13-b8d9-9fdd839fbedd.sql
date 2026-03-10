-- Ajouter les nouveaux champs pour les enseignants
ALTER TABLE enseignants 
ADD COLUMN IF NOT EXISTS raison_sociale text,
ADD COLUMN IF NOT EXISTS numero_identification text;

-- Ajouter les nouveaux champs pour les stagiaires
ALTER TABLE stagiaires
ADD COLUMN IF NOT EXISTS poste_fonction text,
ADD COLUMN IF NOT EXISTS entreprise text,
ADD COLUMN IF NOT EXISTS niveau_etude text,
ADD COLUMN IF NOT EXISTS diplomes jsonb DEFAULT '[]'::jsonb;

-- Créer la table des évaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  classe_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  type_evaluation text NOT NULL CHECK (type_evaluation IN ('intermediaire', 'finale')),
  titre text NOT NULL,
  coefficient numeric DEFAULT 1,
  note_max numeric DEFAULT 20,
  date_evaluation timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer la table des notes des stagiaires
CREATE TABLE IF NOT EXISTS notes_stagiaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
  stagiaire_id uuid REFERENCES stagiaires(id) ON DELETE CASCADE NOT NULL,
  note numeric,
  commentaire text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(evaluation_id, stagiaire_id)
);

-- Créer la table de gestion de l'assiduité
CREATE TABLE IF NOT EXISTS assiduite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  stagiaire_id uuid REFERENCES stagiaires(id) ON DELETE CASCADE NOT NULL,
  date_session timestamp with time zone NOT NULL,
  present boolean DEFAULT false,
  retard_minutes integer DEFAULT 0,
  justification text,
  document_justificatif_url text,
  qr_code_scan_time timestamp with time zone,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer la table des discussions/messagerie
CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  type_discussion text NOT NULL CHECK (type_discussion IN ('generale', 'privee')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer la table des participants aux discussions
CREATE TABLE IF NOT EXISTS discussion_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(discussion_id, user_id)
);

-- Créer la table des messages de discussion
CREATE TABLE IF NOT EXISTS discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  contenu text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer la table pour les offres de restauration
CREATE TABLE IF NOT EXISTS offres_restauration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nature_restauration text NOT NULL,
  formule_restauration text NOT NULL,
  prix_unitaire numeric NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer la table pour les états de restauration par module
CREATE TABLE IF NOT EXISTS etats_restauration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  offre_restauration_id uuid REFERENCES offres_restauration(id) ON DELETE SET NULL,
  nombre_invites integer DEFAULT 0,
  nombre_total_unites integer,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(module_id)
);

-- Ajouter des champs aux modules pour la gestion des lieux
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS type_lieu text CHECK (type_lieu IN ('sur_site', 'hors_site')),
ADD COLUMN IF NOT EXISTS salle text,
ADD COLUMN IF NOT EXISTS lieu_hors_site text,
ADD COLUMN IF NOT EXISTS commentaire_lieu text;

-- Créer une table pour les codes QR d'assiduité
CREATE TABLE IF NOT EXISTS qr_codes_assiduite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  date_session timestamp with time zone NOT NULL,
  code_qr text UNIQUE NOT NULL,
  expire_at timestamp with time zone NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Ajouter un champ statut aux programmes pour les diplômes/certificats
ALTER TABLE programmes
ADD COLUMN IF NOT EXISTS delivrables text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS modele_diplome_url text,
ADD COLUMN IF NOT EXISTS modele_certificat_url text,
ADD COLUMN IF NOT EXISTS modele_attestation_url text;

-- Créer une table pour le statut de réussite des stagiaires
CREATE TABLE IF NOT EXISTS resultats_stagiaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stagiaire_id uuid REFERENCES stagiaires(id) ON DELETE CASCADE NOT NULL,
  classe_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  statut text NOT NULL CHECK (statut IN ('reussite', 'echec', 'en_attente')) DEFAULT 'en_attente',
  note_finale numeric,
  commentaire text,
  diplome_genere boolean DEFAULT false,
  certificat_genere boolean DEFAULT false,
  attestation_genere boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(stagiaire_id, classe_id)
);

-- Créer une table pour les contrats d'intervention des enseignants
CREATE TABLE IF NOT EXISTS contrats_intervention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enseignant_id uuid REFERENCES enseignants(id) ON DELETE CASCADE NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  montant numeric,
  devise devise DEFAULT 'EUR',
  statut_validation text CHECK (statut_validation IN ('en_attente', 'conforme', 'non_conforme')) DEFAULT 'en_attente',
  document_url text,
  valide_par uuid REFERENCES profiles(id),
  valide_at timestamp with time zone,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer des triggers pour updated_at
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_notes_stagiaires_updated_at BEFORE UPDATE ON notes_stagiaires FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_assiduite_updated_at BEFORE UPDATE ON assiduite FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_discussion_messages_updated_at BEFORE UPDATE ON discussion_messages FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_offres_restauration_updated_at BEFORE UPDATE ON offres_restauration FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_etats_restauration_updated_at BEFORE UPDATE ON etats_restauration FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_resultats_stagiaires_updated_at BEFORE UPDATE ON resultats_stagiaires FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_contrats_intervention_updated_at BEFORE UPDATE ON contrats_intervention FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on all new tables
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE assiduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offres_restauration ENABLE ROW LEVEL SECURITY;
ALTER TABLE etats_restauration ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes_assiduite ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats_intervention ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour evaluations
CREATE POLICY "Admins et responsables peuvent gérer les évaluations"
ON evaluations FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants peuvent voir leurs évaluations"
ON evaluations FOR SELECT
USING (has_role(auth.uid(), 'enseignant') AND EXISTS (
  SELECT 1 FROM affectations a JOIN enseignants e ON e.id = a.enseignant_id
  WHERE a.module_id = evaluations.module_id AND e.user_id = auth.uid()
));

CREATE POLICY "Stagiaires peuvent voir leurs évaluations"
ON evaluations FOR SELECT
USING (has_role(auth.uid(), 'stagiaire') AND EXISTS (
  SELECT 1 FROM inscriptions i JOIN stagiaires s ON s.id = i.stagiaire_id
  WHERE i.classe_id = evaluations.classe_id AND s.user_id = auth.uid()
));

-- RLS Policies pour notes_stagiaires
CREATE POLICY "Admins et responsables peuvent gérer les notes"
ON notes_stagiaires FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Enseignants peuvent gérer les notes de leurs modules"
ON notes_stagiaires FOR ALL
USING (has_role(auth.uid(), 'enseignant') AND EXISTS (
  SELECT 1 FROM evaluations ev 
  JOIN affectations a ON a.module_id = ev.module_id
  JOIN enseignants e ON e.id = a.enseignant_id
  WHERE ev.id = notes_stagiaires.evaluation_id AND e.user_id = auth.uid()
));

CREATE POLICY "Stagiaires peuvent voir leurs propres notes"
ON notes_stagiaires FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stagiaires s
  WHERE s.id = notes_stagiaires.stagiaire_id AND s.user_id = auth.uid()
));

-- RLS Policies pour assiduite
CREATE POLICY "Admins et responsables peuvent gérer l'assiduité"
ON assiduite FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Stagiaires peuvent scanner QR codes"
ON assiduite FOR INSERT
WITH CHECK (has_role(auth.uid(), 'stagiaire') AND EXISTS (
  SELECT 1 FROM stagiaires s
  WHERE s.id = assiduite.stagiaire_id AND s.user_id = auth.uid()
));

CREATE POLICY "Stagiaires peuvent voir leur assiduité"
ON assiduite FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stagiaires s
  WHERE s.id = assiduite.stagiaire_id AND s.user_id = auth.uid()
));

-- RLS Policies pour discussions
CREATE POLICY "Participants peuvent voir leurs discussions"
ON discussions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discussion_participants dp
  WHERE dp.discussion_id = discussions.id AND dp.user_id = auth.uid()
));

CREATE POLICY "Stagiaires et enseignants peuvent créer des discussions"
ON discussions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'stagiaire') OR has_role(auth.uid(), 'enseignant'));

-- RLS Policies pour discussion_participants
CREATE POLICY "Participants peuvent voir les participants"
ON discussion_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discussion_participants dp2
  WHERE dp2.discussion_id = discussion_participants.discussion_id AND dp2.user_id = auth.uid()
));

-- RLS Policies pour discussion_messages
CREATE POLICY "Participants peuvent voir les messages"
ON discussion_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM discussion_participants dp
  WHERE dp.discussion_id = discussion_messages.discussion_id AND dp.user_id = auth.uid()
));

CREATE POLICY "Participants peuvent envoyer des messages"
ON discussion_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM discussion_participants dp
  WHERE dp.discussion_id = discussion_messages.discussion_id AND dp.user_id = auth.uid()
));

-- RLS Policies pour offres_restauration
CREATE POLICY "Admins et responsables peuvent gérer la restauration"
ON offres_restauration FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Tous peuvent voir les offres de restauration"
ON offres_restauration FOR SELECT
USING (true);

-- RLS Policies pour etats_restauration
CREATE POLICY "Admins et responsables peuvent gérer les états de restauration"
ON etats_restauration FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

-- RLS Policies pour qr_codes_assiduite
CREATE POLICY "Gestionnaires peuvent gérer les QR codes"
ON qr_codes_assiduite FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Stagiaires peuvent voir les QR codes de leurs modules"
ON qr_codes_assiduite FOR SELECT
USING (has_role(auth.uid(), 'stagiaire') AND EXISTS (
  SELECT 1 FROM modules m JOIN classes c ON c.id = m.classe_id
  JOIN inscriptions i ON i.classe_id = c.id
  JOIN stagiaires s ON s.id = i.stagiaire_id
  WHERE m.id = qr_codes_assiduite.module_id AND s.user_id = auth.uid()
));

-- RLS Policies pour resultats_stagiaires
CREATE POLICY "Admins et responsables peuvent gérer les résultats"
ON resultats_stagiaires FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'responsable_scolarite') OR has_role(auth.uid(), 'gestionnaire_scolarite'));

CREATE POLICY "Stagiaires peuvent voir leurs résultats"
ON resultats_stagiaires FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stagiaires s
  WHERE s.id = resultats_stagiaires.stagiaire_id AND s.user_id = auth.uid()
));

-- RLS Policies pour contrats_intervention
CREATE POLICY "Admins, financiers et direction peuvent gérer les contrats"
ON contrats_intervention FOR ALL
USING (has_role(auth.uid(), 'administrateur') OR has_role(auth.uid(), 'financier') OR has_role(auth.uid(), 'direction_financiere'));

CREATE POLICY "Enseignants peuvent voir leurs contrats"
ON contrats_intervention FOR SELECT
USING (has_role(auth.uid(), 'enseignant') AND EXISTS (
  SELECT 1 FROM enseignants e
  WHERE e.id = contrats_intervention.enseignant_id AND e.user_id = auth.uid()
));