import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { StagiaireProfileEditor } from "@/components/stagiaires/StagiaireProfileEditor";
import { StagiaireCalendar } from "@/components/stagiaires/StagiaireCalendar";
import { StagiaireContenuTab } from "@/components/stagiaires/StagiaireContenuTab";
import { StagiaireDevoirsTab } from "@/components/stagiaires/StagiaireDevoirsTab";
import { StagiaireNotesTab } from "@/components/stagiaires/StagiaireNotesTab";
import { StagiaireAssiduiteTab } from "@/components/stagiaires/StagiaireAssiduiteTab";
import { StagiaireMessagesTab } from "@/components/stagiaires/StagiaireMessagesTab";
import { StagiaireDiscussionsTab } from "@/components/stagiaires/StagiaireDiscussionsTab";
import { StagiaireProgressionTab } from "@/components/stagiaires/StagiaireProgressionTab";
import { StagiaireFacturesTab } from "@/components/stagiaires/StagiaireFacturesTab";
import { StagiaireEnquetesTab } from "@/components/stagiaires/StagiaireEnquetesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  BookOpen, 
  Home,
  FileText,
  ClipboardList,
  MessageSquare,
  MessagesSquare,
  TrendingUp,
  Clock,
  Award,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Module {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  };
}

interface StagiaireProfile {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
}

type Section = 
  | "mes-parcours" 
  | "planning" 
  | "contenu-pedagogique" 
  | "devoirs"
  | "discussions"
  | "notes" 
  | "assiduite"
  | "progression"
  | "messages"
  | "enquetes"
  | "factures";

const sidebarItems = [
  { id: "mes-parcours" as Section, label: "Mes Parcours", icon: Home },
  { id: "planning" as Section, label: "Planning", icon: Calendar },
  { id: "contenu-pedagogique" as Section, label: "Contenu Pédagogique", icon: BookOpen },
  { id: "devoirs" as Section, label: "Devoirs", icon: ClipboardList },
  { id: "discussions" as Section, label: "Discussions", icon: MessagesSquare },
  { id: "notes" as Section, label: "Notes", icon: Award },
  { id: "assiduite" as Section, label: "Assiduité", icon: Clock },
  { id: "progression" as Section, label: "Progression", icon: TrendingUp },
  { id: "enquetes" as Section, label: "Enquêtes", icon: BarChart3 },
  { id: "messages" as Section, label: "Messages", icon: MessageSquare },
  { id: "factures" as Section, label: "Mes Factures", icon: CreditCard },
];

export default function PortailStagiaire() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [stagiaireProfile, setStagiaireProfile] = useState<StagiaireProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("mes-parcours");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      loadStagiaireProfile();
      loadModules();
    }
  }, [user]);

  const loadStagiaireProfile = async () => {
    try {
      const { data } = await supabase
        .from("stagiaires")
        .select("id, nom, prenom, photo_url")
        .eq("user_id", user?.id)
        .single();

      if (data) {
        setStagiaireProfile(data);
      }
    } catch (error) {
      console.error("Error loading stagiaire profile:", error);
    }
  };

  const loadModules = async () => {
    try {
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      const { data: inscriptions } = await supabase
        .from("inscriptions")
        .select("classe_id")
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptions || inscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const classeIds = inscriptions.map(i => i.classe_id);

      const { data: modulesData } = await supabase
        .from("modules")
        .select(`
          id,
          code,
          titre,
          date_debut,
          date_fin,
          classes (
            nom,
            programmes (
              titre
            )
          )
        `)
        .in("classe_id", classeIds)
        .order("date_debut", { ascending: true });

      if (modulesData) {
        const validModules = modulesData
          .filter(m => m.classes && m.classes.programmes)
          .map(m => ({
            id: m.id,
            code: m.code,
            titre: m.titre,
            date_debut: m.date_debut,
            date_fin: m.date_fin,
            classe: {
              nom: m.classes!.nom,
              programme: {
                titre: m.classes!.programmes!.titre
              }
            }
          }));
        setModules(validModules);
      }
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const upcomingModules = modules.filter(m => m.date_fin && new Date(m.date_fin) >= now);
  const pastModules = modules.filter(m => m.date_fin && new Date(m.date_fin) < now);

  const renderMesParcours = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mes Parcours</h2>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace stagiaire
        </p>
      </div>

      <Tabs defaultValue="apercu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apercu" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="profil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Ma fiche
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="space-y-6">
          {stagiaireProfile && (
            <ProfilePhotoUpload
              userType="stagiaire"
              userId={stagiaireProfile.id}
              currentPhotoUrl={stagiaireProfile.photo_url}
              userName={`${stagiaireProfile.prenom} ${stagiaireProfile.nom}`}
              onPhotoUpdate={loadStagiaireProfile}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Formations à venir</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingModules.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Formations terminées</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pastModules.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Prochains modules</h3>
            {upcomingModules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Aucun module à venir</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcomingModules.slice(0, 5).map((module) => (
                  <Card key={module.id}>
                    <CardHeader className="pb-2">
                      <CardTitle>{module.titre}</CardTitle>
                      <CardDescription>
                        {module.classe.programme.titre} - {module.classe.nom}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {module.date_debut && module.date_fin 
                            ? `${format(new Date(module.date_debut), "d MMM yyyy", { locale: fr })} - ${format(new Date(module.date_fin), "d MMM yyyy", { locale: fr })}`
                            : "Dates non définies"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profil">
          {stagiaireProfile && (
            <StagiaireProfileEditor 
              stagiaireId={stagiaireProfile.id} 
              onUpdate={loadStagiaireProfile}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "mes-parcours":
        return renderMesParcours();
      case "planning":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Planning</h2>
              <p className="text-muted-foreground">Votre calendrier de formations</p>
            </div>
            <StagiaireCalendar modules={modules} />
          </div>
        );
      case "contenu-pedagogique":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Contenu Pédagogique</h2>
              <p className="text-muted-foreground">Documents et ressources de vos formations</p>
            </div>
            <StagiaireContenuTab />
          </div>
        );
      case "devoirs":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Devoirs</h2>
              <p className="text-muted-foreground">Vos travaux à rendre</p>
            </div>
            <StagiaireDevoirsTab />
          </div>
        );
      case "discussions":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Discussions</h2>
              <p className="text-muted-foreground">Forums de discussion de vos classes</p>
            </div>
            <StagiaireDiscussionsTab />
          </div>
        );
      case "notes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Notes</h2>
              <p className="text-muted-foreground">Vos résultats et évaluations</p>
            </div>
            <StagiaireNotesTab />
          </div>
        );
      case "assiduite":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Assiduité</h2>
              <p className="text-muted-foreground">Votre présence aux formations</p>
            </div>
            <StagiaireAssiduiteTab />
          </div>
        );
      case "progression":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Progression</h2>
              <p className="text-muted-foreground">Votre avancement dans les formations</p>
            </div>
            <StagiaireProgressionTab />
          </div>
        );
      case "messages":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Messages</h2>
              <p className="text-muted-foreground">Messages de vos formateurs</p>
            </div>
            <StagiaireMessagesTab />
          </div>
        );
      case "enquetes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Enquêtes</h2>
              <p className="text-muted-foreground">Évaluations de vos formations</p>
            </div>
            <StagiaireEnquetesTab />
          </div>
        );
      case "factures":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Mes Factures</h2>
              <p className="text-muted-foreground">Vos factures de formation INTER</p>
            </div>
            <StagiaireFacturesTab />
          </div>
        );
      default:
        return renderMesParcours();
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside 
        className={cn(
          "border-r bg-muted/30 flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-lg">Portail Stagiaire</h1>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-2 border-t">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "hover:bg-destructive/10 text-destructive"
            )}
            title={sidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>
    </div>
  );
}
