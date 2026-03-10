-- Création simplifiée de données de démonstration pour le LMS

DO $$
DECLARE
  v_client_id uuid;
  v_programme_id uuid;
  v_classe_id uuid;
  v_mod_cat_1 uuid;
  v_mod_cat_2 uuid;
  v_mod_cat_3 uuid;
  v_mod_cat_4 uuid;
BEGIN
  -- Vérifier si les données existent déjà
  SELECT id INTO v_client_id FROM clients WHERE code = 'CLI-DEMO-001' LIMIT 1;
  
  IF v_client_id IS NULL THEN
    -- Créer un client
    INSERT INTO clients (code, nom, email, telephone, secteur_activite, pays)
    VALUES ('CLI-DEMO-001', 'Entreprise Démo SA', 'contact@demo.com', '+212522000000', 'Technologie', 'Maroc')
    RETURNING id INTO v_client_id;

    -- Créer un programme
    INSERT INTO programmes (code, titre, type, client_id, date_debut, date_fin, code_description)
    VALUES (
      'PROG-2025-DEMO',
      'Executive Leadership & Digital Transformation',
      'INTRA',
      v_client_id,
      '2025-01-15',
      '2025-06-30',
      'Programme de formation continue'
    )
    RETURNING id INTO v_programme_id;

    -- Créer une classe
    INSERT INTO classes (nom, sous_code, programme_id, date_debut, date_fin)
    VALUES (
      'Promotion 2025 - Casablanca',
      'CL-2025-DEMO',
      v_programme_id,
      '2025-01-15',
      '2025-06-30'
    )
    RETURNING id INTO v_classe_id;

    -- Créer des modules catalogue
    INSERT INTO module_catalogue (titre, descriptif)
    VALUES ('Leadership Stratégique', 'Développement leadership')
    RETURNING id INTO v_mod_cat_1;
    
    INSERT INTO module_catalogue (titre, descriptif)
    VALUES ('Transformation Digitale', 'Enjeux digitaux')
    RETURNING id INTO v_mod_cat_2;

    INSERT INTO module_catalogue (titre, descriptif)
    VALUES ('Innovation & Agilité', 'Méthodes agiles')
    RETURNING id INTO v_mod_cat_3;

    INSERT INTO module_catalogue (titre, descriptif)
    VALUES ('Data Analytics', 'Analyse de données')
    RETURNING id INTO v_mod_cat_4;

    -- Lier au programme
    INSERT INTO programme_modules (programme_id, module_catalogue_id, duree, unite_duree, ordre) VALUES
      (v_programme_id, v_mod_cat_1, 3, 'jours', 1),
      (v_programme_id, v_mod_cat_2, 2, 'jours', 2),
      (v_programme_id, v_mod_cat_3, 2, 'jours', 3),
      (v_programme_id, v_mod_cat_4, 3, 'jours', 4);

    -- Créer des modules planifiés
    INSERT INTO modules (code, titre, classe_id, date_debut, date_fin, duree_heures) VALUES
      ('MOD-DEMO-001', 'Leadership Stratégique', v_classe_id, '2025-01-15', '2025-01-17', 24),
      ('MOD-DEMO-002', 'Transformation Digitale', v_classe_id, '2025-02-10', '2025-02-11', 16),
      ('MOD-DEMO-003', 'Innovation & Agilité', v_classe_id, '2025-03-15', '2025-03-16', 16),
      ('MOD-DEMO-004', 'Data Analytics', v_classe_id, '2025-04-20', '2025-04-22', 24),
      ('MOD-DEMO-005', 'Management de Projet', v_classe_id, '2025-05-10', '2025-05-11', 16);
  END IF;
END $$;