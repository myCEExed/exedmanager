export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affectations: {
        Row: {
          confirmee: boolean | null
          created_at: string
          enseignant_id: string
          id: string
          module_id: string
          updated_at: string
        }
        Insert: {
          confirmee?: boolean | null
          created_at?: string
          enseignant_id: string
          id?: string
          module_id: string
          updated_at?: string
        }
        Update: {
          confirmee?: boolean | null
          created_at?: string
          enseignant_id?: string
          id?: string
          module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          description: string | null
          enseignant_id: string | null
          id: string
          is_resolved: boolean | null
          module_id: string | null
          severity: string
          titre: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enseignant_id?: string | null
          id?: string
          is_resolved?: boolean | null
          module_id?: string | null
          severity?: string
          titre: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enseignant_id?: string | null
          id?: string
          is_resolved?: boolean | null
          module_id?: string | null
          severity?: string
          titre?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assiduite: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_session: string
          document_justificatif_url: string | null
          id: string
          justification: string | null
          module_id: string
          present: boolean | null
          qr_code_scan_time: string | null
          retard_minutes: number | null
          stagiaire_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_session: string
          document_justificatif_url?: string | null
          id?: string
          justification?: string | null
          module_id: string
          present?: boolean | null
          qr_code_scan_time?: string | null
          retard_minutes?: number | null
          stagiaire_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_session?: string
          document_justificatif_url?: string | null
          id?: string
          justification?: string | null
          module_id?: string
          present?: boolean | null
          qr_code_scan_time?: string | null
          retard_minutes?: number | null
          stagiaire_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assiduite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assiduite_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assiduite_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      bons_commande: {
        Row: {
          client_id: string | null
          conditions: string | null
          created_at: string
          created_by: string | null
          date_emission: string
          date_livraison_prevue: string | null
          devis_id: string | null
          devis_parent_id: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          est_cloture: boolean | null
          id: string
          mode_repartition: string | null
          montant_facture: number | null
          montant_part: number | null
          montant_restant: number | null
          montant_total: number
          montant_total_devise_origine: number | null
          notes: string | null
          numero_bc: string
          pourcentage_part: number | null
          programme_id: string | null
          stagiaire_id: string | null
          statut: string
          type_payeur: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          date_emission: string
          date_livraison_prevue?: string | null
          devis_id?: string | null
          devis_parent_id?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          est_cloture?: boolean | null
          id?: string
          mode_repartition?: string | null
          montant_facture?: number | null
          montant_part?: number | null
          montant_restant?: number | null
          montant_total: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_bc: string
          pourcentage_part?: number | null
          programme_id?: string | null
          stagiaire_id?: string | null
          statut?: string
          type_payeur?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          date_emission?: string
          date_livraison_prevue?: string | null
          devis_id?: string | null
          devis_parent_id?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          est_cloture?: boolean | null
          id?: string
          mode_repartition?: string | null
          montant_facture?: number | null
          montant_part?: number | null
          montant_restant?: number | null
          montant_total?: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_bc?: string
          pourcentage_part?: number | null
          programme_id?: string | null
          stagiaire_id?: string | null
          statut?: string
          type_payeur?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bons_commande_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_devis_parent_id_fkey"
            columns: ["devis_parent_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "bons_commande_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "bons_commande_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      bons_commande_historique: {
        Row: {
          action: string
          ancien_montant: number | null
          ancien_statut: string | null
          bon_commande_id: string
          commentaire: string | null
          created_at: string
          id: string
          modified_by: string | null
          motif: string | null
          nouveau_montant: number | null
          nouveau_statut: string | null
        }
        Insert: {
          action: string
          ancien_montant?: number | null
          ancien_statut?: string | null
          bon_commande_id: string
          commentaire?: string | null
          created_at?: string
          id?: string
          modified_by?: string | null
          motif?: string | null
          nouveau_montant?: number | null
          nouveau_statut?: string | null
        }
        Update: {
          action?: string
          ancien_montant?: number | null
          ancien_statut?: string | null
          bon_commande_id?: string
          commentaire?: string | null
          created_at?: string
          id?: string
          modified_by?: string | null
          motif?: string | null
          nouveau_montant?: number | null
          nouveau_statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bons_commande_historique_bon_commande_id_fkey"
            columns: ["bon_commande_id"]
            isOneToOne: false
            referencedRelation: "bons_commande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_historique_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          categorie: string
          classe_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          montant_prevu: number
          montant_prevu_devise_origine: number | null
          montant_realise: number
          montant_realise_devise_origine: number | null
          programme_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          categorie: string
          classe_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant_prevu?: number
          montant_prevu_devise_origine?: number | null
          montant_realise?: number
          montant_realise_devise_origine?: number | null
          programme_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          categorie?: string
          classe_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant_prevu?: number
          montant_prevu_devise_origine?: number | null
          montant_realise?: number
          montant_realise_devise_origine?: number | null
          programme_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "budget_items_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "budget_items_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "budget_items_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      chauffeurs: {
        Row: {
          created_at: string
          disponible: boolean | null
          email: string | null
          id: string
          nom: string
          notes: string | null
          prenom: string
          telephone: string | null
          telephone_indicatif: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          disponible?: boolean | null
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          prenom: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          disponible?: boolean | null
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          prenom?: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          id: string
          nom: string
          programme_id: string
          sous_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          nom: string
          programme_id: string
          sous_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          nom?: string
          programme_id?: string
          sous_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "classes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "classes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes_enquetes_config: {
        Row: {
          classe_id: string
          created_at: string
          delai_enquete_froid_jours: number | null
          id: string
          modele_enquete_chaud_id: string | null
          modele_enquete_froid_id: string | null
          updated_at: string
        }
        Insert: {
          classe_id: string
          created_at?: string
          delai_enquete_froid_jours?: number | null
          id?: string
          modele_enquete_chaud_id?: string | null
          modele_enquete_froid_id?: string | null
          updated_at?: string
        }
        Update: {
          classe_id?: string
          created_at?: string
          delai_enquete_froid_jours?: number | null
          id?: string
          modele_enquete_chaud_id?: string | null
          modele_enquete_froid_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_enquetes_config_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_enquetes_config_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: true
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "classes_enquetes_config_modele_enquete_chaud_id_fkey"
            columns: ["modele_enquete_chaud_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_enquetes_config_modele_enquete_froid_id_fkey"
            columns: ["modele_enquete_froid_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          code: string
          code_postal: string | null
          contact_principal_email: string | null
          contact_principal_fonction: string | null
          contact_principal_nom: string | null
          contact_principal_telephone: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nom: string
          notes: string | null
          pays: string | null
          secteur_activite: string | null
          site_web: string | null
          telephone: string | null
          telephone_indicatif: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code: string
          code_postal?: string | null
          contact_principal_email?: string | null
          contact_principal_fonction?: string | null
          contact_principal_nom?: string | null
          contact_principal_telephone?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          pays?: string | null
          secteur_activite?: string | null
          site_web?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code?: string
          code_postal?: string | null
          contact_principal_email?: string | null
          contact_principal_fonction?: string | null
          contact_principal_nom?: string | null
          contact_principal_telephone?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          pays?: string | null
          secteur_activite?: string | null
          site_web?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      contrats_intervention: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_debut: string
          date_fin: string
          devise: Database["public"]["Enums"]["devise"] | null
          document_url: string | null
          enseignant_id: string
          id: string
          modele_contrat_id: string | null
          montant: number | null
          objet: string | null
          prix_unitaire: number | null
          programme_id: string | null
          quantite: number | null
          statut_validation: string | null
          unite: string | null
          updated_at: string | null
          valide_at: string | null
          valide_par: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_debut: string
          date_fin: string
          devise?: Database["public"]["Enums"]["devise"] | null
          document_url?: string | null
          enseignant_id: string
          id?: string
          modele_contrat_id?: string | null
          montant?: number | null
          objet?: string | null
          prix_unitaire?: number | null
          programme_id?: string | null
          quantite?: number | null
          statut_validation?: string | null
          unite?: string | null
          updated_at?: string | null
          valide_at?: string | null
          valide_par?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          devise?: Database["public"]["Enums"]["devise"] | null
          document_url?: string | null
          enseignant_id?: string
          id?: string
          modele_contrat_id?: string | null
          montant?: number | null
          objet?: string | null
          prix_unitaire?: number | null
          programme_id?: string | null
          quantite?: number | null
          statut_validation?: string | null
          unite?: string | null
          updated_at?: string | null
          valide_at?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_intervention_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_intervention_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_intervention_modele_contrat_id_fkey"
            columns: ["modele_contrat_id"]
            isOneToOne: false
            referencedRelation: "modeles_contrat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_intervention_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "contrats_intervention_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "contrats_intervention_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_intervention_valide_par_fkey"
            columns: ["valide_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats_lignes: {
        Row: {
          contrat_id: string
          created_at: string
          designation: string
          id: string
          module_ids: string[] | null
          montant_total: number
          prix_unitaire: number
          programme_id: string | null
          quantite: number
          unite: string
          updated_at: string
        }
        Insert: {
          contrat_id: string
          created_at?: string
          designation: string
          id?: string
          module_ids?: string[] | null
          montant_total?: number
          prix_unitaire?: number
          programme_id?: string | null
          quantite?: number
          unite: string
          updated_at?: string
        }
        Update: {
          contrat_id?: string
          created_at?: string
          designation?: string
          id?: string
          module_ids?: string[] | null
          montant_total?: number
          prix_unitaire?: number
          programme_id?: string | null
          quantite?: number
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats_intervention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_lignes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "contrats_lignes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "contrats_lignes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          client_id: string | null
          conditions: string | null
          created_at: string
          created_by: string | null
          date_emission: string
          date_validite: string
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          montant_ht: number
          montant_ht_devise_origine: number | null
          montant_total: number
          montant_total_devise_origine: number | null
          notes: string | null
          numero_devis: string
          programme_id: string | null
          prospect_id: string | null
          statut: string
          tva: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          date_emission: string
          date_validite: string
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant_ht?: number
          montant_ht_devise_origine?: number | null
          montant_total?: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_devis: string
          programme_id?: string | null
          prospect_id?: string | null
          statut?: string
          tva?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          date_emission?: string
          date_validite?: string
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant_ht?: number
          montant_ht_devise_origine?: number | null
          montant_total?: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_devis?: string
          programme_id?: string | null
          prospect_id?: string | null
          statut?: string
          tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "devis_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "devis_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_historique: {
        Row: {
          action: string
          ancien_montant: number | null
          ancien_statut: string | null
          commentaire: string | null
          created_at: string
          devis_id: string
          id: string
          modified_by: string | null
          nouveau_montant: number | null
          nouveau_statut: string | null
        }
        Insert: {
          action: string
          ancien_montant?: number | null
          ancien_statut?: string | null
          commentaire?: string | null
          created_at?: string
          devis_id: string
          id?: string
          modified_by?: string | null
          nouveau_montant?: number | null
          nouveau_statut?: string | null
        }
        Update: {
          action?: string
          ancien_montant?: number | null
          ancien_statut?: string | null
          commentaire?: string | null
          created_at?: string
          devis_id?: string
          id?: string
          modified_by?: string | null
          nouveau_montant?: number | null
          nouveau_statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_historique_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_historique_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devoirs: {
        Row: {
          accepte_fichiers: boolean | null
          classe_id: string | null
          coefficient: number
          created_at: string
          created_by: string
          date_limite: string
          date_ouverture: string
          description: string | null
          formats_acceptes: string[] | null
          id: string
          instructions: string | null
          module_id: string | null
          points_max: number | null
          taille_max_mb: number | null
          titre: string
          type_devoir: string
          updated_at: string
        }
        Insert: {
          accepte_fichiers?: boolean | null
          classe_id?: string | null
          coefficient?: number
          created_at?: string
          created_by: string
          date_limite: string
          date_ouverture: string
          description?: string | null
          formats_acceptes?: string[] | null
          id?: string
          instructions?: string | null
          module_id?: string | null
          points_max?: number | null
          taille_max_mb?: number | null
          titre: string
          type_devoir: string
          updated_at?: string
        }
        Update: {
          accepte_fichiers?: boolean | null
          classe_id?: string | null
          coefficient?: number
          created_at?: string
          created_by?: string
          date_limite?: string
          date_ouverture?: string
          description?: string | null
          formats_acceptes?: string[] | null
          id?: string
          instructions?: string | null
          module_id?: string | null
          points_max?: number | null
          taille_max_mb?: number | null
          titre?: string
          type_devoir?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoirs_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoirs_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "devoirs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_messages: {
        Row: {
          contenu: string
          created_at: string | null
          discussion_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contenu: string
          created_at?: string | null
          discussion_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contenu?: string
          created_at?: string | null
          discussion_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_participants: {
        Row: {
          created_at: string | null
          discussion_id: string
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discussion_id: string
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discussion_id?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_participants_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_tags: {
        Row: {
          classe_id: string | null
          couleur: string
          created_at: string
          id: string
          nom: string
          programme_id: string | null
          type_tag: string
        }
        Insert: {
          classe_id?: string | null
          couleur?: string
          created_at?: string
          id?: string
          nom: string
          programme_id?: string | null
          type_tag?: string
        }
        Update: {
          classe_id?: string | null
          couleur?: string
          created_at?: string
          id?: string
          nom?: string
          programme_id?: string | null
          type_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_tags_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_tags_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "discussion_tags_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "discussion_tags_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "discussion_tags_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          classe_id: string
          created_at: string | null
          created_by: string
          id: string
          titre: string
          type_discussion: string
          updated_at: string | null
        }
        Insert: {
          classe_id: string
          created_at?: string | null
          created_by: string
          id?: string
          titre: string
          type_discussion: string
          updated_at?: string | null
        }
        Update: {
          classe_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          titre?: string
          type_discussion?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
        ]
      }
      discussions_tags: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_tags_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "discussion_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          classe_id: string | null
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          taille: number | null
          titre: string
          type_fichier: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          classe_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          taille?: number | null
          titre: string
          type_fichier?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          classe_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          taille?: number | null
          titre?: string
          type_fichier?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_legaux: {
        Row: {
          categorie: string | null
          commentaire: string | null
          created_at: string
          description: string | null
          fichier_nom: string
          fichier_taille: number | null
          fichier_type: string | null
          fichier_url: string
          id: string
          programme_id: string
          titre: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          categorie?: string | null
          commentaire?: string | null
          created_at?: string
          description?: string | null
          fichier_nom: string
          fichier_taille?: number | null
          fichier_type?: string | null
          fichier_url: string
          id?: string
          programme_id: string
          titre: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          categorie?: string | null
          commentaire?: string | null
          created_at?: string
          description?: string | null
          fichier_nom?: string
          fichier_taille?: number | null
          fichier_type?: string | null
          fichier_url?: string
          id?: string
          programme_id?: string
          titre?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_legaux_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "documents_legaux_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "documents_legaux_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes: {
        Row: {
          classe_id: string | null
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          date_session: string | null
          description: string | null
          est_active: boolean | null
          id: string
          modele_id: string | null
          module_id: string | null
          programme_id: string | null
          titre: string
          type_enquete: Database["public"]["Enums"]["type_enquete"]
          updated_at: string
        }
        Insert: {
          classe_id?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_session?: string | null
          description?: string | null
          est_active?: boolean | null
          id?: string
          modele_id?: string | null
          module_id?: string | null
          programme_id?: string | null
          titre: string
          type_enquete: Database["public"]["Enums"]["type_enquete"]
          updated_at?: string
        }
        Update: {
          classe_id?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_session?: string | null
          description?: string | null
          est_active?: boolean | null
          id?: string
          modele_id?: string | null
          module_id?: string | null
          programme_id?: string | null
          titre?: string
          type_enquete?: Database["public"]["Enums"]["type_enquete"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquetes_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "enquetes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_modele_id_fkey"
            columns: ["modele_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "enquetes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "enquetes_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes_questions: {
        Row: {
          condition_question_id: string | null
          condition_valeur: Json | null
          created_at: string
          enquete_id: string
          id: string
          obligatoire: boolean | null
          options: Json | null
          ordre: number
          question: string
          type_question: Database["public"]["Enums"]["type_question"]
        }
        Insert: {
          condition_question_id?: string | null
          condition_valeur?: Json | null
          created_at?: string
          enquete_id: string
          id?: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number
          question: string
          type_question?: Database["public"]["Enums"]["type_question"]
        }
        Update: {
          condition_question_id?: string | null
          condition_valeur?: Json | null
          created_at?: string
          enquete_id?: string
          id?: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number
          question?: string
          type_question?: Database["public"]["Enums"]["type_question"]
        }
        Relationships: [
          {
            foreignKeyName: "enquetes_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "enquetes_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_questions_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes_reponses: {
        Row: {
          completed_at: string | null
          created_at: string
          enquete_id: string
          id: string
          stagiaire_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enquete_id: string
          id?: string
          stagiaire_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enquete_id?: string
          id?: string
          stagiaire_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquetes_reponses_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_reponses_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes_reponses_details: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reponse_id: string
          valeur_json: Json | null
          valeur_numerique: number | null
          valeur_texte: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reponse_id: string
          valeur_json?: Json | null
          valeur_numerique?: number | null
          valeur_texte?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reponse_id?: string
          valeur_json?: Json | null
          valeur_numerique?: number | null
          valeur_texte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquetes_reponses_details_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "enquetes_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquetes_reponses_details_reponse_id_fkey"
            columns: ["reponse_id"]
            isOneToOne: false
            referencedRelation: "enquetes_reponses"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignants: {
        Row: {
          adresse_residence: string | null
          created_at: string
          date_debut_sejour: string | null
          date_fin_sejour: string | null
          email: string
          id: string
          mode_remuneration:
            | Database["public"]["Enums"]["remuneration_mode"]
            | null
          nom: string
          numero_identification: string | null
          pays_residence: string | null
          photo_url: string | null
          prenom: string
          raison_sociale: string | null
          telephone: string | null
          telephone_indicatif: string | null
          thematiques: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          adresse_residence?: string | null
          created_at?: string
          date_debut_sejour?: string | null
          date_fin_sejour?: string | null
          email: string
          id?: string
          mode_remuneration?:
            | Database["public"]["Enums"]["remuneration_mode"]
            | null
          nom: string
          numero_identification?: string | null
          pays_residence?: string | null
          photo_url?: string | null
          prenom: string
          raison_sociale?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          thematiques?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          adresse_residence?: string | null
          created_at?: string
          date_debut_sejour?: string | null
          date_fin_sejour?: string | null
          email?: string
          id?: string
          mode_remuneration?:
            | Database["public"]["Enums"]["remuneration_mode"]
            | null
          nom?: string
          numero_identification?: string | null
          pays_residence?: string | null
          photo_url?: string | null
          prenom?: string
          raison_sociale?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          thematiques?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      etats_restauration: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          module_id: string
          nombre_invites: number | null
          nombre_total_unites: number | null
          notes: string | null
          offre_restauration_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_id: string
          nombre_invites?: number | null
          nombre_total_unites?: number | null
          notes?: string | null
          offre_restauration_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_id?: string
          nombre_invites?: number | null
          nombre_total_unites?: number | null
          notes?: string | null
          offre_restauration_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etats_restauration_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etats_restauration_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etats_restauration_offre_restauration_id_fkey"
            columns: ["offre_restauration_id"]
            isOneToOne: false
            referencedRelation: "offres_restauration"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          classe_id: string
          coefficient: number | null
          created_at: string | null
          date_evaluation: string | null
          id: string
          module_id: string
          note_max: number | null
          titre: string
          type_evaluation: string
          updated_at: string | null
        }
        Insert: {
          classe_id: string
          coefficient?: number | null
          created_at?: string | null
          date_evaluation?: string | null
          id?: string
          module_id: string
          note_max?: number | null
          titre: string
          type_evaluation: string
          updated_at?: string | null
        }
        Update: {
          classe_id?: string
          coefficient?: number | null
          created_at?: string | null
          date_evaluation?: string | null
          id?: string
          module_id?: string
          note_max?: number | null
          titre?: string
          type_evaluation?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "evaluations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          bon_commande_id: string | null
          classe_id: string | null
          created_at: string | null
          created_by: string | null
          date_echeance: string
          date_emission: string
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          modele_facture_id: string | null
          montant_paye: number | null
          montant_paye_devise_origine: number | null
          montant_total: number
          montant_total_devise_origine: number | null
          notes: string | null
          numero_facture: string
          stagiaire_id: string | null
          statut: Database["public"]["Enums"]["statut_facture"] | null
          updated_at: string | null
        }
        Insert: {
          bon_commande_id?: string | null
          classe_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_echeance: string
          date_emission: string
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          modele_facture_id?: string | null
          montant_paye?: number | null
          montant_paye_devise_origine?: number | null
          montant_total: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_facture: string
          stagiaire_id?: string | null
          statut?: Database["public"]["Enums"]["statut_facture"] | null
          updated_at?: string | null
        }
        Update: {
          bon_commande_id?: string | null
          classe_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_echeance?: string
          date_emission?: string
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          modele_facture_id?: string | null
          montant_paye?: number | null
          montant_paye_devise_origine?: number | null
          montant_total?: number
          montant_total_devise_origine?: number | null
          notes?: string | null
          numero_facture?: string
          stagiaire_id?: string | null
          statut?: Database["public"]["Enums"]["statut_facture"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_bon_commande_id_fkey"
            columns: ["bon_commande_id"]
            isOneToOne: false
            referencedRelation: "bons_commande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "factures_modele_facture_id_fkey"
            columns: ["modele_facture_id"]
            isOneToOne: false
            referencedRelation: "modeles_facture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          etoiles: number | null
          id: string
          nom: string
          notes: string | null
          pays: string
          site_web: string | null
          telephone: string | null
          telephone_indicatif: string | null
          updated_at: string
          ville: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          etoiles?: number | null
          id?: string
          nom: string
          notes?: string | null
          pays?: string
          site_web?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          etoiles?: number | null
          id?: string
          nom?: string
          notes?: string | null
          pays?: string
          site_web?: string | null
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville?: string
        }
        Relationships: []
      }
      inscriptions: {
        Row: {
          classe_id: string
          created_at: string
          date_inscription: string
          id: string
          notes: string | null
          stagiaire_id: string
          statut: string | null
          updated_at: string
        }
        Insert: {
          classe_id: string
          created_at?: string
          date_inscription?: string
          id?: string
          notes?: string | null
          stagiaire_id: string
          statut?: string | null
          updated_at?: string
        }
        Update: {
          classe_id?: string
          created_at?: string
          date_inscription?: string
          id?: string
          notes?: string | null
          stagiaire_id?: string
          statut?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscriptions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "inscriptions_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          chauffeur_id: string | null
          created_at: string
          created_by: string | null
          email: string
          enseignant_id: string | null
          expire_at: string
          id: string
          stagiaire_id: string | null
          token: string
          type: string
          utilisee: boolean | null
        }
        Insert: {
          chauffeur_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          enseignant_id?: string | null
          expire_at: string
          id?: string
          stagiaire_id?: string | null
          token: string
          type: string
          utilisee?: boolean | null
        }
        Update: {
          chauffeur_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          enseignant_id?: string | null
          expire_at?: string
          id?: string
          stagiaire_id?: string | null
          token?: string
          type?: string
          utilisee?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes_bon_commande: {
        Row: {
          bon_commande_id: string
          created_at: string
          designation: string
          id: string
          montant_total: number
          prix_unitaire: number
          quantite: number
          updated_at: string
        }
        Insert: {
          bon_commande_id: string
          created_at?: string
          designation: string
          id?: string
          montant_total: number
          prix_unitaire: number
          quantite?: number
          updated_at?: string
        }
        Update: {
          bon_commande_id?: string
          created_at?: string
          designation?: string
          id?: string
          montant_total?: number
          prix_unitaire?: number
          quantite?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lignes_bon_commande_bon_commande_id_fkey"
            columns: ["bon_commande_id"]
            isOneToOne: false
            referencedRelation: "bons_commande"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes_devis: {
        Row: {
          created_at: string
          designation: string
          devis_id: string
          id: string
          montant_total: number
          prix_unitaire: number
          quantite: number
        }
        Insert: {
          created_at?: string
          designation: string
          devis_id: string
          id?: string
          montant_total: number
          prix_unitaire: number
          quantite?: number
        }
        Update: {
          created_at?: string
          designation?: string
          devis_id?: string
          id?: string
          montant_total?: number
          prix_unitaire?: number
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "lignes_devis_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          classe_id: string | null
          contenu: string
          created_at: string
          destinataire_id: string | null
          expediteur_id: string
          id: string
          lu: boolean | null
          sujet: string
          type_destinataire: string | null
        }
        Insert: {
          classe_id?: string | null
          contenu: string
          created_at?: string
          destinataire_id?: string | null
          expediteur_id: string
          id?: string
          lu?: boolean | null
          sujet: string
          type_destinataire?: string | null
        }
        Update: {
          classe_id?: string | null
          contenu?: string
          created_at?: string
          destinataire_id?: string | null
          expediteur_id?: string
          id?: string
          lu?: boolean | null
          sujet?: string
          type_destinataire?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
        ]
      }
      modeles_contrat: {
        Row: {
          champs_variables: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          nom: string
          template_url: string | null
          type_contrat: string
          updated_at: string
        }
        Insert: {
          champs_variables?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nom: string
          template_url?: string | null
          type_contrat: string
          updated_at?: string
        }
        Update: {
          champs_variables?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nom?: string
          template_url?: string | null
          type_contrat?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modeles_contrat_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_enquete: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          est_actif: boolean | null
          id: string
          nom: string
          type_enquete: Database["public"]["Enums"]["type_enquete"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          est_actif?: boolean | null
          id?: string
          nom: string
          type_enquete: Database["public"]["Enums"]["type_enquete"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          est_actif?: boolean | null
          id?: string
          nom?: string
          type_enquete?: Database["public"]["Enums"]["type_enquete"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modeles_enquete_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_enquete_questions: {
        Row: {
          condition_question_id: string | null
          condition_valeur: Json | null
          created_at: string
          id: string
          modele_id: string
          obligatoire: boolean | null
          options: Json | null
          ordre: number
          question: string
          type_question: Database["public"]["Enums"]["type_question"]
        }
        Insert: {
          condition_question_id?: string | null
          condition_valeur?: Json | null
          created_at?: string
          id?: string
          modele_id: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number
          question: string
          type_question?: Database["public"]["Enums"]["type_question"]
        }
        Update: {
          condition_question_id?: string | null
          condition_valeur?: Json | null
          created_at?: string
          id?: string
          modele_id?: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number
          question?: string
          type_question?: Database["public"]["Enums"]["type_question"]
        }
        Relationships: [
          {
            foreignKeyName: "modeles_enquete_questions_condition_question_id_fkey"
            columns: ["condition_question_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modeles_enquete_questions_modele_id_fkey"
            columns: ["modele_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_facture: {
        Row: {
          afficher_conditions: boolean | null
          afficher_logo: boolean | null
          conditions_paiement: string | null
          couleur_principale: string | null
          created_at: string
          created_by: string | null
          description: string | null
          en_tete_html: string | null
          format_numero: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          mentions_legales: string | null
          nom: string
          pied_page_html: string | null
          prefixe_numero: string | null
          prochain_numero: number | null
          updated_at: string
        }
        Insert: {
          afficher_conditions?: boolean | null
          afficher_logo?: boolean | null
          conditions_paiement?: string | null
          couleur_principale?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          en_tete_html?: string | null
          format_numero?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          mentions_legales?: string | null
          nom: string
          pied_page_html?: string | null
          prefixe_numero?: string | null
          prochain_numero?: number | null
          updated_at?: string
        }
        Update: {
          afficher_conditions?: boolean | null
          afficher_logo?: boolean | null
          conditions_paiement?: string | null
          couleur_principale?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          en_tete_html?: string | null
          format_numero?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          mentions_legales?: string | null
          nom?: string
          pied_page_html?: string | null
          prefixe_numero?: string | null
          prochain_numero?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      module_catalogue: {
        Row: {
          created_at: string
          created_by: string | null
          descriptif: string | null
          id: string
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descriptif?: string | null
          id?: string
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descriptif?: string | null
          id?: string
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_enquete_config: {
        Row: {
          created_at: string
          enquete_id: string | null
          id: string
          modele_enquete_id: string | null
          module_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enquete_id?: string | null
          id?: string
          modele_enquete_id?: string | null
          module_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enquete_id?: string | null
          id?: string
          modele_enquete_id?: string | null
          module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_enquete_config_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_enquete_config_modele_enquete_id_fkey"
            columns: ["modele_enquete_id"]
            isOneToOne: false
            referencedRelation: "modeles_enquete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_enquete_config_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_enseignants: {
        Row: {
          created_at: string
          enseignant_id: string
          id: string
          module_catalogue_id: string
        }
        Insert: {
          created_at?: string
          enseignant_id: string
          id?: string
          module_catalogue_id: string
        }
        Update: {
          created_at?: string
          enseignant_id?: string
          id?: string
          module_catalogue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_enseignants_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_enseignants_module_catalogue_id_fkey"
            columns: ["module_catalogue_id"]
            isOneToOne: false
            referencedRelation: "module_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      module_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          duree_heures: number
          id: string
          lieu_hors_site: string | null
          module_id: string
          notes: string | null
          ordre: number | null
          salle: string | null
          titre: string
          type_lieu: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number
          id?: string
          lieu_hors_site?: string | null
          module_id: string
          notes?: string | null
          ordre?: number | null
          salle?: string | null
          titre: string
          type_lieu?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number
          id?: string
          lieu_hors_site?: string | null
          module_id?: string
          notes?: string | null
          ordre?: number | null
          salle?: string | null
          titre?: string
          type_lieu?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          classe_id: string | null
          code: string
          commentaire_lieu: string | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          duree_heures: number | null
          id: string
          invitation_envoyee: boolean | null
          lieu_hors_site: string | null
          programme_module_id: string | null
          salle: string | null
          titre: string
          type_lieu: string | null
          updated_at: string
        }
        Insert: {
          classe_id?: string | null
          code: string
          commentaire_lieu?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number | null
          id?: string
          invitation_envoyee?: boolean | null
          lieu_hors_site?: string | null
          programme_module_id?: string | null
          salle?: string | null
          titre: string
          type_lieu?: string | null
          updated_at?: string
        }
        Update: {
          classe_id?: string | null
          code?: string
          commentaire_lieu?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          duree_heures?: number | null
          id?: string
          invitation_envoyee?: boolean | null
          lieu_hors_site?: string | null
          programme_module_id?: string | null
          salle?: string | null
          titre?: string
          type_lieu?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "modules_programme_module_id_fkey"
            columns: ["programme_module_id"]
            isOneToOne: false
            referencedRelation: "programme_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_stagiaires: {
        Row: {
          commentaire: string | null
          created_at: string | null
          devoir_id: string | null
          evaluation_id: string | null
          id: string
          note: number | null
          soumission_devoir_id: string | null
          stagiaire_id: string
          type_source: string | null
          updated_at: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string | null
          devoir_id?: string | null
          evaluation_id?: string | null
          id?: string
          note?: number | null
          soumission_devoir_id?: string | null
          stagiaire_id: string
          type_source?: string | null
          updated_at?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string | null
          devoir_id?: string | null
          evaluation_id?: string | null
          id?: string
          note?: number | null
          soumission_devoir_id?: string | null
          stagiaire_id?: string
          type_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_stagiaires_devoir_id_fkey"
            columns: ["devoir_id"]
            isOneToOne: false
            referencedRelation: "devoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_soumission_devoir_id_fkey"
            columns: ["soumission_devoir_id"]
            isOneToOne: false
            referencedRelation: "soumissions_devoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      offres_restauration: {
        Row: {
          created_at: string | null
          created_by: string | null
          devise: Database["public"]["Enums"]["devise"]
          formule_restauration: string
          id: string
          nature_restauration: string
          prix_unitaire: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          devise?: Database["public"]["Enums"]["devise"]
          formule_restauration: string
          id?: string
          nature_restauration: string
          prix_unitaire: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          devise?: Database["public"]["Enums"]["devise"]
          formule_restauration?: string
          id?: string
          nature_restauration?: string
          prix_unitaire?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offres_restauration_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_paiement: string
          devise: Database["public"]["Enums"]["devise"] | null
          facture_id: string
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          montant: number
          montant_devise_origine: number | null
          notes: string | null
          reference: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_paiement: string
          devise?: Database["public"]["Enums"]["devise"] | null
          facture_id: string
          id?: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement"]
          montant: number
          montant_devise_origine?: number | null
          notes?: string | null
          reference?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_paiement?: string
          devise?: Database["public"]["Enums"]["devise"] | null
          facture_id?: string
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement"]
          montant?: number
          montant_devise_origine?: number | null
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programme_audit_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          modified_by: string
          new_values: Json | null
          old_values: Json | null
          programme_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          modified_by: string
          new_values?: Json | null
          old_values?: Json | null
          programme_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          modified_by?: string
          new_values?: Json | null
          old_values?: Json | null
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_audit_log_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_audit_log_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_audit_log_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_couts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          montant: number
          montant_devise_origine: number | null
          programme_id: string
          type_cout: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant?: number
          montant_devise_origine?: number | null
          programme_id: string
          type_cout: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          montant?: number
          montant_devise_origine?: number | null
          programme_id?: string
          type_cout?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_couts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_couts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_couts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_gestionnaires: {
        Row: {
          created_at: string
          created_by: string | null
          gestionnaire_user_id: string
          id: string
          programme_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gestionnaire_user_id: string
          id?: string
          programme_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gestionnaire_user_id?: string
          id?: string
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_gestionnaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_gestionnaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_gestionnaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_modules: {
        Row: {
          created_at: string
          duree: number
          id: string
          module_catalogue_id: string
          ordre: number | null
          programme_id: string
          unite_duree: Database["public"]["Enums"]["unite_duree"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duree: number
          id?: string
          module_catalogue_id: string
          ordre?: number | null
          programme_id: string
          unite_duree: Database["public"]["Enums"]["unite_duree"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duree?: number
          id?: string
          module_catalogue_id?: string
          ordre?: number | null
          programme_id?: string
          unite_duree?: Database["public"]["Enums"]["unite_duree"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_modules_module_catalogue_id_fkey"
            columns: ["module_catalogue_id"]
            isOneToOne: false
            referencedRelation: "module_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_modules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_modules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "programme_modules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          client_id: string | null
          code: string
          code_description: string | null
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          delivrables: string[] | null
          id: string
          is_retroactive: boolean | null
          modele_attestation_url: string | null
          modele_certificat_url: string | null
          modele_diplome_url: string | null
          titre: string
          type: Database["public"]["Enums"]["programme_type"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          code: string
          code_description?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          delivrables?: string[] | null
          id?: string
          is_retroactive?: boolean | null
          modele_attestation_url?: string | null
          modele_certificat_url?: string | null
          modele_diplome_url?: string | null
          titre: string
          type: Database["public"]["Enums"]["programme_type"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          code?: string
          code_description?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          delivrables?: string[] | null
          id?: string
          is_retroactive?: boolean | null
          modele_attestation_url?: string | null
          modele_certificat_url?: string | null
          modele_diplome_url?: string | null
          titre?: string
          type?: Database["public"]["Enums"]["programme_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_stagiaires: {
        Row: {
          created_at: string
          date_completion: string | null
          derniere_activite: string | null
          id: string
          module_id: string
          pourcentage_completion: number | null
          ressource_id: string | null
          stagiaire_id: string
          statut: string | null
          temps_passe_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_completion?: string | null
          derniere_activite?: string | null
          id?: string
          module_id: string
          pourcentage_completion?: number | null
          ressource_id?: string | null
          stagiaire_id: string
          statut?: string | null
          temps_passe_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_completion?: string | null
          derniere_activite?: string | null
          id?: string
          module_id?: string
          pourcentage_completion?: number | null
          ressource_id?: string | null
          stagiaire_id?: string
          statut?: string | null
          temps_passe_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_stagiaires_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_stagiaires_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources_pedagogiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_stagiaires_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_actions: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          date_action: string
          id: string
          prospect_id: string
          responsable: string | null
          resultat: string | null
          type_action: string
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_action?: string
          id?: string
          prospect_id: string
          responsable?: string | null
          resultat?: string | null
          type_action: string
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_action?: string
          id?: string
          prospect_id?: string
          responsable?: string | null
          resultat?: string | null
          type_action?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_actions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_commentaires: {
        Row: {
          cible_formation: string | null
          contenu: string
          created_at: string
          created_by: string | null
          id: string
          prospect_id: string
          updated_at: string
        }
        Insert: {
          cible_formation?: string | null
          contenu: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id: string
          updated_at?: string
        }
        Update: {
          cible_formation?: string | null
          contenu?: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_commentaires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_commentaires_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          adresse: string | null
          brevo_contact_id: string | null
          code_postal: string | null
          created_at: string
          created_by: string | null
          down_date: string | null
          down_raison: string | null
          email: string
          entreprise: string | null
          id: string
          interet_module_ids: string[] | null
          interet_programme_ids: string[] | null
          interet_thematiques: string[] | null
          is_down: boolean | null
          niveau_interet: string | null
          nom: string
          notes: string | null
          pays: string | null
          poste: string | null
          prenom: string | null
          secteur_activite: string | null
          source: string | null
          source_autre_commentaire: string | null
          sources: string[] | null
          statut: string
          telephone: string | null
          telephone_indicatif: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          brevo_contact_id?: string | null
          code_postal?: string | null
          created_at?: string
          created_by?: string | null
          down_date?: string | null
          down_raison?: string | null
          email: string
          entreprise?: string | null
          id?: string
          interet_module_ids?: string[] | null
          interet_programme_ids?: string[] | null
          interet_thematiques?: string[] | null
          is_down?: boolean | null
          niveau_interet?: string | null
          nom: string
          notes?: string | null
          pays?: string | null
          poste?: string | null
          prenom?: string | null
          secteur_activite?: string | null
          source?: string | null
          source_autre_commentaire?: string | null
          sources?: string[] | null
          statut?: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          brevo_contact_id?: string | null
          code_postal?: string | null
          created_at?: string
          created_by?: string | null
          down_date?: string | null
          down_raison?: string | null
          email?: string
          entreprise?: string | null
          id?: string
          interet_module_ids?: string[] | null
          interet_programme_ids?: string[] | null
          interet_thematiques?: string[] | null
          is_down?: boolean | null
          niveau_interet?: string | null
          nom?: string
          notes?: string | null
          pays?: string | null
          poste?: string | null
          prenom?: string | null
          secteur_activite?: string | null
          source?: string | null
          source_autre_commentaire?: string | null
          sources?: string[] | null
          statut?: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes_assiduite: {
        Row: {
          code_qr: string
          created_at: string | null
          created_by: string | null
          date_session: string
          expire_at: string
          id: string
          module_id: string
        }
        Insert: {
          code_qr: string
          created_at?: string | null
          created_by?: string | null
          date_session: string
          expire_at: string
          id?: string
          module_id: string
        }
        Update: {
          code_qr?: string
          created_at?: string | null
          created_by?: string | null
          date_session?: string
          expire_at?: string
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_assiduite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_assiduite_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      relances: {
        Row: {
          contenu: string | null
          created_at: string | null
          date_relance: string
          envoyee_par: string | null
          facture_id: string
          id: string
          type_relance: string
        }
        Insert: {
          contenu?: string | null
          created_at?: string | null
          date_relance: string
          envoyee_par?: string | null
          facture_id: string
          id?: string
          type_relance: string
        }
        Update: {
          contenu?: string | null
          created_at?: string | null
          date_relance?: string
          envoyee_par?: string | null
          facture_id?: string
          id?: string
          type_relance?: string
        }
        Relationships: [
          {
            foreignKeyName: "relances_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources_pedagogiques: {
        Row: {
          classe_id: string | null
          created_at: string
          description: string | null
          duree_minutes: number | null
          fichier_id: string | null
          fichier_type: string | null
          fichier_url: string | null
          id: string
          module_id: string | null
          obligatoire: boolean | null
          ordre: number | null
          titre: string
          type_ressource: string
          updated_at: string
          uploaded_by: string
          url: string | null
        }
        Insert: {
          classe_id?: string | null
          created_at?: string
          description?: string | null
          duree_minutes?: number | null
          fichier_id?: string | null
          fichier_type?: string | null
          fichier_url?: string | null
          id?: string
          module_id?: string | null
          obligatoire?: boolean | null
          ordre?: number | null
          titre: string
          type_ressource: string
          updated_at?: string
          uploaded_by: string
          url?: string | null
        }
        Update: {
          classe_id?: string | null
          created_at?: string
          description?: string | null
          duree_minutes?: number | null
          fichier_id?: string | null
          fichier_type?: string | null
          fichier_url?: string | null
          id?: string
          module_id?: string | null
          obligatoire?: boolean | null
          ordre?: number | null
          titre?: string
          type_ressource?: string
          updated_at?: string
          uploaded_by?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ressources_pedagogiques_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_pedagogiques_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "ressources_pedagogiques_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      resultats_stagiaires: {
        Row: {
          attestation_genere: boolean | null
          certificat_genere: boolean | null
          classe_id: string
          commentaire: string | null
          created_at: string | null
          diplome_genere: boolean | null
          id: string
          note_finale: number | null
          stagiaire_id: string
          statut: string
          updated_at: string | null
        }
        Insert: {
          attestation_genere?: boolean | null
          certificat_genere?: boolean | null
          classe_id: string
          commentaire?: string | null
          created_at?: string | null
          diplome_genere?: boolean | null
          id?: string
          note_finale?: number | null
          stagiaire_id: string
          statut?: string
          updated_at?: string | null
        }
        Update: {
          attestation_genere?: boolean | null
          certificat_genere?: boolean | null
          classe_id?: string
          commentaire?: string | null
          created_at?: string | null
          diplome_genere?: boolean | null
          id?: string
          note_finale?: number | null
          stagiaire_id?: string
          statut?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resultats_stagiaires_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultats_stagiaires_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "resultats_stagiaires_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      soumissions_devoirs: {
        Row: {
          commentaire_enseignant: string | null
          commentaire_stagiaire: string | null
          corrige_par: string | null
          created_at: string
          date_correction: string | null
          date_soumission: string
          devoir_id: string
          fichier_nom: string | null
          fichier_url: string | null
          id: string
          note: number | null
          stagiaire_id: string
          statut: string | null
          updated_at: string
        }
        Insert: {
          commentaire_enseignant?: string | null
          commentaire_stagiaire?: string | null
          corrige_par?: string | null
          created_at?: string
          date_correction?: string | null
          date_soumission?: string
          devoir_id: string
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          note?: number | null
          stagiaire_id: string
          statut?: string | null
          updated_at?: string
        }
        Update: {
          commentaire_enseignant?: string | null
          commentaire_stagiaire?: string | null
          corrige_par?: string | null
          created_at?: string
          date_correction?: string | null
          date_soumission?: string
          devoir_id?: string
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          note?: number | null
          stagiaire_id?: string
          statut?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soumissions_devoirs_devoir_id_fkey"
            columns: ["devoir_id"]
            isOneToOne: false
            referencedRelation: "devoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soumissions_devoirs_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
      stagiaires: {
        Row: {
          adresse: string | null
          code_postal: string | null
          created_at: string
          date_naissance: string | null
          diplomes: Json | null
          email: string
          entreprise: string | null
          id: string
          niveau_etude: string | null
          nom: string
          pays: string | null
          photo_url: string | null
          poste_fonction: string | null
          prenom: string
          telephone: string | null
          telephone_indicatif: string | null
          updated_at: string
          user_id: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          date_naissance?: string | null
          diplomes?: Json | null
          email: string
          entreprise?: string | null
          id?: string
          niveau_etude?: string | null
          nom: string
          pays?: string | null
          photo_url?: string | null
          poste_fonction?: string | null
          prenom: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          date_naissance?: string | null
          diplomes?: Json | null
          email?: string
          entreprise?: string | null
          id?: string
          niveau_etude?: string | null
          nom?: string
          pays?: string | null
          photo_url?: string | null
          poste_fonction?: string | null
          prenom?: string
          telephone?: string | null
          telephone_indicatif?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      tarifs_transfert: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"]
          id: string
          nom: string
          prix: number
          trajet: string | null
          type_transport: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"]
          id?: string
          nom: string
          prix?: number
          trajet?: string | null
          type_transport: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"]
          id?: string
          nom?: string
          prix?: number
          trajet?: string | null
          type_transport?: string
          updated_at?: string
        }
        Relationships: []
      }
      taux_change: {
        Row: {
          created_at: string
          created_by: string | null
          date_application: string
          id: string
          notes: string | null
          taux_eur_to_mad: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_application?: string
          id?: string
          notes?: string | null
          taux_eur_to_mad: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_application?: string
          id?: string
          notes?: string | null
          taux_eur_to_mad?: number
          updated_at?: string
        }
        Relationships: []
      }
      transfert_beneficiaires: {
        Row: {
          classe_id: string | null
          cout_part: number | null
          created_at: string
          enseignant_id: string
          id: string
          programme_id: string | null
          transfert_id: string
        }
        Insert: {
          classe_id?: string | null
          cout_part?: number | null
          created_at?: string
          enseignant_id: string
          id?: string
          programme_id?: string | null
          transfert_id: string
        }
        Update: {
          classe_id?: string | null
          cout_part?: number | null
          created_at?: string
          enseignant_id?: string
          id?: string
          programme_id?: string | null
          transfert_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfert_beneficiaires_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfert_beneficiaires_transfert_id_fkey"
            columns: ["transfert_id"]
            isOneToOne: false
            referencedRelation: "transferts"
            referencedColumns: ["id"]
          },
        ]
      }
      transferts: {
        Row: {
          chauffeur_id: string | null
          classe_id: string | null
          cout: number | null
          cout_affecte: boolean | null
          cout_devise_origine: number | null
          cout_par_enseignant: number | null
          created_at: string
          created_by: string | null
          date_depart: string
          date_retour: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          enseignant_id: string
          hotel_id: string | null
          id: string
          module_id: string | null
          notes: string | null
          programme_id: string | null
          statut: string
          tarif_transfert_id: string | null
          type_transport: string
          updated_at: string
          vehicule_id: string | null
          ville_arrivee: string
          ville_depart: string
        }
        Insert: {
          chauffeur_id?: string | null
          classe_id?: string | null
          cout?: number | null
          cout_affecte?: boolean | null
          cout_devise_origine?: number | null
          cout_par_enseignant?: number | null
          created_at?: string
          created_by?: string | null
          date_depart: string
          date_retour?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          enseignant_id: string
          hotel_id?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          programme_id?: string | null
          statut?: string
          tarif_transfert_id?: string | null
          type_transport: string
          updated_at?: string
          vehicule_id?: string | null
          ville_arrivee: string
          ville_depart: string
        }
        Update: {
          chauffeur_id?: string | null
          classe_id?: string | null
          cout?: number | null
          cout_affecte?: boolean | null
          cout_devise_origine?: number | null
          cout_par_enseignant?: number | null
          created_at?: string
          created_by?: string | null
          date_depart?: string
          date_retour?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          enseignant_id?: string
          hotel_id?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          programme_id?: string | null
          statut?: string
          tarif_transfert_id?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          ville_arrivee?: string
          ville_depart?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferts_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "transferts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "enseignants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "transferts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_programme"
            referencedColumns: ["programme_id"]
          },
          {
            foreignKeyName: "transferts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_tarif_transfert_id_fkey"
            columns: ["tarif_transfert_id"]
            isOneToOne: false
            referencedRelation: "tarifs_transfert"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicules: {
        Row: {
          capacite: number
          created_at: string
          id: string
          immatriculation: string
          marque: string
          modele: string
          notes: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          capacite?: number
          created_at?: string
          id?: string
          immatriculation: string
          marque: string
          modele: string
          notes?: string | null
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          capacite?: number
          created_at?: string
          id?: string
          immatriculation?: string
          marque?: string
          modele?: string
          notes?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      kpis_financiers_classe: {
        Row: {
          charges_prevues: number | null
          charges_realisees: number | null
          classe_code: string | null
          classe_id: string | null
          classe_nom: string | null
          marge_prevue: number | null
          marge_realisee: number | null
          produits_prevus: number | null
          produits_realises: number | null
          programme_id: string | null
          programme_titre: string | null
        }
        Relationships: []
      }
      kpis_financiers_globaux: {
        Row: {
          charges_prevues: number | null
          charges_realisees: number | null
          marge_prevue: number | null
          marge_realisee: number | null
          produits_prevus: number | null
          produits_realises: number | null
        }
        Relationships: []
      }
      kpis_financiers_programme: {
        Row: {
          charges_prevues: number | null
          charges_realisees: number | null
          marge_prevue: number | null
          marge_realisee: number | null
          produits_prevus: number | null
          produits_realises: number | null
          programme_code: string | null
          programme_id: string | null
          programme_titre: string | null
        }
        Relationships: []
      }
      notes_consolidees: {
        Row: {
          classe_id: string | null
          coefficient: number | null
          commentaire: string | null
          created_at: string | null
          devoir_classe_id: string | null
          devoir_coefficient: number | null
          devoir_id: string | null
          devoir_module_id: string | null
          devoir_points_max: number | null
          devoir_titre: string | null
          evaluation_classe_id: string | null
          evaluation_coefficient: number | null
          evaluation_id: string | null
          evaluation_module_id: string | null
          evaluation_note_max: number | null
          evaluation_titre: string | null
          id: string | null
          module_id: string | null
          note: number | null
          note_max: number | null
          stagiaire_id: string | null
          titre: string | null
          type_devoir: string | null
          type_evaluation: string | null
          type_source: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devoirs_classe_id_fkey"
            columns: ["devoir_classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoirs_classe_id_fkey"
            columns: ["devoir_classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "devoirs_module_id_fkey"
            columns: ["devoir_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["evaluation_classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["evaluation_classe_id"]
            isOneToOne: false
            referencedRelation: "kpis_financiers_classe"
            referencedColumns: ["classe_id"]
          },
          {
            foreignKeyName: "evaluations_module_id_fkey"
            columns: ["evaluation_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_devoir_id_fkey"
            columns: ["devoir_id"]
            isOneToOne: false
            referencedRelation: "devoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_stagiaires_stagiaire_id_fkey"
            columns: ["stagiaire_id"]
            isOneToOne: false
            referencedRelation: "stagiaires"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_programme: {
        Args: { _programme_id: string; _user_id: string }
        Returns: boolean
      }
      chauffeur_can_view_enseignant: {
        Args: { enseignant_uuid: string }
        Returns: boolean
      }
      convert_currency: {
        Args: {
          p_from_devise: Database["public"]["Enums"]["devise"]
          p_montant: number
          p_to_devise: Database["public"]["Enums"]["devise"]
        }
        Returns: number
      }
      enseignant_can_see_stagiaire: {
        Args: { _enseignant_user_id: string; _stagiaire_id: string }
        Returns: boolean
      }
      find_matching_classe_for_transfer: {
        Args: { p_date_transfert: string; p_enseignant_id: string }
        Returns: {
          classe_id: string
          date_debut: string
          date_fin: string
          module_id: string
          programme_id: string
        }[]
      }
      get_current_exchange_rate: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_discussion_participant: {
        Args: { _discussion_id: string; _user_id: string }
        Returns: boolean
      }
      is_gestionnaire_for_programme: {
        Args: { _programme_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrateur"
        | "gestionnaire_scolarite"
        | "financier"
        | "collaborateur"
        | "enseignant"
        | "stagiaire"
        | "responsable_scolarite"
        | "direction_financiere"
        | "chauffeur"
        | "proprietaire"
        | "commercial"
      devise: "EUR" | "MAD"
      mode_paiement: "virement" | "cheque" | "especes" | "carte" | "autre"
      programme_type: "INTER" | "INTRA"
      remuneration_mode: "vacation" | "prestation_service" | "salarie" | "autre"
      statut_facture:
        | "brouillon"
        | "envoyee"
        | "payee"
        | "partielle"
        | "annulee"
      type_enquete: "a_chaud" | "a_froid"
      type_question:
        | "texte_libre"
        | "choix_unique"
        | "choix_multiple"
        | "echelle_5"
        | "echelle_10"
        | "oui_non"
        | "note_20"
        | "matrice"
      unite_duree: "heures" | "jours"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrateur",
        "gestionnaire_scolarite",
        "financier",
        "collaborateur",
        "enseignant",
        "stagiaire",
        "responsable_scolarite",
        "direction_financiere",
        "chauffeur",
        "proprietaire",
        "commercial",
      ],
      devise: ["EUR", "MAD"],
      mode_paiement: ["virement", "cheque", "especes", "carte", "autre"],
      programme_type: ["INTER", "INTRA"],
      remuneration_mode: ["vacation", "prestation_service", "salarie", "autre"],
      statut_facture: ["brouillon", "envoyee", "payee", "partielle", "annulee"],
      type_enquete: ["a_chaud", "a_froid"],
      type_question: [
        "texte_libre",
        "choix_unique",
        "choix_multiple",
        "echelle_5",
        "echelle_10",
        "oui_non",
        "note_20",
        "matrice",
      ],
      unite_duree: ["heures", "jours"],
    },
  },
} as const
