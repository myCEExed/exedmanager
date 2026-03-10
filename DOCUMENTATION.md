# Documentation EXED Manager 365

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Gestion des utilisateurs](#gestion-des-utilisateurs)
3. [Gestion académique](#gestion-académique)
4. [Gestion financière](#gestion-financière)
5. [Module Transferts](#module-transferts)
6. [Fonctionnalités avancées](#fonctionnalités-avancées)

---

## Vue d'ensemble

EXED Manager 365 est une plateforme complète de gestion d'organisme de formation professionnelle. Elle permet de gérer l'ensemble des opérations académiques, financières et logistiques.

### Rôles utilisateurs (11 rôles)

- **Propriétaire**: Accès complet à toutes les fonctionnalités et gestion des droits
- **Administrateur**: Gestion globale du système et des utilisateurs
- **Responsable Scolarité**: Supervise la scolarité, gère programmes/classes, donne les droits aux gestionnaires
- **Gestionnaire Scolarité**: Modification uniquement sur les programmes attribués, accès CRM et Transferts
- **Direction Financière**: Consultation et export : Dashboard, Performance Financière, Factures, Recouvrements
- **Financier**: Modification : Factures, Contrats, CRM, Restauration. Consultation pour le reste
- **Commercial**: Accès complet au CRM. Consultation : Programmes, Modules, Planning, Clients
- **Collaborateur**: Accès en lecture seule au Dashboard, Documentation et Contenu Pédagogique
- **Enseignant**: Gestion pédagogique et suivi des stagiaires de ses modules
- **Stagiaire**: Accès au contenu de formation, factures (INTER uniquement) et suivi personnel
- **Chauffeur**: Accès au portail chauffeur pour ses missions de transfert

### Modules disponibles

L'application est organisée en modules fonctionnels accessibles via le menu principal:

**Modules administratifs:**
- Dashboard
- Administration
- Gestion des utilisateurs (Stagiaires, Enseignants, Invitations)

**Modules académiques:**
- Programmes de formation
- Classes
- Modules (Catalogue et affectation)
- Contenus pédagogiques
- Devoirs
- Progression

**Modules financiers:**
- Clients
- CRM & Prospects
- Devis & Bons de commande
- Factures
- Paiements
- Recouvrements
- Performance financière

**Modules logistiques:**
- Transferts (Véhicules, Chauffeurs, Hôtels)

**Modules communication:**
- Messages
- Documents

**Portails utilisateurs:**
- Portail Enseignant
- Portail Stagiaire
- Trombinoscope

---

## Dashboard

Le tableau de bord principal offre une vue d'ensemble en temps réel de l'activité de l'organisme de formation.

### Vue d'ensemble

Le Dashboard centralise les indicateurs clés de performance et donne un accès rapide aux fonctionnalités principales.

### Indicateurs affichés

**Métriques académiques:**
- Nombre de programmes actifs
- Nombre de classes en cours
- Nombre de stagiaires inscrits
- Nombre d'enseignants actifs

**Métriques financières:**
- Chiffre d'affaires total
- Factures en attente
- Taux de recouvrement
- Performance par programme

**Alertes et notifications:**
- Modules sans enseignant affecté
- Factures échues
- Invitations en attente
- Documents récents

### Graphiques et visualisations

- Évolution des inscriptions
- Répartition par programme
- Performance financière mensuelle
- Taux de complétion des formations

**Accès rapide:**
- Boutons d'action pour créer rapidement programmes, classes, factures
- Filtres par période
- Export des données

---

## Gestion des utilisateurs

### Stagiaires

Le module Stagiaires permet de gérer l'ensemble des apprenants de l'organisme.

**Accès**: Menu → Stagiaires

**Fonctionnalités:**

**Création et édition:**
- Informations personnelles (nom, prénom, date de naissance)
- Coordonnées (email, téléphone avec indicatif)
- Adresse complète (rue, code postal, ville, pays)
- Photo de profil
- Lien avec compte utilisateur (user_id)

**Import/Export:**
- Import Excel de stagiaires en masse
- Téléchargement du modèle Excel prédéfini
- Export de la liste complète ou par classe
- Validation automatique des données

**Actions:**
- Inscription à une ou plusieurs classes
- Envoi d'invitation pour créer un compte
- Consultation de l'historique (factures, progression)
- Suppression (avec vérification des dépendances)

**Recherche et filtrage:**
- Par nom, prénom, email
- Par classe ou programme
- Par statut d'inscription

---

### Enseignants

Le module Enseignants centralise la gestion du corps enseignant.

**Accès**: Menu → Enseignants

**Informations enregistrées:**

**Données personnelles:**
- Nom et prénom
- Email et téléphone (avec indicatif international)
- Photo de profil
- Lien avec compte utilisateur

**Données professionnelles:**
- Thématiques d'expertise (array)
- Mode de rémunération: Vacation, Prestation de service, Salarié, Autre
- Pays et adresse de résidence
- Dates de séjour (début/fin) pour enseignants internationaux

**Fonctionnalités:**
- Affectation aux modules
- Envoi d'invitations pour créer un compte
- Suivi des transferts et déplacements
- Historique des interventions
- Gestion de la disponibilité

**Tableau de bord enseignant:**
- Liste des modules assignés
- Calendrier des interventions
- Transferts planifiés
- Documents pédagogiques

---

### Clients

Le module Clients gère les entreprises et organisations clientes.

**Accès**: Menu → Clients

**Informations enregistrées:**

**Identification:**
- Nom de l'entreprise
- Code client (unique)
- Secteur d'activité
- Site web

**Coordonnées:**
- Adresse complète
- Téléphone (avec indicatif) et email
- Ville, code postal, pays

**Contact principal:**
- Nom complet
- Fonction
- Email et téléphone

**Relations:**
- Programmes associés
- Historique des formations
- Factures et paiements
- Devis et bons de commande

**Actions:**
- Création de programmes INTRA
- Génération de devis
- Consultation de l'historique financier
- Export des données

---

### Photos de profil

Les stagiaires et enseignants peuvent uploader leur photo de profil depuis leur portail respectif.

**Pour les stagiaires:**
1. Se connecter au portail stagiaire
2. Cliquer sur l'avatar en haut de page
3. Sélectionner une image (max 5 MB, formats: JPG, PNG, GIF)
4. L'image est automatiquement sauvegardée

**Pour les enseignants:**
1. Se connecter au portail enseignant
2. Cliquer sur l'avatar en haut de page
3. Sélectionner une image (max 5 MB, formats: JPG, PNG, GIF)
4. L'image est automatiquement sauvegardée

> **Note**: Les photos uploadées par les utilisateurs depuis leur portail ont la priorité et remplacent celles éventuellement renseignées par l'administration.

### Invitations

Le système permet d'inviter des enseignants et stagiaires par email:
- Génération automatique de liens d'invitation sécurisés
- Expiration après 7 jours
- Suivi des invitations utilisées
- Possibilité de renvoyer une invitation

---

## Gestion académique

### Programmes de formation

- Création de programmes INTER ou INTRA
- Association à un client
- Définition du code programme
- Planification des dates
- Support des programmes rétroactifs

### Classes

- Création de classes rattachées à un programme
- Sous-codes pour identification
- Dates de début et fin
- Suivi des inscriptions

### Modules

- Catalogue de modules réutilisables
- Affectation des modules aux programmes
- Durée en heures ou jours
- Ordre d'enseignement
- Affectation des enseignants

### Contenus pédagogiques

- Upload de ressources (documents, vidéos, liens)
- Organisation par module et classe
- Définition de l'ordre et du caractère obligatoire
- Suivi de progression pour les stagiaires

### Devoirs

Le module Devoirs permet aux enseignants de créer des exercices et évaluations pour les stagiaires.

**Accès**: Menu → Devoirs

**Création de devoir:**
- Titre et description
- Instructions détaillées
- Type de devoir: Exercice, Projet, Examen, QCM, Autre
- Association à une classe et/ou un module
- Dates d'ouverture et limite de soumission
- Points maximum

**Configuration technique:**
- Acceptation de fichiers (oui/non)
- Formats acceptés: PDF, Word, Excel, PowerPoint, Images, Vidéos
- Taille maximale en MB

**Soumission par les stagiaires:**
- Upload de fichier
- Commentaire optionnel
- Statut: En attente, Soumis, Corrigé, Rendu en retard

**Correction par les enseignants:**
- Attribution d'une note
- Commentaires de correction
- Date de correction enregistrée

**Statistiques:**
- Taux de soumission
- Notes moyennes
- Délais de rendu

---

### Progression

Le module Progression assure le suivi de l'avancement des stagiaires dans leur parcours de formation.

**Accès**: Menu → Progression

**Suivi par stagiaire:**
- Liste des modules du programme
- Pourcentage de complétion par module
- Statut: Non commencé, En cours, Complété, Bloqué
- Temps passé (en minutes)
- Date de dernière activité

**Suivi par ressource pédagogique:**
- Ressources consultées vs non consultées
- Ressources obligatoires vs optionnelles
- Temps passé par ressource
- Date de complétion

**Métriques:**
- Pourcentage global de complétion du programme
- Nombre de modules complétés
- Retard éventuel par rapport au calendrier
- Ressources non consultées

**Alertes:**
- Stagiaire en retard sur le calendrier
- Ressources obligatoires non consultées
- Absence de connexion prolongée
- Module bloqué

**Rapports:**
- Export individuel ou par classe
- Graphiques de progression
- Comparaison avec la moyenne de la classe

---

## Gestion financière

### Double comptabilité EUR/MAD

EXED Manager 365 supporte nativement la double comptabilité en Euros (EUR) et Dirhams Marocain (MAD).

#### Taux de change

**Accès**: Menu Administration → Gestion des taux de change

Les administrateurs et financiers peuvent:
- Consulter l'historique des taux
- Ajouter un nouveau taux de change EUR → MAD
- Voir le taux en vigueur
- Ajouter des notes sur chaque taux

**Configuration d'un nouveau taux:**
1. Cliquer sur "Ajouter un taux"
2. Saisir le taux EUR → MAD (ex: 10.80)
3. Sélectionner la date d'application
4. Ajouter des notes explicatives (optionnel)
5. Valider

> **Important**: Le système utilise toujours le taux le plus récent applicable à une date donnée.

#### Saisie en double devise

Toutes les entités financières supportent la double devise:
- **Factures**: Montant total et montants payés
- **Paiements**: Montant des règlements
- **Devis**: Montant HT et TTC
- **Bons de commande**: Montant total
- **Budget items**: Montants prévus et réalisés
- **Coûts programme**: Tous types de coûts

**Fonctionnement:**
1. Sélectionner la devise de saisie (EUR ou MAD)
2. Saisir le montant dans cette devise
3. Le système calcule automatiquement l'équivalent en EUR (devise de référence)
4. Les deux montants sont conservés

#### Affichage des montants

Un bouton de switch EUR/MAD est disponible dans toutes les pages financières:
- **Pages concernées**: Factures, Paiements, Performance financière, Recouvrements
- **Fonctionnement**: Cliquer sur le switch pour basculer entre EUR et MAD
- **Conversion**: Les montants sont convertis en temps réel selon le taux en vigueur

### Factures

- Création de factures par stagiaire ou classe
- Numérotation automatique ou manuelle
- Support multi-devises
- Statuts: Brouillon, Envoyée, Payée, Partielle, Annulée
- Dates d'émission et d'échéance
- Notes et conditions

### Paiements

- Enregistrement des paiements reçus
- Modes: Virement, Chèque, Espèces, Carte, Autre
- Référence de paiement
- Mise à jour automatique du statut de facture
- Support multi-devises

### Recouvrements

- Suivi des factures impayées
- Création de relances automatiques ou manuelles
- Types de relance: Amiable, Formelle, Juridique
- Historique complet des actions

### Performance financière

Tableaux de bord avec:
- KPIs globaux (charges, produits, marge)
- Vue par programme
- Vue par classe
- Graphiques d'évolution
- Export des données
- **Affichage en EUR ou MAD** via le switch de devise

### Budget

- Définition de budgets par programme ou classe
- Types: Produit ou Charge
- Catégories personnalisables
- Suivi prévu vs réalisé
- Support multi-devises

---

## Module Transferts

Le module Transferts permet de gérer l'ensemble de la logistique liée aux déplacements des enseignants.

### Accès

**Menu**: Transferts (accessible aux administrateurs et gestionnaires scolarité)

**4 onglets principaux:**
1. Transferts
2. Véhicules
3. Chauffeurs
4. Hôtels

### Gestion des véhicules

**Informations enregistrées:**
- Marque et modèle
- Immatriculation (unique)
- Type: Voiture, Minibus, Bus
- Capacité (nombre de places)
- Statut: Disponible, En maintenance, En mission
- Notes

**Fonctionnalités:**
- Création, modification, suppression
- Filtrage par statut
- Seuls les véhicules "disponibles" apparaissent lors de la création d'un transfert

### Gestion des chauffeurs

**Informations enregistrées:**
- Nom et prénom
- Téléphone (avec indicatif)
- Email
- Disponibilité (oui/non)
- Notes

**Fonctionnalités:**
- Création, modification, suppression
- Gestion de la disponibilité
- Seuls les chauffeurs disponibles apparaissent lors de la création d'un transfert

### Base de données des hôtels

**Informations enregistrées:**
- Nom de l'hôtel
- Adresse complète
- Ville et pays
- Téléphone (avec indicatif)
- Email
- Site web
- Nombre d'étoiles (1-5)
- Notes

**Fonctionnalités:**
- Création, modification, suppression
- Recherche par ville
- Consultation des informations de contact

### Gestion des transferts

**Informations enregistrées:**
- Enseignant concerné
- Module associé (optionnel)
- Date de départ et date de retour
- Villes de départ et d'arrivée
- Type de transport: Avion, Train, Voiture, Taxi
- Véhicule assigné (si applicable)
- Chauffeur assigné (si applicable)
- Hôtel réservé (si applicable)
- Statut: Planifié, Confirmé, En cours, Terminé, Annulé
- Coût (en EUR ou MAD)
- Notes

**Workflow:**
1. Cliquer sur "Nouveau transfert"
2. Sélectionner l'enseignant
3. Renseigner les informations du trajet
4. Choisir le type de transport
5. Assigner les ressources (véhicule, chauffeur, hôtel) si nécessaire
6. Définir le statut
7. Ajouter le coût si connu
8. Valider

**Tableau de bord:**
- Liste complète des transferts
- Filtrage par enseignant, statut, dates
- Vue d'ensemble des trajets
- Calcul des coûts totaux
- Export possible

**Statuts et codes couleur:**
- 🔵 Planifié: Transfert prévu mais non confirmé
- 🟢 Confirmé: Transfert validé avec toutes les réservations
- 🟡 En cours: Transfert en cours d'exécution
- ⚪ Terminé: Transfert achevé
- 🔴 Annulé: Transfert annulé

---

## Portails utilisateurs

### Portail Enseignant

Le Portail Enseignant est l'interface dédiée aux formateurs pour gérer leurs interventions.

**Accès**: Menu → Portail Enseignant (réservé au rôle "enseignant")

**Tableau de bord:**
- Vue d'ensemble des modules assignés
- Calendrier des prochaines interventions
- Transferts planifiés
- Alertes et notifications

**Mes modules:**
- Liste des modules affectés
- Classes concernées
- Dates d'intervention
- Durée en heures ou jours
- Statut des affectations

**Gestion pédagogique:**
- Upload de ressources pédagogiques
- Création et gestion des devoirs
- Correction des soumissions
- Attribution des notes et commentaires

**Mes stagiaires:**
- Liste des stagiaires par classe
- Consultation des profils
- Suivi de la progression
- Historique des évaluations

**Documents:**
- Accès aux documents de cours
- Upload de supports pédagogiques
- Partage avec les stagiaires

**Profil:**
- Modification des informations personnelles
- Upload de photo de profil
- Mise à jour des disponibilités
- Consultation des transferts

---

### Portail Stagiaire

Le Portail Stagiaire est l'interface d'apprentissage des apprenants.

**Accès**: Menu → Portail Stagiaire (réservé au rôle "stagiaire")

**Tableau de bord:**
- Vue d'ensemble du programme
- Progression globale
- Prochains devoirs à rendre
- Nouveaux contenus disponibles
- Messages reçus

**Ma formation:**
- Programme complet
- Liste des modules
- Calendrier des sessions
- Enseignants assignés

**Contenus pédagogiques:**
- Ressources par module
- Documents à télécharger
- Vidéos à visionner
- Liens externes
- Marquage des ressources consultées

**Mes devoirs:**
- Devoirs à venir
- Devoirs en cours
- Devoirs soumis (en attente de correction)
- Devoirs corrigés (avec notes et commentaires)
- Upload de fichiers
- Historique des soumissions

**Ma progression:**
- Pourcentage de complétion par module
- Temps passé
- Ressources consultées
- Notes obtenues
- Graphiques de progression

**Messages:**
- Messages reçus de l'administration
- Notifications système

**Mon profil:**
- Informations personnelles
- Upload de photo de profil
- Coordonnées
- Classe et programme

---

## Fonctionnalités avancées

### Administration

Le module Administration centralise les paramètres et configurations du système.

**Accès**: Menu → Administration (réservé aux administrateurs)

**Gestion des utilisateurs:**
- Rôles et permissions
- Création de comptes administratifs
- Gestion des accès

**Configuration système:**
- Paramètres généraux
- Gestion des taux de change EUR/MAD
- Configuration des emails
- Intégration Brevo

**Maintenance:**
- Logs système
- Statistiques d'utilisation
- Sauvegarde des données

**Sécurité:**
- Gestion des sessions
- Politique de mots de passe
- Audit des connexions

---

### CRM & Prospects

Le module CRM permet de gérer le cycle commercial complet, de la prospection à la conversion en client.

**Accès**: Menu → CRM

**Gestion des prospects:**

**Informations enregistrées:**
- Nom et prénom
- Email et téléphone (avec indicatif)
- Entreprise et poste
- Secteur d'activité
- Adresse complète (rue, code postal, ville, pays)
- Source du prospect (salon, recommandation, site web, etc.)
- Statut: Nouveau, Contacté, Qualifié, Proposition envoyée, Négociation, Gagné, Perdu
- Notes et historique des interactions

**Fonctionnalités:**
- Création et édition de fiches prospects
- Suivi de l'évolution du statut
- Historique complet des interactions
- Recherche et filtrage par statut, secteur, source
- Conversion prospect → client en un clic
- Export des données

**Intégration Brevo:**
- Synchronisation automatique des contacts avec Brevo
- Mise à jour bidirectionnelle des informations
- Suivi des campagnes email
- Gestion des listes de diffusion

**Statistiques:**
- Taux de conversion par source
- Temps moyen de conversion
- Pipeline des opportunités
- Prévisions de revenus

**Actions rapides:**
- Envoyer un email
- Créer un devis
- Planifier un rappel
- Ajouter une note d'interaction
- Convertir en client

### Devis & Bons de commande

Le module Devis & Bons de commande gère le processus commercial depuis la proposition jusqu'à la commande confirmée.

**Accès**: Menu → Devis ou Bons de commande

#### Devis

**Création d'un devis:**
- Numéro de devis (automatique ou manuel)
- Client ou prospect associé
- Date d'émission et date de validité
- Devise de saisie (EUR ou MAD)
- Description générale
- Conditions commerciales
- Notes internes

**Lignes de devis:**
- Désignation du produit/service
- Quantité
- Prix unitaire
- Montant total (calculé automatiquement)
- Ajout/suppression de lignes illimité

**Calculs automatiques:**
- Montant HT
- TVA (taux configurable)
- Montant TTC
- Conversion automatique en EUR (devise de référence)

**Statuts:**
- Brouillon: En cours d'élaboration
- Envoyé: Transmis au client
- Accepté: Validé par le client
- Refusé: Rejeté par le client
- Expiré: Date de validité dépassée

**Actions:**
- Édition et modification
- Envoi par email
- Export PDF
- Conversion en bon de commande
- Duplication pour nouveau devis
- Annulation

#### Bons de commande

**Création d'un bon de commande:**
- Depuis un devis accepté (conversion automatique)
- Création directe
- Numéro de BC (automatique ou manuel)
- Date d'émission
- Date de livraison prévue
- Référence au devis d'origine (si applicable)

**Informations:**
- Client
- Programme associé (optionnel)
- Montant total
- Devise de saisie
- Conditions de paiement
- Notes

**Statuts:**
- En attente: Commande créée
- Confirmé: Commande validée
- En cours: Commande en traitement
- Livré: Commande livrée
- Annulé: Commande annulée

**Suivi:**
- Historique des modifications
- Lien avec les factures générées
- État de paiement
- Documents associés

**Fonctionnalités avancées:**
- Support multi-devises complet
- Calculs automatiques HT/TTC
- Conversion automatique en EUR
- Modèles de devis personnalisables
- Historique complet des versions
- Alertes sur devis expirés

### Messagerie

Le module Messagerie facilite la communication entre l'administration, les enseignants et les stagiaires.

**Accès**: Menu → Messages

**Types de messages:**

**1. Messages collectifs:**
- Envoi à une classe entière
- Envoi à plusieurs classes simultanément
- Envoi par programme
- Diffusion générale (tous les stagiaires)

**2. Messages individuels:**
- Message à un stagiaire spécifique
- Message à un enseignant
- Réponses aux messages reçus

**Création d'un message:**

**Informations requises:**
- Destinataires (classe, stagiaire individuel, enseignant)
- Sujet du message
- Contenu (éditeur de texte riche)
- Pièces jointes (optionnel)
- Priorité: Normale, Importante, Urgente

**Fonctionnalités:**
- Éditeur de texte avec mise en forme
- Insertion de liens
- Upload de fichiers joints
- Brouillons automatiques
- Prévisualisation avant envoi

**Notifications:**
- Email automatique aux destinataires
- Notification dans le portail utilisateur
- Badge de messages non lus
- Indicateur de lecture

**Gestion des messages:**

**Boîte de réception:**
- Messages reçus
- Filtrage par statut (lu/non lu)
- Recherche par expéditeur, sujet, date
- Marquage comme lu/non lu
- Suppression

**Messages envoyés:**
- Historique complet
- Statut de lecture par destinataire
- Possibilité de renvoyer
- Export des conversations

**Fonctionnalités avancées:**
- Modèles de messages réutilisables
- Programmation d'envoi différé
- Accusés de réception
- Statistiques de lecture
- Archivage automatique
- Recherche avancée dans l'historique

**Permissions:**
- Administrateurs: Envoi à tous
- Gestionnaires scolarité: Envoi à leurs classes
- Enseignants: Envoi aux stagiaires de leurs classes
- Stagiaires: Réception uniquement (pas d'envoi)

### Documents

Le module Documents centralise la gestion et le partage de tous les fichiers de l'organisme.

**Accès**: Menu → Documents

**Upload de documents:**

**Informations à renseigner:**
- Titre du document
- Description (optionnelle)
- Type de fichier (détecté automatiquement)
- Classe associée (optionnelle)
- Module associé (optionnel)
- Fichier à uploader

**Types de fichiers supportés:**
- Documents: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- Présentations: PowerPoint (.ppt, .pptx)
- Images: JPG, PNG, GIF, WebP
- Autres: TXT, CSV

**Taille maximale:** 10 MB par fichier

**Organisation:**

**Par catégorie:**
- Documents administratifs
- Contenus pédagogiques
- Ressources enseignants
- Documents financiers
- Documents contractuels

**Par classe:**
- Tous les documents liés à une classe spécifique
- Accès facilité pour les stagiaires de la classe
- Filtrage automatique par classe

**Par module:**
- Documents spécifiques à un module
- Supports de cours
- Exercices et corrigés
- Documents complémentaires

**Recherche et filtrage:**

**Critères de recherche:**
- Par titre ou description
- Par type de fichier
- Par classe
- Par module
- Par date d'upload
- Par auteur

**Filtres rapides:**
- Documents récents (7 derniers jours)
- Mes uploads
- Documents partagés avec moi
- Favoris

**Gestion des permissions:**

**Niveaux d'accès:**
- **Public**: Accessible à tous les utilisateurs authentifiés
- **Classe**: Accessible uniquement aux membres de la classe
- **Module**: Accessible aux enseignants et stagiaires du module
- **Restreint**: Liste de destinataires spécifiques
- **Privé**: Visible uniquement par l'auteur et administrateurs

**Actions disponibles:**
- Téléchargement
- Prévisualisation (pour PDF et images)
- Modification des métadonnées
- Changement de permissions
- Suppression (avec confirmation)
- Partage par lien

**Fonctionnalités avancées:**
- Versioning des documents (historique des modifications)
- Commentaires sur les documents
- Favoris et collections personnelles
- Notifications de nouveaux documents
- Export de liste de documents
- Statistiques de téléchargement

**Stockage:**
- Stockage sécurisé dans le cloud
- Sauvegarde automatique
- Espace de stockage par organisation
- Gestion automatique des doublons

### Trombinoscope

Le module Trombinoscope permet de générer des fiches visuelles des stagiaires par classe.

**Accès**: Menu → Trombinoscope

**Fonctionnalités:**

**Sélection de la classe:**
- Liste déroulante de toutes les classes
- Filtrage par programme
- Classes actives uniquement ou historique complet
- Nombre de stagiaires affiché par classe

**Affichage en ligne:**

**Vue grille:**
- Photos des stagiaires en mosaïque
- Nom et prénom sous chaque photo
- Email et téléphone (au survol)
- Disposition responsive
- Zoom sur les photos

**Informations affichées:**
- Photo de profil (ou avatar par défaut)
- Nom complet
- Email
- Téléphone avec indicatif
- Programme et classe
- Date d'inscription

**Export Word:**

**Génération automatique:**
1. Sélectionner la classe
2. Cliquer sur "Exporter en Word"
3. Document généré automatiquement
4. Téléchargement immédiat

**Contenu du document:**
- Page de garde avec logo et titre
- Informations de la classe (nom, programme, dates)
- Grille de photos professionnelle
- Nom et coordonnées sous chaque photo
- Mise en page automatique et uniforme
- Format adapté à l'impression

**Mise en page:**
- Format A4
- 4 à 6 stagiaires par page
- Photos alignées et dimensionnées uniformément
- En-têtes et pieds de page personnalisés
- Table des matières si nécessaire

**Options d'export:**
- Avec ou sans coordonnées
- Format portrait ou paysage
- Taille des photos ajustable
- Ordre alphabétique ou personnalisé
- Inclusion d'informations supplémentaires (date de naissance, etc.)

**Cas d'usage:**

**Enseignants:**
- Mémoriser les noms et visages
- Distribution aux enseignants en début de formation
- Liste d'émargement visuelle

**Administration:**
- Constitution de dossiers
- Archives de promotion
- Communication interne

**Stagiaires:**
- Faciliter les échanges entre pairs
- Créer une cohésion de groupe
- Souvenirs de formation

**Gestion des photos:**
- Photos uploadées par les stagiaires depuis leur portail
- Photos renseignées par l'administration
- Avatar par défaut si pas de photo
- Mise à jour en temps réel
- Qualité optimisée pour l'export

**Permissions:**
- Administrateurs: Accès complet
- Gestionnaires scolarité: Leurs classes uniquement
- Enseignants: Classes où ils interviennent
- Stagiaires: Consultation de leur propre classe

### Chatbot IA

Le Chatbot IA est un assistant intelligent intégré qui aide les utilisateurs à naviguer dans l'application.

**Accès**: Icône de chat en bas à droite de chaque page

**Fonctionnalités:**

**Aide contextuelle:**
- Répond aux questions sur la page en cours
- Explique les fonctionnalités disponibles
- Guide pas à pas pour les tâches complexes
- Suggère des actions selon le contexte

**Questions fréquentes:**
- Base de connaissances intégrée
- Réponses instantanées aux questions courantes
- Exemples d'utilisation
- Tutoriels interactifs

**Capacités:**
- Compréhension du langage naturel
- Réponses en français
- Apprentissage continu
- Disponible 24/7

**Types de questions supportées:**
- "Comment créer un nouveau stagiaire?"
- "Comment changer le taux de change?"
- "Où trouver les factures impayées?"
- "Comment exporter un trombinoscope?"
- "Quels sont les rôles disponibles?"

**Interface:**
- Fenêtre de chat flottante
- Historique des conversations
- Suggestions de questions
- Liens directs vers les pages concernées
- Possibilité de noter les réponses

**Avantages:**
- Gain de temps pour les utilisateurs
- Réduction des demandes au support
- Formation continue intégrée
- Aide à la découverte des fonctionnalités

**Configuration:**
- Personnalisation des réponses
- Ajout de questions spécifiques à l'organisation
- Mise à jour automatique de la base de connaissances
- Analytique des questions posées

### Excel Import/Export

EXED Manager 365 offre des fonctionnalités complètes d'import et export Excel pour faciliter la gestion des données.

**Accès**: Boutons Import/Export dans les différents modules

#### Import Excel

**Modules supportant l'import:**

**1. Stagiaires:**
- Téléchargement du modèle Excel prédéfini
- Colonnes obligatoires: Nom, Prénom, Email
- Colonnes optionnelles: Téléphone, Adresse, Date de naissance, etc.
- Validation automatique des données
- Détection des doublons par email
- Rapport d'import détaillé

**Processus d'import:**
1. Télécharger le modèle Excel
2. Remplir le fichier avec les données
3. Uploader le fichier dans l'interface
4. Validation automatique
5. Correction des erreurs si nécessaire
6. Import final avec rapport de résultats

**Validations effectuées:**
- Format email correct
- Téléphone avec indicatif valide
- Date de naissance au format correct
- Codes postaux valides
- Détection des doublons
- Champs obligatoires remplis

**Gestion des erreurs:**
- Rapport ligne par ligne
- Identification des erreurs
- Suggestions de correction
- Import partiel possible (lignes valides uniquement)

#### Export Excel

**Données exportables:**

**1. Stagiaires:**
- Liste complète ou par classe
- Coordonnées complètes
- Historique des inscriptions
- Factures associées
- Progression dans les formations

**2. Factures et Paiements:**
- Liste des factures (toutes ou filtrées)
- Détails des paiements
- États de règlement
- Historique des relances
- Montants en EUR et MAD

**3. Performance financière:**
- KPIs par programme
- KPIs par classe
- Répartition des charges
- Évolution du CA
- Analyse des marges

**4. Données académiques:**
- Liste des classes avec effectifs
- Planning des modules
- Affectations enseignants
- Progression des stagiaires
- Statistiques de devoirs

**5. Transferts:**
- Planning complet des transferts
- Coûts par enseignant
- Répartition par destination
- Occupation des véhicules

**Format d'export:**
- Fichier .xlsx (Excel)
- Formatage automatique
- En-têtes colorés
- Colonnes auto-dimensionnées
- Filtres activés
- Lignes d'en-tête figées

**Options d'export:**
- Export complet ou filtré
- Choix des colonnes à exporter
- Ordre des colonnes personnalisable
- Format de date sélectionnable
- Devise d'affichage (EUR ou MAD)

**Fonctionnalités avancées:**
- Export avec formules Excel
- Graphiques intégrés (pour performance)
- Feuilles multiples (classeurs)
- Mise en page prête pour impression
- Export programmé et automatique

---

## Support et assistance

### Documentation technique

- `DESIGN_SYSTEM.md`: Système de design et charte graphique
- `MOBILE_GUIDE.md`: Guide d'optimisation mobile
- `LAYOUT_GUIDELINES.md`: Directives de mise en page
- `CHATBOT_GUIDE.md`: Configuration du chatbot

### Contact

Pour toute question ou assistance:
- Utiliser le chatbot intégré
- Contacter votre administrateur système
- Consulter la documentation en ligne

---

## Mises à jour récentes

### Version actuelle

**Nouvelles fonctionnalités:**

1. **Module Transferts complet** (Novembre 2024)
   - Gestion des véhicules
   - Gestion des chauffeurs
   - Base de données d'hôtels
   - Planification et suivi des transferts d'enseignants

2. **Double comptabilité EUR/MAD** (Novembre 2024)
   - Gestion des taux de change
   - Saisie en double devise
   - Switch d'affichage EUR/MAD
   - Conversion automatique

3. **Photos de profil** (Novembre 2024)
   - Upload par les stagiaires
   - Upload par les enseignants
   - Validation automatique
   - Stockage sécurisé

**Améliorations:**
- Performance accrue des tableaux de bord
- Interface utilisateur optimisée
- Meilleure gestion des erreurs
- Export Excel amélioré

---

## Bonnes pratiques

### Saisie des données

- **Programmes**: Utiliser des codes courts et explicites
- **Classes**: Maintenir une nomenclature cohérente
- **Factures**: Numéroter de façon séquentielle
- **Taux de change**: Mettre à jour régulièrement

### Organisation

- **Documents**: Organiser par module/classe
- **Transferts**: Planifier à l'avance
- **Budget**: Réviser mensuellement
- **Invitations**: Envoyer 2 semaines avant le début

### Sécurité

- Ne jamais partager ses identifiants
- Se déconnecter après chaque session
- Vérifier les données sensibles
- Sauvegarder régulièrement

### Performance

- Utiliser les filtres pour limiter l'affichage
- Exporter les données pour analyse externe
- Nettoyer les données obsolètes
- Archiver les anciens programmes

---

## FAQ

### Questions générales

**Q: Comment changer la devise d'affichage?**  
R: Utilisez le switch EUR/MAD disponible en haut des pages financières.

**Q: Qui peut modifier les taux de change?**  
R: Seuls les administrateurs et financiers peuvent ajouter des taux de change.

**Q: Les photos de profil sont-elles obligatoires?**  
R: Non, mais elles améliorent l'identification des utilisateurs.

### Module Transferts

**Q: Puis-je modifier un transfert déjà confirmé?**  
R: Oui, il suffit de changer le statut puis modifier les informations.

**Q: Comment savoir quels véhicules sont disponibles?**  
R: Seuls les véhicules avec le statut "disponible" apparaissent dans la liste.

**Q: Peut-on gérer plusieurs transferts pour un même enseignant?**  
R: Oui, un enseignant peut avoir plusieurs transferts planifiés.

### Finances

**Q: Dans quelle devise dois-je saisir mes factures?**  
R: Vous pouvez saisir dans la devise de votre choix (EUR ou MAD). Le système convertit automatiquement.

**Q: Comment sont calculées les conversions?**  
R: Le système utilise le taux de change en vigueur à la date de la transaction.

**Q: Puis-je modifier un paiement déjà enregistré?**  
R: Oui, si vous avez les droits nécessaires (admin, gestionnaire scolarité, financier).

---

*Documentation mise à jour le: Novembre 2024*  
*Version: 2.0*