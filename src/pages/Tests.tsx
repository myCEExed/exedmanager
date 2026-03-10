import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  MessageSquare, 
  ClipboardCheck, 
  Users, 
  Mail, 
  Utensils, 
  QrCode, 
  FileText,
  TrendingUp,
  Target
} from "lucide-react";

export default function Tests() {
  const navigate = useNavigate();

  const modules = [
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
      tables: ["assiduite", "qr_codes_assiduite"],
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Discussions",
      description: "Forums de discussion par classe entre enseignants et stagiaires",
      icon: MessageSquare,
      route: "/discussions",
      tables: ["discussions", "discussion_messages", "discussion_participants"],
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Messagerie",
      description: "Système de messagerie interne pour la communication",
      icon: Mail,
      route: "/messages",
      tables: ["messages"],
      color: "text-orange-600",
      bgColor: "bg-orange-50"
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
      title: "Contrats d'intervention",
      description: "Gestion des contrats des enseignants avec validation",
      icon: FileText,
      route: "/contrats",
      tables: ["contrats_intervention"],
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "Progression des stagiaires",
      description: "Suivi de l'avancement et des résultats par module",
      icon: TrendingUp,
      route: "/progression",
      tables: ["progression_stagiaires"],
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
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Guide de test des modules</h1>
        <p className="text-muted-foreground">
          Accédez rapidement aux différents modules pour tester les fonctionnalités
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
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
                  <Button className="w-full mt-4" onClick={() => navigate(module.route)}>
                    Accéder au module
                  </Button>
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
    </div>
  );
}
