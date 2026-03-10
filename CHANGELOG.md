# Changelog - EXED Manager 365

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

---

## [2.0.0] - Novembre 2024

### 🎉 Nouvelles fonctionnalités majeures

#### Module Transferts
- **Gestion des véhicules**: Ajout, modification et suivi des véhicules (voiture, minibus, bus)
- **Gestion des chauffeurs**: Base de données complète avec disponibilité
- **Base de données des hôtels**: Centralisation des informations d'hébergement
- **Planification des transferts**: Organisation complète des déplacements d'enseignants
  - Association enseignant, module, dates
  - Assignation de ressources (véhicule, chauffeur, hôtel)
  - Suivi des statuts (planifié, confirmé, en cours, terminé, annulé)
  - Gestion des coûts en double devise

#### Double comptabilité EUR/MAD
- **Gestion des taux de change**: Interface dédiée pour les administrateurs et financiers
  - Ajout manuel des taux EUR → MAD
  - Historique complet avec dates d'application
  - Notes explicatives pour chaque taux
- **Saisie multi-devises**: Toutes les entités financières supportent EUR et MAD
  - Factures, paiements, devis, bons de commande
  - Budget items et coûts de programmes
  - Conservation des montants dans les deux devises
- **Switch d'affichage**: Bouton EUR/MAD dans toutes les pages financières
  - Conversion en temps réel selon le taux en vigueur
  - Disponible sur: Factures, Paiements, Performance financière, Recouvrements

#### Photos de profil utilisateur
- **Upload stagiaires**: Les stagiaires peuvent uploader leur photo depuis leur portail
- **Upload enseignants**: Les enseignants peuvent uploader leur photo depuis leur portail
- **Validation automatique**: 
  - Formats acceptés: JPG, PNG, GIF
  - Taille maximale: 5 MB
  - Prévisualisation avant sauvegarde
- **Stockage sécurisé**: Buckets Supabase avec RLS appropriées
- **Priorité utilisateur**: Les photos uploadées par les utilisateurs sont prioritaires

### 🔧 Améliorations techniques

#### Base de données
- Nouvelles tables: `vehicules`, `chauffeurs`, `hotels`, `transferts`, `taux_change`
- Enum `devise` pour standardisation (EUR, MAD)
- Nouvelles colonnes de devise sur toutes les tables financières
- Fonctions SQL: `get_current_exchange_rate()`, `convert_currency()`
- RLS policies complètes pour toutes les nouvelles tables
- Triggers automatiques pour `updated_at`

#### Frontend
- Nouveaux composants transferts: `TransfertsTab`, `VehiculesTab`, `ChauffeursTab`, `HotelsTab`
- Composant `ProfilePhotoUpload` réutilisable
- Hook `useCurrency` pour gestion globale de la devise
- Composants `CurrencySwitch` et `ExchangeRateManager`
- Intégration dans `App.tsx` avec `CurrencyProvider`

#### Sécurité
- RLS policies adaptées par rôle utilisateur
- Validation des uploads de fichiers
- Permissions granulaires sur les transferts
- Contrôle d'accès sur les taux de change

### 📖 Documentation
- **DOCUMENTATION.md**: Guide utilisateur complet (nouveau)
- **README.md**: Vue d'ensemble mise à jour
- **CHANGELOG.md**: Suivi des versions (nouveau)
- Tous les guides existants maintenus et référencés

---

## [1.0.0] - Octobre 2024

### Fonctionnalités de base

#### Gestion académique
- Programmes de formation (INTER/INTRA)
- Classes et modules
- Inscriptions stagiaires
- Affectations enseignants
- Contenus pédagogiques
- Devoirs et évaluations

#### Gestion financière
- Factures
- Paiements
- Recouvrements et relances
- Budget et performance
- Devis et bons de commande

#### Gestion des utilisateurs
- Système de rôles (6 niveaux)
- Portails dédiés (enseignant, stagiaire)
- Invitations par email
- Profils utilisateurs

#### Fonctionnalités avancées
- CRM et gestion des prospects
- Messagerie intégrée
- Documents et ressources
- Chatbot IA
- Export/Import Excel
- Trombinoscope

#### Interface
- Design system bordeaux/violet
- Mode sombre
- Responsive mobile/tablette
- Sidebar avec navigation

---

## À venir

### Version 2.1 (Planifié)

#### Améliorations transferts
- [ ] Statistiques de transferts
- [ ] Calendrier visuel des déplacements
- [ ] Notifications automatiques
- [ ] Export/Import des plannings
- [ ] Calcul automatique des distances

#### Améliorations finances
- [ ] Rapports financiers avancés
- [ ] Graphiques de l'évolution des taux
- [ ] Alertes de fluctuation des devises
- [ ] Budget prévisionnel vs réalisé amélioré
- [ ] Export comptable personnalisé

#### Expérience utilisateur
- [ ] Mode hors ligne
- [ ] Application mobile native
- [ ] Notifications push
- [ ] Recherche globale améliorée
- [ ] Dashboard personnalisable

---

## Notes de version

### Migration v1.0 → v2.0

**Base de données:**
- Exécuter les migrations automatiquement (gérées par Supabase)
- Aucune perte de données
- Nouveaux champs optionnels sur tables existantes

**Utilisateurs:**
- Aucune action requise
- Nouvelles fonctionnalités disponibles immédiatement
- Photos de profil optionnelles

**Administrateurs:**
- Configurer le taux de change initial
- Créer la base de données des véhicules/chauffeurs/hôtels si besoin
- Former les équipes sur les nouvelles fonctionnalités

---

## Support

Pour toute question sur une version spécifique:
- Consulter la [Documentation](./DOCUMENTATION.md)
- Utiliser le chatbot intégré
- Contacter l'équipe support

---

*Format de versioning: [Majeur.Mineur.Patch]*
- Majeur: Changements incompatibles ou fonctionnalités majeures
- Mineur: Nouvelles fonctionnalités compatibles
- Patch: Corrections de bugs