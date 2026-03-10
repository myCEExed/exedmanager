import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Euro, 
  FileText, 
  Settings, 
  Download,
  Printer,
  Shield,
  Building2,
  Receipt,
  TrendingUp,
  MessageSquare,
  Library,
  ClipboardCheck,
  BarChart3,
  Car,
  Target,
  Utensils,
  QrCode,
  FlaskConical
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Documentation = () => {
  const [activeTab, setActiveTab] = useState("introduction");
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Clone the document
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Remove unnecessary elements (nav, buttons, etc.)
    const elementsToRemove = clone.querySelectorAll('nav, header, .no-print, button');
    elementsToRemove.forEach(el => el.remove());
    
    // Create a standalone HTML file
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exed Manager 365 - Manuel d'utilisation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8f9fa;
        }
        h1 { color: #1a1a1a; font-size: 2.5rem; margin: 2rem 0; border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; }
        h2 { color: #2563eb; font-size: 2rem; margin: 1.5rem 0 1rem; }
        h3 { color: #1e40af; font-size: 1.5rem; margin: 1.5rem 0 1rem; }
        h4 { color: #3730a3; font-size: 1.25rem; margin: 1rem 0; }
        p { margin: 0.75rem 0; }
        ul, ol { margin: 1rem 0 1rem 2rem; }
        li { margin: 0.5rem 0; }
        .card { 
            background: white; 
            border-radius: 8px; 
            padding: 1.5rem; 
            margin: 1rem 0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .icon { display: inline-block; margin-right: 0.5rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
        th { background: #2563eb; color: white; }
        .badge { 
            display: inline-block; 
            padding: 0.25rem 0.75rem; 
            border-radius: 12px; 
            font-size: 0.875rem; 
            font-weight: 600;
            margin: 0.25rem;
        }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-purple { background: #ede9fe; color: #5b21b6; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin: 1rem 0; }
        .info { background: #dbeafe; border-left: 4px solid #2563eb; padding: 1rem; margin: 1rem 0; }
        .success { background: #dcfce7; border-left: 4px solid #16a34a; padding: 1rem; margin: 1rem 0; }
        @media print {
            body { background: white; }
            .card { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
            h1, h2, h3 { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    ${clone.querySelector('.documentation-content')?.innerHTML || ''}
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exed-manager-365-documentation.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header with export buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 no-print">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Exed Manager 365
            </h1>
            <p className="text-xl text-muted-foreground">
              Manuel d'utilisation complet
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer en PDF
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exporter HTML
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="documentation-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto no-print pb-2">
              <TabsList className="inline-flex h-auto p-2 gap-3 min-w-max">
                <TabsTrigger value="introduction" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <BookOpen className="h-4 w-4" />
                  Introduction
                </TabsTrigger>
                <TabsTrigger value="proprietaire" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Shield className="h-4 w-4" />
                  Propriétaire
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Settings className="h-4 w-4" />
                  Administrateur
                </TabsTrigger>
                <TabsTrigger value="scolarite" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Users className="h-4 w-4" />
                  Scolarité
                </TabsTrigger>
                <TabsTrigger value="financier" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Euro className="h-4 w-4" />
                  Finance
                </TabsTrigger>
                <TabsTrigger value="commercial" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Target className="h-4 w-4" />
                  Commercial
                </TabsTrigger>
                <TabsTrigger value="enseignant" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <GraduationCap className="h-4 w-4" />
                  Enseignant
                </TabsTrigger>
                <TabsTrigger value="stagiaire" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Users className="h-4 w-4" />
                  Stagiaire
                </TabsTrigger>
                <TabsTrigger value="lms" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <Library className="h-4 w-4" />
                  LMS
                </TabsTrigger>
                <TabsTrigger value="nouveautes" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <TrendingUp className="h-4 w-4" />
                  Nouveautés
                </TabsTrigger>
                <TabsTrigger value="guide-tests" className="gap-2 px-4 py-2.5 whitespace-nowrap">
                  <FlaskConical className="h-4 w-4" />
                  Guide Tests
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Introduction */}
            <TabsContent value="introduction" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    Bienvenue sur Exed Manager 365
                  </CardTitle>
                  <CardDescription>
                    Plateforme complète de gestion pour l'Executive Education
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Vue d'ensemble</h3>
                    <p>
                      <strong>Exed Manager 365</strong> est une solution intégrée combinant un système ERP 
                      (Enterprise Resource Planning) et un LMS (Learning Management System) spécialement 
                      conçue pour CentraleSupélec EXED Campus Casablanca.
                    </p>
                  </div>

                  <div className="bg-info rounded-lg p-4">
                    <h4 className="font-semibold mb-2">🎯 Objectif principal</h4>
                    <p>
                      Digitaliser et optimiser l'ensemble du parcours de formation executive education, 
                      de l'inscription à la certification, tout en optimisant la gestion financière et administrative.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Modules principaux</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Gestion Administrative
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Programmes INTER et INTRA</li>
                            <li>Classes et modules</li>
                            <li>Clients et partenaires</li>
                            <li>Enseignants et stagiaires</li>
                            <li>Inscriptions</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Euro className="h-5 w-5" />
                            Gestion Financière
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Facturation</li>
                            <li>Paiements et recouvrements</li>
                            <li>Budget prévisionnel</li>
                            <li>Performance financière</li>
                            <li>KPIs et tableaux de bord</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Library className="h-5 w-5" />
                            LMS Pédagogique
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Contenu multimédia</li>
                            <li>Devoirs et corrections</li>
                            <li>Suivi de progression</li>
                            <li>Ressources pédagogiques</li>
                            <li>Portails dédiés</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Communication
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Messagerie interne</li>
                            <li>Documents partagés</li>
                            <li>Invitations sécurisées</li>
                            <li>Assistant IA</li>
                            <li>Système d'alertes</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Les 11 rôles utilisateurs</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-purple">Propriétaire</span>
                        <span>Accès complet à toutes les fonctionnalités et gestion des droits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue">Administrateur</span>
                        <span>Gestion globale du système et des utilisateurs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue">Responsable Scolarité</span>
                        <span>Supervise la scolarité, gère programmes/classes, donne les droits aux gestionnaires</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue">Gestionnaire Scolarité</span>
                        <span>Modification uniquement sur les programmes attribués, accès CRM et Transferts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-green">Direction Financière</span>
                        <span>Consultation et export : Dashboard, Performance Financière, Factures, Recouvrements</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-green">Financier</span>
                        <span>Modification : Factures, Contrats, CRM, Restauration. Consultation pour le reste</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-green">Commercial</span>
                        <span>Accès complet au CRM. Consultation : Programmes, Modules, Planning, Clients</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-yellow">Collaborateur</span>
                        <span>Accès en lecture seule au Dashboard, Documentation et Contenu Pédagogique</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue">Enseignant</span>
                        <span>Gestion pédagogique et suivi des stagiaires de ses modules</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-green">Stagiaire</span>
                        <span>Accès au contenu de formation, factures (INTER uniquement) et suivi personnel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-yellow">Chauffeur</span>
                        <span>Accès au portail chauffeur pour ses missions de transfert</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-warning rounded-lg p-4">
                    <h4 className="font-semibold mb-2">📝 Note importante</h4>
                    <p>
                      Ce manuel couvre l'utilisation de la plateforme pour chaque rôle. Utilisez les onglets 
                      ci-dessus pour naviguer vers la section correspondant à votre rôle.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Propriétaire */}
            <TabsContent value="proprietaire" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    Guide Propriétaire
                  </CardTitle>
                  <CardDescription>
                    Accès complet et gestion des droits utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Responsabilités</h3>
                    <p>
                      Le rôle de <strong>Propriétaire</strong> dispose de tous les privilèges de la plateforme. 
                      C'est le rôle le plus élevé avec accès à toutes les fonctionnalités, incluant :
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Gestion complète des utilisateurs et attribution des rôles</li>
                      <li>Configuration globale de la plateforme</li>
                      <li>Accès à toutes les données (académiques, financières, administratives)</li>
                      <li>Gestion des clients et partenaires stratégiques</li>
                      <li>Supervision de la performance globale</li>
                      <li>Gestion des programmes et classes</li>
                      <li>Contrôle financier total</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Administration des utilisateurs</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">1. Accéder à l'administration</h4>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu latéral {">"} Administration (icône bouclier)</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">2. Gérer les rôles utilisateurs</h4>
                    <p>Dans la page Administration, vous pouvez :</p>
                    <ul className="list-disc list-inside space-y-1 my-3">
                      <li>Voir tous les utilisateurs inscrits</li>
                      <li>Attribuer ou modifier les rôles</li>
                      <li>Désactiver des comptes</li>
                      <li>Visualiser l'activité des utilisateurs</li>
                    </ul>

                    <div className="bg-warning rounded-lg p-4">
                      <p><strong>⚠️ Attention :</strong> L'attribution de rôles doit être faite avec précaution. 
                      Chaque rôle donne accès à des fonctionnalités et données spécifiques.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des invitations</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Inviter de nouveaux utilisateurs</h4>
                    <div className="space-y-3">
                      <p><strong>Navigation :</strong> Menu {">"} Invitations</p>
                      
                      <div className="bg-muted rounded-lg p-4">
                        <p className="font-semibold mb-2">Étapes :</p>
                        <ol className="list-decimal list-inside space-y-2">
                          <li>Cliquez sur "Nouvelle invitation"</li>
                          <li>Sélectionnez le type (Enseignant ou Stagiaire)</li>
                          <li>Renseignez l'email du destinataire</li>
                          <li>Sélectionnez l'enseignant ou stagiaire associé</li>
                          <li>Définissez la date d'expiration</li>
                          <li>Validez l'envoi</li>
                        </ol>
                      </div>

                      <p>Le destinataire recevra un email avec un lien sécurisé pour créer son compte.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Toutes les fonctionnalités accessibles</h3>
                    <p>En tant que Propriétaire, vous avez accès à :</p>
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📊 Tableau de bord</p>
                        <p className="text-sm text-muted-foreground">Vue globale et statistiques</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📚 Programmes</p>
                        <p className="text-sm text-muted-foreground">Création et gestion INTER/INTRA</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🎓 Classes</p>
                        <p className="text-sm text-muted-foreground">Organisation des sessions</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📖 Modules Catalogue</p>
                        <p className="text-sm text-muted-foreground">Bibliothèque de modules</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🏢 Clients</p>
                        <p className="text-sm text-muted-foreground">Gestion des entreprises</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">👨‍🏫 Enseignants</p>
                        <p className="text-sm text-muted-foreground">Base de données enseignants</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">👥 Stagiaires</p>
                        <p className="text-sm text-muted-foreground">Gestion des apprenants</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🧾 Factures</p>
                        <p className="text-sm text-muted-foreground">Facturation complète</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">💰 Recouvrements</p>
                        <p className="text-sm text-muted-foreground">Suivi des paiements</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📈 Performance Financière</p>
                        <p className="text-sm text-muted-foreground">KPIs et analyses</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🚗 Transferts</p>
                        <p className="text-sm text-muted-foreground">Logistique déplacements</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📄 Documents</p>
                        <p className="text-sm text-muted-foreground">Gestion documentaire</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">💬 Messages</p>
                        <p className="text-sm text-muted-foreground">Communication interne</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📚 Contenu Pédagogique</p>
                        <p className="text-sm text-muted-foreground">Ressources LMS</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📝 Devoirs</p>
                        <p className="text-sm text-muted-foreground">Gestion des travaux</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📊 Progression</p>
                        <p className="text-sm text-muted-foreground">Suivi pédagogique</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Vérifiez régulièrement les tableaux de bord financiers</li>
                      <li>Examinez les rapports de performance trimestriels</li>
                      <li>Auditez les accès utilisateurs périodiquement</li>
                      <li>Supervisez les indicateurs clés (inscriptions, revenus, satisfaction)</li>
                      <li>Maintenez une communication régulière avec les gestionnaires</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Administrateur */}
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" />
                    Guide Administrateur
                  </CardTitle>
                  <CardDescription>
                    Gestion globale du système et des utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Responsabilités</h3>
                    <p>
                      L'<strong>Administrateur</strong> assure la gestion quotidienne du système et des utilisateurs. 
                      Ses responsabilités incluent :
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Gestion des rôles et permissions utilisateurs</li>
                      <li>Configuration générale de la plateforme</li>
                      <li>Support technique aux utilisateurs</li>
                      <li>Surveillance de l'activité système</li>
                      <li>Gestion des données de référence</li>
                      <li>Administration des programmes et modules</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Page Administration</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Accès :</strong> Menu latéral {">"} Administration</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Fonctionnalités disponibles</h4>
                    <div className="space-y-3">
                      <div className="border-l-4 border-primary pl-4">
                        <p className="font-semibold">Gestion des utilisateurs</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Voir la liste complète des utilisateurs</li>
                          <li>Attribuer ou modifier les rôles</li>
                          <li>Rechercher par nom ou email</li>
                          <li>Filtrer par rôle</li>
                        </ul>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <p className="font-semibold">Attribution de rôle</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Sélectionnez l'utilisateur dans la liste</li>
                          <li>Cliquez sur "Modifier le rôle"</li>
                          <li>Choisissez le nouveau rôle dans le menu déroulant</li>
                          <li>Confirmez la modification</li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-4">
                      <p><strong>⚠️ Important :</strong> La modification d'un rôle prend effet immédiatement 
                      et modifie l'accès de l'utilisateur aux fonctionnalités.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des programmes</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Programmes</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer un nouveau programme</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouveau programme"</li>
                        <li>
                          <strong>Informations de base :</strong>
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Titre du programme</li>
                            <li>Code unique</li>
                            <li>Type : INTER (ouvert) ou INTRA (entreprise spécifique)</li>
                            <li>Client associé (pour INTRA)</li>
                          </ul>
                        </li>
                        <li>
                          <strong>Planification :</strong>
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Date de début</li>
                            <li>Date de fin</li>
                          </ul>
                        </li>
                        <li>
                          <strong>Modules :</strong>
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Sélectionnez les modules du catalogue</li>
                            <li>Définissez la durée (heures ou jours)</li>
                            <li>Organisez l'ordre des modules</li>
                          </ul>
                        </li>
                        <li>Validez la création</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des classes</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Classes</p>
                    </div>

                    <p>Une classe est une instance d'exécution d'un programme avec des stagiaires spécifiques.</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer une classe</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouvelle classe"</li>
                        <li>Sélectionnez le programme associé</li>
                        <li>Définissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Nom de la classe</li>
                            <li>Sous-code unique</li>
                            <li>Date de début effective</li>
                            <li>Date de fin prévue</li>
                          </ul>
                        </li>
                        <li>Validez la création</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Gérer les modules d'une classe</h4>
                    <p className="mb-2">Pour chaque module de la classe, vous pouvez :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Définir les dates précises</li>
                      <li>Affecter un enseignant</li>
                      <li>Suivre le statut d'invitation enseignant</li>
                      <li>Ajouter du contenu pédagogique</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Catalogue de modules</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Modules Catalogue</p>
                    </div>

                    <p>Le catalogue contient tous les modules pédagogiques réutilisables.</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer un module catalogue</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouveau module"</li>
                        <li>Renseignez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Titre du module</li>
                            <li>Description complète</li>
                          </ul>
                        </li>
                        <li>Associez les enseignants compétents (optionnel)</li>
                        <li>Validez</li>
                      </ol>
                    </div>

                    <p className="mt-3">Ce module pourra ensuite être ajouté à différents programmes.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des clients</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Clients</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter un client</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Informations requises :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Entreprise :</strong> Nom, code unique, secteur d'activité</li>
                        <li><strong>Coordonnées :</strong> Adresse, ville, pays, code postal</li>
                        <li><strong>Contact :</strong> Email, téléphone, site web</li>
                        <li><strong>Contact principal :</strong> Nom, fonction, email, téléphone</li>
                        <li><strong>Notes :</strong> Informations complémentaires</li>
                      </ul>
                    </div>

                    <p className="mt-3">Les clients sont ensuite disponibles lors de la création de programmes INTRA.</p>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques Administrateur</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Maintenez le catalogue de modules à jour</li>
                      <li>Vérifiez la cohérence des codes (programmes, clients)</li>
                      <li>Documentez les changements de rôles importants</li>
                      <li>Effectuez des sauvegardes régulières des données</li>
                      <li>Surveillez les utilisateurs inactifs</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gestionnaire Scolarité */}
            <TabsContent value="scolarite" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Guide Scolarité (Responsable & Gestionnaire)
                  </CardTitle>
                  <CardDescription>
                    Gestion académique et administrative des formations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Les deux rôles de Scolarité</h3>
                    
                    <div className="border-l-4 border-primary pl-4 mb-4">
                      <p className="font-semibold text-lg">Responsable Scolarité</p>
                      <p className="text-muted-foreground mb-2">Supervise l'ensemble de la scolarité</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Peut gérer <strong>tous</strong> les programmes, classes, enseignants et stagiaires</li>
                        <li>Attribue les programmes aux Gestionnaires de Scolarité</li>
                        <li>Accès complet au reste de la plateforme (sauf Administration)</li>
                        <li>Peut créer de nouveaux programmes</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-secondary pl-4 mb-4">
                      <p className="font-semibold text-lg">Gestionnaire Scolarité</p>
                      <p className="text-muted-foreground mb-2">Accès limité aux programmes attribués</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Modification uniquement sur les <strong>programmes qui lui sont attribués</strong></li>
                        <li>Accès CRM en consultation et modification</li>
                        <li>Accès Transferts en consultation et modification</li>
                        <li><strong>Pas d'accès</strong> aux sections : Factures, Recouvrement, Performance Financière, Contrats</li>
                        <li><strong>Pas d'accès</strong> à la section Administration</li>
                      </ul>
                    </div>

                    <div className="bg-info rounded-lg p-4">
                      <p><strong>📌 Attribution des programmes :</strong> Un programme est attribué à un gestionnaire 
                      par le Responsable Scolarité, le Propriétaire ou l'Administrateur lors de la création 
                      du programme ou ultérieurement depuis la fiche programme.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Responsabilités communes</h3>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Gestion des inscriptions stagiaires</li>
                      <li>Organisation des classes et modules</li>
                      <li>Coordination enseignants-stagiaires</li>
                      <li>Suivi de la présence et progression</li>
                      <li>Gestion documentaire</li>
                      <li>Communication avec tous les acteurs</li>
                      <li>Supervision des devoirs et évaluations</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des stagiaires</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Stagiaires</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter un stagiaire</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Informations à collecter :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Identité :</strong> Nom, prénom, date de naissance</li>
                        <li><strong>Contact :</strong> Email, téléphone (avec indicatif pays)</li>
                        <li><strong>Adresse :</strong> Adresse, code postal, ville, pays</li>
                      </ul>
                      
                      <p className="mt-3"><strong>Processus :</strong></p>
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>Cliquez sur "Nouveau stagiaire"</li>
                        <li>Remplissez le formulaire</li>
                        <li>Validez la création</li>
                        <li>Le stagiaire apparaît dans la base de données</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Inscrire à une classe</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Depuis la fiche stagiaire, section "Inscriptions"</li>
                        <li>Cliquez sur "Nouvelle inscription"</li>
                        <li>Sélectionnez la classe</li>
                        <li>Définissez la date d'inscription</li>
                        <li>Choisissez le statut (Actif, En attente, Annulé, Complété)</li>
                        <li>Ajoutez des notes si nécessaire</li>
                        <li>Validez</li>
                      </ol>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>💡 Astuce :</strong> Vous pouvez importer plusieurs stagiaires à la fois 
                      via le bouton "Importer Excel" (format template fourni).</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des enseignants</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Enseignants</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter un enseignant</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Données requises :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Identité :</strong> Nom, prénom</li>
                        <li><strong>Contact :</strong> Email, téléphone</li>
                        <li><strong>Résidence :</strong> Pays, adresse</li>
                        <li><strong>Séjour :</strong> Dates début/fin (si applicable)</li>
                        <li><strong>Thématiques :</strong> Domaines d'expertise</li>
                        <li><strong>Mode de rémunération :</strong> Vacation, Prestation de service, Salarié, Autre</li>
                      </ul>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Affecter à un module</h4>
                    <p>Deux méthodes possibles :</p>
                    
                    <div className="bg-muted rounded-lg p-4 mt-2">
                      <p className="font-semibold">Méthode 1 : Depuis la fiche enseignant</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Section "Affectations"</li>
                        <li>Cliquez "Nouvelle affectation"</li>
                        <li>Sélectionnez le module de classe</li>
                        <li>Confirmez</li>
                      </ol>
                    </div>

                    <div className="bg-muted rounded-lg p-4 mt-2">
                      <p className="font-semibold">Méthode 2 : Depuis la classe</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Menu {">"} Classes {">"} Sélectionner la classe</li>
                        <li>Dans la liste des modules, cliquez sur un module</li>
                        <li>Section "Affectation enseignant"</li>
                        <li>Choisissez l'enseignant</li>
                        <li>Validez</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Invitations</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Invitations</p>
                    </div>

                    <p>
                      Le système d'invitations permet de donner accès à la plateforme aux enseignants 
                      et stagiaires de manière sécurisée.
                    </p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Envoyer une invitation</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouvelle invitation"</li>
                        <li>Sélectionnez le type : Enseignant ou Stagiaire</li>
                        <li>Renseignez l'adresse email</li>
                        <li>Sélectionnez l'enseignant ou stagiaire concerné dans la liste</li>
                        <li>Définissez une date d'expiration (par défaut 7 jours)</li>
                        <li>Validez l'envoi</li>
                      </ol>
                    </div>

                    <p className="mt-3">
                      <strong>Résultat :</strong> Un email est envoyé avec un lien unique permettant 
                      de créer un compte utilisateur. Le token expire à la date définie.
                    </p>

                    <div className="bg-info rounded-lg p-4 mt-3">
                      <p><strong>📌 Suivi :</strong> La liste des invitations affiche le statut 
                      (Utilisée / Non utilisée) et permet de renvoyer une invitation si nécessaire.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Documents</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Documents</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Partager un document</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cliquez sur "Nouveau document"</li>
                        <li>Sélectionnez le fichier à uploader</li>
                        <li>Définissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Titre du document</li>
                            <li>Description</li>
                            <li>Classe associée (optionnel)</li>
                            <li>Module associé (optionnel)</li>
                          </ul>
                        </li>
                        <li>Validez l'upload</li>
                      </ol>
                    </div>

                    <p className="mt-3">
                      Les documents deviennent accessibles aux utilisateurs concernés selon leur rôle 
                      et les classes/modules auxquels ils sont inscrits.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Messages</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Messages</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Envoyer un message</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cliquez sur "Nouveau message"</li>
                        <li>Renseignez le sujet</li>
                        <li>Rédigez le contenu</li>
                        <li>Choisissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Type de destinataire (Enseignant, Stagiaire, Tous)</li>
                            <li>Destinataire spécifique (optionnel)</li>
                            <li>Classe concernée (optionnel)</li>
                          </ul>
                        </li>
                        <li>Envoyez</li>
                      </ol>
                    </div>

                    <p className="mt-3">
                      <strong>Types d'envoi :</strong>
                    </p>
                    <ul className="list-disc list-inside mt-2">
                      <li><strong>Individuel :</strong> Message à un utilisateur spécifique</li>
                      <li><strong>Groupe :</strong> Message à tous les stagiaires ou enseignants d'une classe</li>
                      <li><strong>Général :</strong> Broadcast à tous les utilisateurs d'un type</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Transferts</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Transferts</p>
                    </div>

                    <p>Organisez les déplacements des stagiaires et enseignants.</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Planifier un transfert</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cliquez sur "Nouveau transfert"</li>
                        <li>Sélectionnez la classe concernée</li>
                        <li>Définissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Date et heure</li>
                            <li>Lieu de départ</li>
                            <li>Destination</li>
                            <li>Moyen de transport</li>
                            <li>Notes logistiques</li>
                          </ul>
                        </li>
                        <li>Validez</li>
                      </ol>
                    </div>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques Gestionnaire Scolarité</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Envoyez les invitations au moins 2 semaines avant le début de formation</li>
                      <li>Vérifiez les affectations enseignants avant chaque session</li>
                      <li>Maintenez les coordonnées stagiaires à jour</li>
                      <li>Archivez les documents par classe et année</li>
                      <li>Communiquez régulièrement avec enseignants et stagiaires</li>
                      <li>Suivez les statuts d'inscription et intervenez rapidement en cas d'anomalie</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financier */}
            <TabsContent value="financier" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-6 w-6 text-primary" />
                    Guide Finance (Direction Financière & Financier)
                  </CardTitle>
                  <CardDescription>
                    Gestion financière et comptable complète
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Les deux rôles financiers</h3>
                    
                    <div className="border-l-4 border-primary pl-4 mb-4">
                      <p className="font-semibold text-lg">Direction Financière</p>
                      <p className="text-muted-foreground mb-2">Supervision et consultation uniquement</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Accès en <strong>consultation et export</strong> aux sections :</li>
                        <li className="ml-6">• Tableau de bord</li>
                        <li className="ml-6">• Performance Financière</li>
                        <li className="ml-6">• Factures</li>
                        <li className="ml-6">• Recouvrements</li>
                        <li><strong>Aucun droit de modification</strong></li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-secondary pl-4 mb-4">
                      <p className="font-semibold text-lg">Financier</p>
                      <p className="text-muted-foreground mb-2">Gestion opérationnelle des finances</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Accès en <strong>modification</strong> aux sections :</li>
                        <li className="ml-6">• Factures</li>
                        <li className="ml-6">• Contrats</li>
                        <li className="ml-6">• CRM</li>
                        <li className="ml-6">• Restauration</li>
                        <li>Accès en <strong>consultation</strong> pour le reste des sections accessibles</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Responsabilités du Financier</h3>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Facturation des formations</li>
                      <li>Suivi des paiements et encaissements</li>
                      <li>Gestion des recouvrements et relances</li>
                      <li>Gestion des contrats enseignants</li>
                      <li>Suivi des coûts de restauration</li>
                      <li>Support CRM (devis, bons de commande)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion des factures</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Factures</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer une facture</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouvelle facture"</li>
                        <li>Renseignez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li><strong>Numéro de facture :</strong> Référence unique</li>
                            <li><strong>Stagiaire :</strong> Sélection dans la liste</li>
                            <li><strong>Classe :</strong> Formation concernée</li>
                            <li><strong>Montant total :</strong> Coût de la formation</li>
                            <li><strong>Date d'émission</strong></li>
                            <li><strong>Date d'échéance :</strong> Délai de paiement</li>
                            <li><strong>Statut initial :</strong> Brouillon ou Envoyée</li>
                            <li><strong>Notes :</strong> Informations complémentaires</li>
                          </ul>
                        </li>
                        <li>Validez la création</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Statuts de facture</h4>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-start gap-2">
                        <span className="badge badge-yellow">Brouillon</span>
                        <span>Facture en cours de préparation, non envoyée au client</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-blue">Envoyée</span>
                        <span>Facture transmise au client, en attente de paiement</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-yellow">Partielle</span>
                        <span>Paiement partiel reçu, solde restant</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-green">Payée</span>
                        <span>Montant intégralement encaissé</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge">Annulée</span>
                        <span>Facture annulée (avoir émis ou erreur)</span>
                      </div>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>⚠️ Attention :</strong> Le statut se met à jour automatiquement 
                      en fonction des paiements enregistrés. Vérifiez la cohérence régulièrement.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Enregistrement des paiements</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter un paiement</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Depuis la liste des factures, cliquez sur la facture concernée</li>
                        <li>Section "Paiements", cliquez "Nouveau paiement"</li>
                        <li>Renseignez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li><strong>Date du paiement</strong></li>
                            <li><strong>Montant encaissé</strong></li>
                            <li><strong>Mode de paiement :</strong> Virement, Chèque, Espèces, Carte, Autre</li>
                            <li><strong>Référence :</strong> N° de chèque, référence virement, etc.</li>
                            <li><strong>Notes :</strong> Informations complémentaires</li>
                          </ul>
                        </li>
                        <li>Validez</li>
                      </ol>
                    </div>

                    <p className="mt-3">
                      <strong>Résultat :</strong> Le montant payé de la facture est automatiquement mis à jour, 
                      et le statut change selon le montant encaissé (Partielle ou Payée).
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Recouvrements</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Recouvrements</p>
                    </div>

                    <p>
                      Cette page affiche toutes les factures en retard de paiement et permet 
                      de gérer les relances.
                    </p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Visualisation</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Factures classées par ordre de priorité (retard le plus important)</li>
                      <li>Montant total des impayés</li>
                      <li>Jours de retard pour chaque facture</li>
                      <li>Historique des relances</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Envoyer une relance</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Sélectionnez la facture impayée</li>
                        <li>Cliquez sur "Nouvelle relance"</li>
                        <li>Choisissez le type : Email, Téléphone, Courrier, SMS</li>
                        <li>Rédigez le contenu de la relance</li>
                        <li>Définissez la date d'envoi</li>
                        <li>Validez</li>
                      </ol>
                    </div>

                    <div className="bg-info rounded-lg p-4 mt-3">
                      <p><strong>📌 Conseil :</strong> Planifiez des relances progressives : 
                      Relance 1 (J+7 après échéance), Relance 2 (J+15), Relance 3 (J+30).</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Performance Financière</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Performance Financière</p>
                    </div>

                    <p>Tableau de bord complet avec KPIs financiers détaillés.</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Indicateurs globaux</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li><strong>Produits :</strong> Revenus prévus vs réalisés</li>
                      <li><strong>Charges :</strong> Dépenses prévues vs réalisées</li>
                      <li><strong>Marge :</strong> Marge brute prévue vs réalisée</li>
                      <li><strong>Taux de marge :</strong> Marge / Produits (%)</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Vue par programme</h4>
                    <p>Analyse détaillée de la rentabilité par programme :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Revenus générés (factures)</li>
                      <li>Coûts associés (budget)</li>
                      <li>Marge nette</li>
                      <li>Évolution dans le temps</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Vue par classe</h4>
                    <p>Performance financière de chaque session :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Nombre de stagiaires inscrits</li>
                      <li>Revenus (inscriptions x tarif)</li>
                      <li>Coûts de réalisation</li>
                      <li>Rentabilité de la session</li>
                    </ul>

                    <div className="bg-success rounded-lg p-4 mt-3">
                      <p><strong>💡 Utilisation :</strong> Exportez ces données en Excel pour 
                      créer des rapports détaillés et suivre l'évolution mois par mois.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion budgétaire</h3>
                    
                    <p>Le budget prévisionnel et réalisé est géré via les éléments de budget (Budget Items).</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Types de budget</h4>
                    <div className="space-y-2 mt-2">
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="font-semibold">Produits (Revenus)</p>
                        <p className="text-sm">Inscriptions, prestations, partenariats</p>
                      </div>
                      <div className="border-l-4 border-red-500 pl-4">
                        <p className="font-semibold">Charges (Dépenses)</p>
                        <p className="text-sm">Salaires enseignants, location, matériel, marketing</p>
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Catégories de charges</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Personnel enseignant</li>
                      <li>Location de salles</li>
                      <li>Matériel pédagogique</li>
                      <li>Marketing et communication</li>
                      <li>Frais administratifs</li>
                      <li>Restauration et hébergement</li>
                      <li>Déplacements</li>
                    </ul>

                    <div className="bg-muted rounded-lg p-4 mt-3">
                      <p className="font-semibold mb-2">Suivi budgétaire :</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Définir le budget prévisionnel au lancement du programme</li>
                        <li>Enregistrer les dépenses réelles au fur et à mesure</li>
                        <li>Comparer prévu vs réalisé</li>
                        <li>Ajuster si écarts significatifs</li>
                      </ol>
                    </div>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques Financier</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Émettez les factures dans les 48h après inscription</li>
                      <li>Programmez des relances automatiques à J+7, J+15, J+30</li>
                      <li>Réconciliez les paiements quotidiennement</li>
                      <li>Produisez un rapport mensuel de performance</li>
                      <li>Analysez les écarts budgétaires et documentez les causes</li>
                      <li>Maintenez un tableau de trésorerie prévisionnel</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Commercial */}
            <TabsContent value="commercial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary" />
                    Guide Commercial
                  </CardTitle>
                  <CardDescription>
                    Gestion commerciale et relation client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Rôle et Accès</h3>
                    <p>
                      Le <strong>Commercial</strong> est responsable du développement commercial 
                      et de la relation client. Ses accès sont ciblés sur les activités de prospection et de vente.
                    </p>
                    
                    <div className="border-l-4 border-primary pl-4 mt-4 mb-4">
                      <p className="font-semibold">Accès en modification :</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li><strong>CRM complet</strong> : Prospects, Devis, Bons de commande</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-secondary pl-4 mb-4">
                      <p className="font-semibold">Accès en consultation uniquement :</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>Programmes (catalogue des formations)</li>
                        <li>Modules (contenu des formations)</li>
                        <li>Planning (calendrier des sessions)</li>
                        <li>Clients (base de données clients)</li>
                      </ul>
                    </div>

                    <div className="bg-warning rounded-lg p-4">
                      <p><strong>⚠️ Sections non accessibles :</strong> Factures, Recouvrements, 
                      Performance Financière, Contrats, Administration, Enseignants, Stagiaires, etc.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">CRM - Gestion des Prospects</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} CRM</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter un prospect</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouveau prospect"</li>
                        <li>Renseignez les informations :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Nom de l'entreprise</li>
                            <li>Contact principal (nom, email, téléphone)</li>
                            <li>Source de la prospection</li>
                            <li>Programmes d'intérêt</li>
                            <li>Statut (Nouveau, Contacté, Qualifié, etc.)</li>
                          </ul>
                        </li>
                        <li>Ajoutez des notes et commentaires</li>
                        <li>Validez la création</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Suivi des interactions</h4>
                    <p>Documentez chaque contact avec le prospect :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Appels téléphoniques</li>
                      <li>Emails envoyés/reçus</li>
                      <li>Rendez-vous</li>
                      <li>Présentations effectuées</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Création de Devis</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer un devis</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Depuis un prospect ou depuis l'onglet Devis</li>
                        <li>Cliquez sur "Nouveau devis"</li>
                        <li>Sélectionnez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Client ou Prospect</li>
                            <li>Programme concerné</li>
                          </ul>
                        </li>
                        <li>Définissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Lignes de devis (désignation, quantité, prix)</li>
                            <li>Conditions commerciales</li>
                            <li>Date de validité</li>
                          </ul>
                        </li>
                        <li>Générez et envoyez le devis</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Convertir en Bon de Commande</h4>
                    <p>Lorsqu'un devis est accepté :</p>
                    <div className="bg-muted rounded-lg p-4 mt-2">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Ouvrez le devis accepté</li>
                        <li>Cliquez sur "Convertir en BC"</li>
                        <li>Vérifiez les informations</li>
                        <li>Validez la création du bon de commande</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Consultation des Informations</h3>
                    <p>En mode consultation, vous pouvez visualiser :</p>
                    
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📚 Programmes</p>
                        <p className="text-sm text-muted-foreground">Catalogue complet des formations disponibles</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📖 Modules</p>
                        <p className="text-sm text-muted-foreground">Détail du contenu pédagogique</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📅 Planning</p>
                        <p className="text-sm text-muted-foreground">Calendrier des sessions programmées</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🏢 Clients</p>
                        <p className="text-sm text-muted-foreground">Base de données des entreprises clientes</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques Commercial</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Mettez à jour le statut des prospects après chaque interaction</li>
                      <li>Documentez toutes les conversations importantes</li>
                      <li>Suivez les devis en attente et relancez régulièrement</li>
                      <li>Consultez le planning pour proposer des dates adaptées</li>
                      <li>Utilisez le catalogue programmes pour répondre aux demandes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enseignant */}
            <TabsContent value="enseignant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    Guide Enseignant
                  </CardTitle>
                  <CardDescription>
                    Gestion pédagogique et suivi des stagiaires
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Responsabilités</h3>
                    <p>
                      L'<strong>Enseignant</strong> est responsable de la transmission des connaissances 
                      et du suivi pédagogique :
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Animation des modules de formation</li>
                      <li>Upload de contenu pédagogique</li>
                      <li>Création et correction des devoirs</li>
                      <li>Suivi de la progression des stagiaires</li>
                      <li>Communication avec les stagiaires</li>
                      <li>Évaluation des acquis</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Accès initial</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Réception de l'invitation</h4>
                    <div className="bg-info rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Vous recevez un email d'invitation de la part de CentraleSupélec EXED</li>
                        <li>Cliquez sur le lien dans l'email</li>
                        <li>Créez votre mot de passe sécurisé</li>
                        <li>Confirmez votre compte</li>
                        <li>Vous êtes redirigé vers votre portail enseignant</li>
                      </ol>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>⚠️ Important :</strong> Le lien d'invitation expire après la date définie. 
                      Si le lien a expiré, contactez l'administration pour recevoir une nouvelle invitation.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Portail Enseignant</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Accès :</strong> Menu {">"} Mon Portail</p>
                    </div>

                    <p>Le portail enseignant centralise toutes vos activités pédagogiques :</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Vue d'ensemble</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Classes assignées</li>
                      <li>Modules à animer</li>
                      <li>Devoirs en attente de correction</li>
                      <li>Prochaines sessions</li>
                      <li>Alertes et notifications</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Gestion du contenu pédagogique</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Contenu Pédagogique</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Ajouter une ressource</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouvelle ressource"</li>
                        <li>Sélectionnez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Classe concernée</li>
                            <li>Module associé</li>
                          </ul>
                        </li>
                        <li>Définissez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li><strong>Titre</strong> de la ressource</li>
                            <li><strong>Type :</strong> Vidéo, Document PDF, Présentation, Lien externe, Audio</li>
                            <li><strong>Description</strong></li>
                            <li><strong>Durée estimée</strong> (en minutes)</li>
                            <li><strong>Ordre</strong> dans la séquence</li>
                            <li><strong>Obligatoire</strong> : Oui/Non</li>
                          </ul>
                        </li>
                        <li>Uploadez le fichier ou collez l'URL</li>
                        <li>Validez</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Types de ressources</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li><strong>Vidéo :</strong> Cours enregistrés, tutoriels</li>
                      <li><strong>Document PDF :</strong> Supports de cours, fiches</li>
                      <li><strong>Présentation :</strong> Slides PowerPoint, Keynote</li>
                      <li><strong>Lien externe :</strong> Articles, sites web, ressources en ligne</li>
                      <li><strong>Audio :</strong> Podcasts, enregistrements</li>
                    </ul>

                    <div className="bg-success rounded-lg p-4 mt-3">
                      <p><strong>💡 Conseil :</strong> Organisez vos ressources de manière logique 
                      (introduction, cours, exercices, conclusion) et utilisez l'ordre pour guider 
                      les stagiaires.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Devoirs</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Devoirs</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Créer un devoir</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Nouveau devoir"</li>
                        <li>Renseignez :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li><strong>Titre</strong> du devoir</li>
                            <li><strong>Type :</strong> Travail à rendre, Exercice, Projet, Examen</li>
                            <li><strong>Classe</strong> et <strong>Module</strong></li>
                            <li><strong>Description</strong> générale</li>
                            <li><strong>Instructions</strong> détaillées</li>
                            <li><strong>Date d'ouverture</strong> : Quand les stagiaires peuvent commencer</li>
                            <li><strong>Date limite</strong> : Deadline de soumission</li>
                            <li><strong>Points maximum</strong> : Barème de notation</li>
                          </ul>
                        </li>
                        <li>Configuration upload :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Formats acceptés (PDF, DOCX, etc.)</li>
                            <li>Taille maximale en MB</li>
                          </ul>
                        </li>
                        <li>Validez la création</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Corriger les soumissions</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Depuis la liste des devoirs, cliquez sur le devoir</li>
                        <li>Section "Soumissions" : voir tous les travaux rendus</li>
                        <li>Pour chaque soumission :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Téléchargez et consultez le fichier</li>
                            <li>Attribuez une note (sur le barème défini)</li>
                            <li>Rédigez un commentaire de correction</li>
                            <li>Changez le statut à "Corrigé"</li>
                            <li>Enregistrez</li>
                          </ul>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-info rounded-lg p-4 mt-3">
                      <p><strong>📌 Suivi :</strong> Un tableau de bord affiche le nombre de soumissions 
                      reçues, en attente de correction, et corrigées pour chaque devoir.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Suivi de progression</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Progression</p>
                    </div>

                    <p>Visualisez la progression de vos stagiaires :</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Vue globale</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Taux de complétion moyen de la classe</li>
                      <li>Stagiaires en retard</li>
                      <li>Ressources les plus consultées</li>
                      <li>Temps moyen passé par module</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Vue individuelle</h4>
                    <p>Pour chaque stagiaire :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Pourcentage de complétion par module</li>
                      <li>Ressources consultées / non consultées</li>
                      <li>Temps passé sur chaque ressource</li>
                      <li>Dernière activité</li>
                      <li>Notes aux devoirs</li>
                      <li>Statut général (En retard, À jour, Avancé)</li>
                    </ul>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>💡 Action :</strong> Utilisez ces données pour identifier les stagiaires 
                      en difficulté et leur proposer un accompagnement personnalisé.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Documents</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Documents</p>
                    </div>

                    <p>Partagez des documents administratifs ou complémentaires avec vos stagiaires.</p>

                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Upload d'un document :</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cliquez sur "Nouveau document"</li>
                        <li>Uploadez le fichier</li>
                        <li>Définissez titre et description</li>
                        <li>Sélectionnez classe et/ou module</li>
                        <li>Validez</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Messages</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Messages</p>
                    </div>

                    <p>Communiquez avec l'administration et vos stagiaires.</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Envoyer un message</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Message individuel à un stagiaire</li>
                      <li>Message collectif à toute la classe</li>
                      <li>Message à l'administration</li>
                    </ul>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Bonnes pratiques Enseignant</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Uploadez les ressources au moins 1 semaine avant le cours</li>
                      <li>Créez les devoirs en début de module avec deadlines claires</li>
                      <li>Corrigez les devoirs sous 7 jours maximum</li>
                      <li>Donnez des feedbacks constructifs et personnalisés</li>
                      <li>Vérifiez la progression hebdomadairement</li>
                      <li>Contactez rapidement les stagiaires en retard</li>
                      <li>Variez les types de ressources (vidéo, PDF, liens)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stagiaire */}
            <TabsContent value="stagiaire" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Guide Stagiaire
                  </CardTitle>
                  <CardDescription>
                    Accès au contenu de formation et suivi personnel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Bienvenue !</h3>
                    <p>
                      En tant que <strong>Stagiaire</strong>, vous avez accès à tout votre parcours 
                      de formation executive education via la plateforme Exed Manager 365.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Première connexion</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Activation du compte</h4>
                    <div className="bg-info rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Vous recevez un email d'invitation</li>
                        <li>Cliquez sur le lien d'activation</li>
                        <li>Créez votre mot de passe (min. 8 caractères, sécurisé)</li>
                        <li>Confirmez votre compte</li>
                        <li>Accédez à votre portail stagiaire</li>
                      </ol>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>⚠️ Lien expiré ?</strong> Contactez la scolarité pour recevoir 
                      une nouvelle invitation.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Mon Parcours</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Accès :</strong> Menu {">"} Mon Parcours</p>
                    </div>

                    <p>Votre portail personnel centralise toute votre expérience de formation :</p>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Tableau de bord</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Vue d'ensemble de votre progression</li>
                      <li>Prochains cours et échéances</li>
                      <li>Devoirs à rendre</li>
                      <li>Notifications importantes</li>
                      <li>Accès rapide aux ressources</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Contenu Pédagogique</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Contenu Pédagogique</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Accéder aux ressources</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Sélectionnez votre classe</li>
                        <li>Choisissez le module</li>
                        <li>Visualisez la liste des ressources dans l'ordre recommandé</li>
                        <li>Cliquez sur une ressource pour y accéder</li>
                      </ol>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Types de ressources disponibles</h4>
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🎥 Vidéos</p>
                        <p className="text-sm text-muted-foreground">Cours enregistrés, tutoriels</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📄 Documents PDF</p>
                        <p className="text-sm text-muted-foreground">Supports de cours, fiches</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📊 Présentations</p>
                        <p className="text-sm text-muted-foreground">Slides de cours</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🔗 Liens externes</p>
                        <p className="text-sm text-muted-foreground">Articles, ressources web</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🎧 Audio</p>
                        <p className="text-sm text-muted-foreground">Podcasts, enregistrements</p>
                      </div>
                    </div>

                    <div className="bg-info rounded-lg p-4 mt-3">
                      <p><strong>📌 Important :</strong> Certaines ressources sont marquées "Obligatoires". 
                      Assurez-vous de les consulter pour compléter votre formation.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Devoirs</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Devoirs</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Consulter les devoirs</h4>
                    <p>La page affiche tous vos devoirs avec :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Titre et type (Exercice, Projet, Examen)</li>
                      <li>Module et classe concernés</li>
                      <li>Date d'ouverture et date limite</li>
                      <li>Points maximum</li>
                      <li>Statut (À rendre, Rendu, Corrigé)</li>
                      <li>Note obtenue (si corrigé)</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Soumettre un devoir</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur le devoir</li>
                        <li>Lisez attentivement :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Description</li>
                            <li>Instructions</li>
                            <li>Critères d'évaluation</li>
                            <li>Formats acceptés</li>
                            <li>Taille maximum du fichier</li>
                          </ul>
                        </li>
                        <li>Préparez votre travail (hors plateforme)</li>
                        <li>Section "Soumettre" :
                          <ul className="list-disc list-inside ml-6 mt-1">
                            <li>Uploadez votre fichier</li>
                            <li>Ajoutez un commentaire (optionnel)</li>
                            <li>Vérifiez que le fichier est correct</li>
                          </ul>
                        </li>
                        <li>Cliquez sur "Soumettre"</li>
                      </ol>
                    </div>

                    <div className="bg-warning rounded-lg p-4 mt-3">
                      <p><strong>⚠️ Attention :</strong></p>
                      <ul className="list-disc list-inside mt-1">
                        <li>Respectez la date limite pour que votre travail soit accepté</li>
                        <li>Une fois soumis, vous ne pouvez plus modifier (contactez l'enseignant si erreur)</li>
                        <li>Vérifiez le format et la taille de votre fichier avant soumission</li>
                      </ul>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Consulter la correction</h4>
                    <p>Une fois votre devoir corrigé :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Le statut passe à "Corrigé"</li>
                      <li>Vous voyez votre note</li>
                      <li>Vous pouvez lire le commentaire de l'enseignant</li>
                      <li>La note est prise en compte dans votre progression</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Ma Progression</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Progression</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Suivi global</h4>
                    <p>Visualisez votre avancement dans la formation :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li><strong>Pourcentage de complétion</strong> par module</li>
                      <li><strong>Ressources consultées</strong> vs total</li>
                      <li><strong>Temps passé</strong> sur chaque module</li>
                      <li><strong>Devoirs rendus</strong> vs total</li>
                      <li><strong>Moyenne générale</strong></li>
                      <li><strong>Statut :</strong> En retard, À jour, Avancé</li>
                    </ul>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Détail par module</h4>
                    <p>Pour chaque module :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Liste des ressources avec statut (Vue, Non vue)</li>
                      <li>Temps passé par ressource</li>
                      <li>Date de dernière consultation</li>
                      <li>Devoirs associés et notes</li>
                    </ul>

                    <div className="bg-success rounded-lg p-4 mt-3">
                      <p><strong>💡 Conseil :</strong> Consultez régulièrement votre progression pour 
                      rester à jour et identifier les contenus que vous n'avez pas encore vus.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Documents</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Documents</p>
                    </div>

                    <p>Accédez aux documents partagés par :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>L'administration (certificats, attestations, règlements)</li>
                      <li>Les enseignants (ressources complémentaires)</li>
                      <li>Documents liés à votre classe</li>
                      <li>Documents liés à un module spécifique</li>
                    </ul>

                    <p className="mt-3">Téléchargez et conservez les documents importants localement.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Messages</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Messages</p>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Communication</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Recevez les annonces de l'administration</li>
                      <li>Contactez vos enseignants</li>
                      <li>Posez des questions sur les devoirs ou le contenu</li>
                      <li>Communiquez avec la scolarité</li>
                    </ul>

                    <div className="bg-muted rounded-lg p-4 mt-3">
                      <p className="font-semibold mb-2">Envoyer un message :</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Cliquez sur "Nouveau message"</li>
                        <li>Sélectionnez le destinataire (enseignant, administration)</li>
                        <li>Rédigez votre message</li>
                        <li>Envoyez</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Tableau de bord</h3>
                    <div className="bg-info rounded-lg p-4 mb-4">
                      <p><strong>Navigation :</strong> Menu {">"} Tableau de bord</p>
                    </div>

                    <p>Votre page d'accueil après connexion affiche :</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Statistiques de progression globale</li>
                      <li>Prochaines échéances (devoirs à rendre)</li>
                      <li>Nouvelles ressources disponibles</li>
                      <li>Messages non lus</li>
                      <li>Alertes et notifications</li>
                    </ul>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Conseils pour réussir votre formation</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Consultez régulièrement la plateforme (au moins 2-3 fois par semaine)</li>
                      <li>Respectez les dates limites des devoirs</li>
                      <li>Suivez l'ordre recommandé des ressources</li>
                      <li>Complétez les ressources obligatoires en priorité</li>
                      <li>N'hésitez pas à contacter vos enseignants en cas de question</li>
                      <li>Vérifiez votre progression chaque semaine</li>
                      <li>Conservez vos notes et feedbacks pour réviser</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LMS */}
            <TabsContent value="lms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Library className="h-6 w-6 text-primary" />
                    Guide complet du LMS
                  </CardTitle>
                  <CardDescription>
                    Learning Management System - Fonctionnalités pédagogiques
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Vue d'ensemble du LMS</h3>
                    <p>
                      Le <strong>LMS (Learning Management System)</strong> d'Exed Manager 365 est la 
                      composante pédagogique de la plateforme. Il permet de :
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3">
                      <li>Distribuer du contenu pédagogique multimédia</li>
                      <li>Gérer les devoirs et évaluations</li>
                      <li>Suivre la progression des apprenants</li>
                      <li>Favoriser l'interaction enseignants-stagiaires</li>
                      <li>Analyser les performances d'apprentissage</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Architecture pédagogique</h3>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-3">Hiérarchie de l'apprentissage :</p>
                      <div className="space-y-3">
                        <div className="border-l-4 border-primary pl-4">
                          <p className="font-semibold">1. Programme</p>
                          <p className="text-sm">Parcours complet de formation (ex: Executive MBA)</p>
                        </div>
                        <div className="border-l-4 border-primary pl-4 ml-4">
                          <p className="font-semibold">2. Classe</p>
                          <p className="text-sm">Groupe de stagiaires suivant le programme (ex: Promotion 2024)</p>
                        </div>
                        <div className="border-l-4 border-primary pl-4 ml-8">
                          <p className="font-semibold">3. Modules</p>
                          <p className="text-sm">Unités pédagogiques thématiques (ex: Management Stratégique)</p>
                        </div>
                        <div className="border-l-4 border-primary pl-4 ml-12">
                          <p className="font-semibold">4. Ressources pédagogiques</p>
                          <p className="text-sm">Contenus d'apprentissage (vidéos, PDF, liens, etc.)</p>
                        </div>
                        <div className="border-l-4 border-primary pl-4 ml-12">
                          <p className="font-semibold">5. Devoirs</p>
                          <p className="text-sm">Exercices et évaluations</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Ressources pédagogiques</h3>
                    
                    <h4 className="text-lg font-semibold mt-4 mb-2">Types de ressources supportées</h4>
                    
                    <div className="space-y-3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            🎥 Vidéos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Cours magistraux enregistrés</li>
                            <li>Tutoriels et démonstrations</li>
                            <li>Conférences et interviews</li>
                            <li>Études de cas vidéo</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            📄 Documents PDF
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Supports de cours</li>
                            <li>Fiches de synthèse</li>
                            <li>Articles académiques</li>
                            <li>Cas pratiques</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            📊 Présentations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Slides PowerPoint</li>
                            <li>Présentations Keynote</li>
                            <li>Supports visuels</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            🔗 Liens externes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Articles en ligne</li>
                            <li>Ressources web</li>
                            <li>Outils interactifs</li>
                            <li>Simulations</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            🎧 Audio
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Podcasts éducatifs</li>
                            <li>Enregistrements de cours</li>
                            <li>Interviews audio</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Propriétés des ressources</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Titre et description :</strong> Identification claire</li>
                        <li><strong>Ordre séquentiel :</strong> Parcours d'apprentissage structuré</li>
                        <li><strong>Durée estimée :</strong> Temps prévu pour compléter (en minutes)</li>
                        <li><strong>Obligatoire / Optionnel :</strong> Importance dans le parcours</li>
                        <li><strong>Classe et module :</strong> Rattachement organisationnel</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Système de devoirs</h3>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Types de devoirs</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📝 Travail à rendre</p>
                        <p className="text-sm text-muted-foreground">Document à soumettre (rapport, essai)</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">✏️ Exercice</p>
                        <p className="text-sm text-muted-foreground">Pratique et application</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">🎯 Projet</p>
                        <p className="text-sm text-muted-foreground">Travail de groupe ou individuel conséquent</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="font-semibold">📋 Examen</p>
                        <p className="text-sm text-muted-foreground">Évaluation formelle</p>
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Configuration d'un devoir</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Paramètres disponibles :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Titre et type</strong></li>
                        <li><strong>Description générale</strong></li>
                        <li><strong>Instructions détaillées</strong> (consignes précises)</li>
                        <li><strong>Date d'ouverture</strong> (quand les stagiaires peuvent commencer)</li>
                        <li><strong>Date limite</strong> (deadline de soumission)</li>
                        <li><strong>Points maximum</strong> (barème de notation)</li>
                        <li><strong>Formats de fichiers acceptés</strong> (PDF, DOCX, XLSX, etc.)</li>
                        <li><strong>Taille maximale</strong> du fichier (en MB)</li>
                      </ul>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Workflow de soumission</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
                        <div>
                          <p className="font-semibold">Création par l'enseignant</p>
                          <p className="text-sm text-muted-foreground">Configuration et publication du devoir</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
                        <div>
                          <p className="font-semibold">Accès stagiaire</p>
                          <p className="text-sm text-muted-foreground">Consultation des instructions et téléchargement (si pièce jointe)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
                        <div>
                          <p className="font-semibold">Soumission</p>
                          <p className="text-sm text-muted-foreground">Upload du fichier + commentaire optionnel</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">4</div>
                        <div>
                          <p className="font-semibold">Correction enseignant</p>
                          <p className="text-sm text-muted-foreground">Attribution note + feedback écrit</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">5</div>
                        <div>
                          <p className="font-semibold">Consultation résultat</p>
                          <p className="text-sm text-muted-foreground">Stagiaire visualise note et commentaire</p>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Statuts de soumission</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="badge badge-yellow">Non soumis</span>
                        <span>Le stagiaire n'a pas encore rendu son travail</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-blue">Soumis</span>
                        <span>Travail rendu, en attente de correction</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-green">Corrigé</span>
                        <span>Note et feedback disponibles</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-yellow">À revoir</span>
                        <span>Nécessite des modifications (optionnel)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Suivi de progression</h3>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Données collectées</h4>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-2">Pour chaque stagiaire et chaque module :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Pourcentage de complétion</strong> (ressources vues / total)</li>
                        <li><strong>Temps passé</strong> sur chaque ressource (en minutes)</li>
                        <li><strong>Date de dernière activité</strong></li>
                        <li><strong>Ressources consultées</strong> (liste détaillée)</li>
                        <li><strong>Statut global :</strong> Non commencé, En cours, Complété</li>
                        <li><strong>Date de complétion</strong> (si module terminé)</li>
                      </ul>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Indicateurs clés</h4>
                    <div className="grid md:grid-cols-3 gap-3 mt-3">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Taux de complétion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">% des ressources obligatoires consultées</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Engagement</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">Temps total passé sur le module</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">Moyenne des notes aux devoirs</p>
                        </CardContent>
                      </Card>
                    </div>

                    <h4 className="text-lg font-semibold mt-4 mb-2">Tableaux de bord</h4>
                    
                    <div className="space-y-3">
                      <div className="border-l-4 border-primary pl-4">
                        <p className="font-semibold">Vue Enseignant</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>Progression de chaque stagiaire</li>
                          <li>Identification des stagiaires en retard</li>
                          <li>Ressources les plus/moins consultées</li>
                          <li>Temps moyen par ressource</li>
                          <li>Taux de complétion de la classe</li>
                        </ul>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <p className="font-semibold">Vue Stagiaire</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>Progression personnelle par module</li>
                          <li>Ressources restantes à consulter</li>
                          <li>Temps passé vs temps estimé</li>
                          <li>Notes obtenues aux devoirs</li>
                          <li>Statut global (En retard / À jour / Avancé)</li>
                        </ul>
                      </div>

                      <div className="border-l-4 border-primary pl-4">
                        <p className="font-semibold">Vue Administration</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>Statistiques globales par programme/classe</li>
                          <li>Taux de complétion moyen</li>
                          <li>Taux de réussite (notes moyennes)</li>
                          <li>Identification des modules difficiles</li>
                          <li>Engagement global des stagiaires</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Fonctionnalités avancées</h3>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Communication intégrée
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Messagerie enseignant-stagiaire</li>
                            <li>Annonces par classe ou module</li>
                            <li>Questions-réponses sur les devoirs</li>
                            <li>Feedback personnalisé</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Gestion documentaire
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Partage de documents par classe/module</li>
                            <li>Versioning des ressources</li>
                            <li>Organisation par catégories</li>
                            <li>Recherche et filtrage</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Analytics pédagogiques
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Rapports détaillés de progression</li>
                            <li>Graphiques d'évolution</li>
                            <li>Comparaison entre classes/promotions</li>
                            <li>Export de données pour analyse</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Parcours d'apprentissage type</h3>
                    
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-semibold mb-3">Exemple : Module "Management Stratégique"</p>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <p className="font-semibold">Semaine 1 : Introduction</p>
                          <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                            <li>📄 PDF : Support de cours (30 min)</li>
                            <li>🎥 Vidéo : Présentation du module (45 min)</li>
                            <li>🔗 Article : Lecture complémentaire (20 min)</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-semibold">Semaine 2 : Concepts clés</p>
                          <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                            <li>🎥 Vidéo : Analyse SWOT (60 min)</li>
                            <li>📊 Présentation : Matrices stratégiques (40 min)</li>
                            <li>📝 Exercice : Application SWOT (À rendre)</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-yellow-500 pl-4">
                          <p className="font-semibold">Semaine 3 : Cas pratiques</p>
                          <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                            <li>📄 PDF : Étude de cas (60 min)</li>
                            <li>🎥 Vidéo : Analyse du cas (45 min)</li>
                            <li>🎯 Projet : Analyse stratégique d'entreprise (À rendre)</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-4">
                          <p className="font-semibold">Semaine 4 : Synthèse</p>
                          <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                            <li>📊 Présentation : Récapitulatif (30 min)</li>
                            <li>📋 Examen : Évaluation finale (À rendre)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-info rounded-lg p-4">
                    <h4 className="font-semibold mb-2">📊 Métriques de succès du LMS</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Taux de complétion :</strong> {">"} 85% visé</li>
                      <li><strong>Engagement moyen :</strong> 4-6h par semaine par module</li>
                      <li><strong>Taux de réussite :</strong> {">"} 80% (note ≥ 60%)</li>
                      <li><strong>Satisfaction :</strong> Évaluations fin de module</li>
                      <li><strong>Assiduité :</strong> Connexions régulières (min. 2x/semaine)</li>
                    </ul>
                  </div>

                  <div className="bg-success rounded-lg p-4">
                    <h4 className="font-semibold mb-2">💡 Meilleures pratiques LMS</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Pédagogie :</strong> Alternez types de ressources pour maintenir l'engagement</li>
                      <li><strong>Structuration :</strong> Séquencez le contenu de manière logique et progressive</li>
                      <li><strong>Feedback :</strong> Corrigez rapidement (max 7 jours) avec commentaires détaillés</li>
                      <li><strong>Suivi :</strong> Identifiez et contactez proactivement les stagiaires en retard</li>
                      <li><strong>Communication :</strong> Envoyez des rappels réguliers pour les échéances</li>
                      <li><strong>Qualité :</strong> Mettez à jour le contenu régulièrement</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nouveautés */}
            <TabsContent value="nouveautes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Nouvelles Fonctionnalités
                  </CardTitle>
                  <CardDescription>
                    Découvrez les dernières fonctionnalités ajoutées à Exed Manager 365
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Module Transferts */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-5 w-5 text-primary" />
                      Module Transferts
                    </h3>
                    <p className="mb-3">
                      Gestion complète de la logistique des déplacements des enseignants pour les formations.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Véhicules</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Gestion du parc automobile</li>
                            <li>Suivi des disponibilités</li>
                            <li>Caractéristiques (marque, modèle, places)</li>
                            <li>Statut et kilométrage</li>
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Chauffeurs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Base de données chauffeurs</li>
                            <li>Coordonnées et disponibilités</li>
                            <li>Affectation aux transferts</li>
                            <li>Historique des missions</li>
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Hôtels</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Catalogue des hôtels partenaires</li>
                            <li>Classement par étoiles</li>
                            <li>Coordonnées et contacts</li>
                            <li>Villes et pays</li>
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Transferts</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Planification des déplacements</li>
                            <li>Types : Arrivée, Départ, Inter-sites</li>
                            <li>Lien avec enseignants et modules</li>
                            <li>Optimisation des trajets</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Module CRM */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      CRM & Prospects
                    </h3>
                    <p className="mb-3">
                      Module complet de gestion de la relation client et du pipeline commercial.
                    </p>
                    <div className="bg-muted rounded-lg p-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Prospects</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Gestion des contacts</li>
                            <li>Suivi des statuts</li>
                            <li>Sources d'acquisition</li>
                            <li>Programmes d'intérêt</li>
                            <li>Export Excel</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Devis</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Création de devis</li>
                            <li>Lignes détaillées</li>
                            <li>Conversion en BC</li>
                            <li>Historique des versions</li>
                            <li>Conditions personnalisées</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Bons de Commande</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Création depuis devis</li>
                            <li>Suivi des statuts</li>
                            <li>Lien facturation</li>
                            <li>Gestion multi-payeurs</li>
                            <li>Clôture automatique</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contrats Enseignants */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Génération de Contrats Enseignants
                    </h3>
                    <p className="mb-3">
                      Système de génération automatique des contrats d'intervention basé sur des modèles personnalisables.
                    </p>
                    <div className="space-y-4">
                      <div className="bg-info rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Modèles de contrats</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Upload de templates Word (.docx)</li>
                          <li>Définition des champs variables</li>
                          <li>Mapping avec les données enseignants</li>
                          <li>Types : Vacation ou Prestation de Service</li>
                        </ul>
                      </div>
                      <div className="bg-success rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Génération de contrats</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Sélection par enseignant et programme</li>
                          <li>Choix des modules concernés</li>
                          <li>Unité (jour/heure), quantité, prix unitaire</li>
                          <li>Calcul automatique du montant total</li>
                          <li>Workflow de validation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Module Restauration */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-primary" />
                      Gestion de la Restauration
                    </h3>
                    <p className="mb-3">
                      Module de gestion des offres de restauration et suivi budgétaire.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Offres de restauration</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Catalogue des formules</li>
                          <li>Prix unitaires par devise</li>
                          <li>Nature : Déjeuner, Dîner, Pause café</li>
                          <li>Formules personnalisables</li>
                        </ul>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <h4 className="font-semibold mb-2">États par module</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Nombre d'unités par session</li>
                          <li>Gestion des invités</li>
                          <li>Notes et commentaires</li>
                          <li>Récapitulatif budgétaire</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Assiduité QR Code */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-primary" />
                      Assiduité par QR Code
                    </h3>
                    <p className="mb-3">
                      Système de pointage automatisé par scan de QR Code.
                    </p>
                    <div className="bg-warning rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Fonctionnalités</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Génération de QR codes par session de module</li>
                        <li>Scan par les stagiaires via leur portail</li>
                        <li>Horodatage automatique</li>
                        <li>Détection des retards</li>
                        <li>Saisie manuelle en complément</li>
                        <li>Justificatifs d'absence avec upload</li>
                        <li>Statistiques d'assiduité par classe/stagiaire</li>
                      </ul>
                    </div>
                  </div>

                  {/* Comptabilité bi-devise */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Euro className="h-5 w-5 text-primary" />
                      Comptabilité Bi-Devise EUR/MAD
                    </h3>
                    <p className="mb-3">
                      Gestion financière complète avec double comptabilité en Euros et Dirhams Marocains.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-info rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Fonctionnalités</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Basculement EUR/MAD dans toute l'application</li>
                          <li>Taux de change configurable</li>
                          <li>Conversion automatique des montants</li>
                          <li>Stockage en devise d'origine</li>
                        </ul>
                      </div>
                      <div className="bg-success rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Modules concernés</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Facturation et paiements</li>
                          <li>Devis et bons de commande</li>
                          <li>Budget prévisionnel</li>
                          <li>Performance financière</li>
                          <li>Contrats d'intervention</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Autres améliorations */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Autres améliorations</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Photos de profil</h4>
                          <p className="text-sm text-muted-foreground">
                            Upload de photos pour enseignants et stagiaires avec stockage sécurisé.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Catalogue de modules</h4>
                          <p className="text-sm text-muted-foreground">
                            Bibliothèque de modules réutilisables avec enseignants associés.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Planning multi-vues</h4>
                          <p className="text-sm text-muted-foreground">
                            Calendrier avec vues jour, semaine, mois et détection des conflits.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Trombinoscope</h4>
                          <p className="text-sm text-muted-foreground">
                            Vue galerie des stagiaires par classe avec export PDF.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Assistant IA</h4>
                          <p className="text-sm text-muted-foreground">
                            Chatbot intégré pour assistance contextuelle et FAQ.
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold mb-2">Modèles de factures</h4>
                          <p className="text-sm text-muted-foreground">
                            Templates personnalisables avec logo, conditions et numérotation.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guide Tests */}
            <TabsContent value="guide-tests" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-6 w-6 text-primary" />
                    Guide de Test des Modules
                  </CardTitle>
                  <CardDescription>
                    Accédez rapidement aux différents modules pour tester les fonctionnalités
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        title: "Évaluations & Notes",
                        description: "Système de gestion des évaluations, notes des stagiaires et coefficients",
                        icon: GraduationCap,
                        route: "/notes",
                        tables: ["evaluations", "notes_stagiaires"],
                        color: "text-blue-600",
                        bgColor: "bg-blue-50"
                      },
                      {
                        title: "Assiduité & QR Codes",
                        description: "Suivi de la présence des stagiaires avec scan QR code",
                        icon: ClipboardCheck,
                        route: "/assiduite",
                        tables: ["assiduite"],
                        color: "text-green-600",
                        bgColor: "bg-green-50"
                      },
                      {
                        title: "Discussions",
                        description: "Forums de discussion par classe entre enseignants et stagiaires",
                        icon: MessageSquare,
                        route: "/discussions",
                        tables: ["discussions", "discussion_messages"],
                        color: "text-purple-600",
                        bgColor: "bg-purple-50"
                      },
                      {
                        title: "Restauration",
                        description: "Gestion des offres et états de restauration par module",
                        icon: Utensils,
                        route: "/restauration",
                        tables: ["offres_restauration", "etats_restauration"],
                        color: "text-red-600",
                        bgColor: "bg-red-50"
                      },
                      {
                        title: "Contrats",
                        description: "Gestion des contrats enseignants avec modèles et génération",
                        icon: FileText,
                        route: "/contrats",
                        tables: ["contrats_intervention", "modeles_contrat"],
                        color: "text-indigo-600",
                        bgColor: "bg-indigo-50"
                      },
                      {
                        title: "Transferts",
                        description: "Logistique des déplacements enseignants",
                        icon: Car,
                        route: "/transferts",
                        tables: ["transferts", "vehicules", "chauffeurs", "hotels"],
                        color: "text-orange-600",
                        bgColor: "bg-orange-50"
                      },
                      {
                        title: "CRM & Prospects",
                        description: "Gestion commerciale, devis et bons de commande",
                        icon: Target,
                        route: "/crm",
                        tables: ["prospects", "devis", "bons_commande"],
                        color: "text-cyan-600",
                        bgColor: "bg-cyan-50"
                      },
                      {
                        title: "Devoirs & Soumissions",
                        description: "Gestion des devoirs et soumissions des stagiaires",
                        icon: Target,
                        route: "/devoirs",
                        tables: ["devoirs", "soumissions_devoirs"],
                        color: "text-pink-600",
                        bgColor: "bg-pink-50"
                      }
                    ].map((module) => {
                      const Icon = module.icon;
                      return (
                        <Card 
                          key={module.route}
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => navigate(module.route)}
                        >
                          <CardHeader>
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-lg ${module.bgColor}`}>
                                <Icon className={`w-6 h-6 ${module.color}`} />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-1">{module.title}</CardTitle>
                                <CardDescription className="text-sm">
                                  {module.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-muted-foreground">
                                Tables concernées:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {module.tables.map((table) => (
                                  <code 
                                    key={table}
                                    className="text-xs bg-muted px-2 py-1 rounded"
                                  >
                                    {table}
                                  </code>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>Instructions de test</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">1. Vérifier les permissions</h3>
                        <p className="text-sm text-muted-foreground">
                          Certains modules nécessitent des rôles spécifiques (administrateur, gestionnaire de scolarité, enseignant, stagiaire).
                          Assurez-vous d'avoir le bon rôle attribué via le module Administration.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">2. Données de test</h3>
                        <p className="text-sm text-muted-foreground">
                          Créez d'abord des programmes, classes, modules, enseignants et stagiaires avant de tester les fonctionnalités
                          avancées comme les évaluations, l'assiduité ou les discussions.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">3. RLS (Row Level Security)</h3>
                        <p className="text-sm text-muted-foreground">
                          Si vous ne voyez pas de données, vérifiez que les politiques RLS sont correctement configurées et que vous
                          avez les permissions nécessaires. Les données sont filtrées selon votre rôle.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">4. Navigation</h3>
                        <p className="text-sm text-muted-foreground">
                          Cliquez sur n'importe quelle carte ci-dessus pour accéder directement au module correspondant et commencer
                          vos tests.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Documentation;