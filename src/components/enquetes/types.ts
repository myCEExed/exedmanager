// Types pour le système d'enquêtes

export type TypeQuestion = 
  | 'texte_libre'
  | 'choix_unique'
  | 'choix_multiple'
  | 'echelle_5'
  | 'echelle_10'
  | 'oui_non'
  | 'note_20'
  | 'matrice';

export type TypeEnquete = 'a_chaud' | 'a_froid';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface MatriceConfig {
  lignes: string[];
  colonnes: string[];
}

export interface QuestionCondition {
  questionId: string;
  valeurs: string[];
}

export interface ModeleEnquete {
  id: string;
  nom: string;
  description: string | null;
  type_enquete: TypeEnquete;
  est_actif: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModeleEnqueteQuestion {
  id: string;
  modele_id: string;
  question: string;
  type_question: TypeQuestion;
  options: QuestionOption[] | MatriceConfig | null;
  obligatoire: boolean;
  ordre: number;
  condition_question_id: string | null;
  condition_valeur: string[] | null;
  created_at: string;
}

export interface Enquete {
  id: string;
  titre: string;
  description: string | null;
  type_enquete: TypeEnquete;
  modele_id: string | null;
  programme_id: string | null;
  classe_id: string | null;
  module_id: string | null;
  date_session: string | null;
  date_debut: string | null;
  date_fin: string | null;
  est_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueteQuestion {
  id: string;
  enquete_id: string;
  question: string;
  type_question: TypeQuestion;
  options: QuestionOption[] | MatriceConfig | null;
  obligatoire: boolean;
  ordre: number;
  condition_question_id: string | null;
  condition_valeur: string[] | null;
  created_at: string;
}

export interface EnqueteReponse {
  id: string;
  enquete_id: string;
  stagiaire_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueteReponseDetail {
  id: string;
  reponse_id: string;
  question_id: string;
  valeur_texte: string | null;
  valeur_numerique: number | null;
  valeur_json: any;
  created_at: string;
}

// Pour les statistiques et résultats
export interface QuestionStats {
  question: EnqueteQuestion;
  totalReponses: number;
  moyenneNumerique?: number;
  distribution?: { [key: string]: number };
  reponsesTexte?: string[];
}

export interface EnqueteResultats {
  enquete: Enquete;
  totalRepondants: number;
  totalInscrits: number;
  tauxParticipation: number;
  questionsStats: QuestionStats[];
}

// Labels pour l'affichage
export const TYPE_QUESTION_LABELS: Record<TypeQuestion, string> = {
  texte_libre: 'Texte libre',
  choix_unique: 'Choix unique',
  choix_multiple: 'Choix multiple',
  echelle_5: 'Échelle 1-5',
  echelle_10: 'Échelle 1-10',
  oui_non: 'Oui/Non',
  note_20: 'Note sur 20',
  matrice: 'Matrice'
};

export const TYPE_ENQUETE_LABELS: Record<TypeEnquete, string> = {
  a_chaud: 'Évaluation à chaud',
  a_froid: 'Évaluation à froid'
};
