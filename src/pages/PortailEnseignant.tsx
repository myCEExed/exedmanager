import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ModuleQRCodeDialog } from "@/components/enseignants/ModuleQRCodeDialog";
import { EnseignantNotesTab } from "@/components/enseignants/EnseignantNotesTab";
import { EnseignantDevoirsTab } from "@/components/enseignants/EnseignantDevoirsTab";
import { EnseignantContenuTab } from "@/components/enseignants/EnseignantContenuTab";
import { EnseignantTrombinoscopeTab } from "@/components/enseignants/EnseignantTrombinoscopeTab";
import { EnseignantMessagesTab } from "@/components/enseignants/EnseignantMessagesTab";
import { EnseignantDiscussionsTab } from "@/components/enseignants/EnseignantDiscussionsTab";
import { EnseignantContratsTab } from "@/components/enseignants/EnseignantContratsTab";
import { EnseignantCalendar } from "@/components/enseignants/EnseignantCalendar";
import { EnseignantProfileEditor } from "@/components/enseignants/EnseignantProfileEditor";
import { EnseignantEnquetesTab } from "@/components/enseignants/EnseignantEnquetesTab";
import { 
  Calendar, 
  BookOpen, 
  Home,
  FileText,
  ClipboardList,
  Users,
  MessageSquare,
  MessagesSquare,
  FileSignature,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface EnseignantProfile {
  id: string;
  nom: string;
  prenom: string;
  photo_url: string | null;
}

type Section = 
  | "mon-portail" 
  | "contenu-pedagogique" 
  | "devoirs" 
  | "notes" 
  | "trombinoscope" 
  | "enquetes"
  | "messages" 
  | "discussions" 
  | "contrats";

const sidebarItems = [
  { id: "mon-portail" as Section, label: "Mon portail", icon: Home },
  { id: "contenu-pedagogique" as Section, label: "Contenu Pédagogique", icon: BookOpen },
  { id: "devoirs" as Section, label: "Devoirs", icon: ClipboardList },
  { id: "notes" as Section, label: "Notes", icon: FileText },
  { id: "trombinoscope" as Section, label: "Trombinoscope", icon: Users },
  { id: "enquetes" as Section, label: "Enquêtes", icon: BarChart3 },
  { id: "messages" as Section, label: "Messages", icon: MessageSquare },
  { id: "discussions" as Section, label: "Discussions", icon: MessagesSquare },
  { id: "contrats" as Section, label: "Contrats", icon: FileSignature },
];

export default function PortailEnseignant() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  const { user } = useAuth();
  const [modulesAVenir, setModulesAVenir] = useState<Module[]>([]);
  const [modulesPasses, setModulesPasses] = useState<Module[]>([]);
  const [enseignantProfile, setEnseignantProfile] = useState<EnseignantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("mon-portail");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      loadEnseignantProfile();
      loadModules();
    }
  }, [user]);

  const loadEnseignantProfile = async () => {
    try {
      const { data } = await supabase
        .from("enseignants")
        .select("id, nom, prenom, photo_url")
        .eq("user_id", user?.id)
        .single();

      if (data) {
        setEnseignantProfile(data);
      }
    } catch (error) {
      console.error("Error loading enseignant profile:", error);
    }
  };

  const loadModules = async () => {
    try {
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) return;

      const { data: affectations } = await supabase
        .from("affectations")
        .select(`
          module_id,
          modules (
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
          )
        `)
        .eq("enseignant_id", enseignant.id)
        .eq("confirmee", true);

      if (affectations) {
        const now = new Date();
        const modules = affectations
          .filter(a => a.modules && a.modules.classes && a.modules.classes.programmes)
          .map(a => ({
            id: a.modules!.id,
            code: a.modules!.code,
            titre: a.modules!.titre,
            date_debut: a.modules!.date_debut,
            date_fin: a.modules!.date_fin,
            classe: {
              nom: a.modules!.classes!.nom,
              programme: {
                titre: a.modules!.classes!.programmes!.titre
              }
            }
          }))
          .filter(m => m.date_debut && m.date_fin)
          .sort((a, b) => new Date(a.date_debut!).getTime() - new Date(b.date_debut!).getTime());

        setModulesAVenir(modules.filter(m => new Date(m.date_fin!) >= now));
        setModulesPasses(modules.filter(m => new Date(m.date_fin!) < now));
      }
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const allModules = [...modulesAVenir, ...modulesPasses];

  const renderMonPortail = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mon portail</h2>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace enseignant
        </p>
      </div>

      <Tabs defaultValue="apercu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apercu" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="calendrier" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="profil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Ma fiche
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="space-y-6">
          {enseignantProfile && (
            <ProfilePhotoUpload
              userType="enseignant"
              userId={enseignantProfile.id}
              currentPhotoUrl={enseignantProfile.photo_url}
              userName={`${enseignantProfile.prenom} ${enseignantProfile.nom}`}
              onPhotoUpdate={loadEnseignantProfile}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Formations à venir
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{modulesAVenir.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Formations passées
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{modulesPasses.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Formations à venir</h3>
            {modulesAVenir.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Aucune formation à venir</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {modulesAVenir.slice(0, 5).map((module) => (
                  <Card key={module.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{module.titre}</CardTitle>
                          <CardDescription>
                            {module.classe.programme.titre} - {module.classe.nom}
                          </CardDescription>
                        </div>
                        <ModuleQRCodeDialog 
                          moduleId={module.id} 
                          moduleTitre={module.titre}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {module.date_debut && module.date_fin 
                              ? `${format(new Date(module.date_debut), "d MMM yyyy", { locale: fr })} - ${format(new Date(module.date_fin), "d MMM yyyy", { locale: fr })}`
                              : "Dates non définies"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {modulesAVenir.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Et {modulesAVenir.length - 5} autres formations...
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Formations passées récentes</h3>
            {modulesPasses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Aucune formation passée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {modulesPasses.slice(-3).reverse().map((module) => (
                  <Card key={module.id} className="opacity-75">
                    <CardHeader>
                      <CardTitle>{module.titre}</CardTitle>
                      <CardDescription>
                        {module.classe.programme.titre} - {module.classe.nom}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {module.date_debut && module.date_fin 
                              ? `${format(new Date(module.date_debut), "d MMM yyyy", { locale: fr })} - ${format(new Date(module.date_fin), "d MMM yyyy", { locale: fr })}`
                              : "Dates non définies"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendrier">
          <EnseignantCalendar modules={allModules} />
        </TabsContent>

        <TabsContent value="profil">
          {enseignantProfile && (
            <EnseignantProfileEditor 
              enseignantId={enseignantProfile.id} 
              onUpdate={loadEnseignantProfile}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">
          Cette section sera bientôt disponible
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Contenu en cours de développement</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "mon-portail":
        return renderMonPortail();
      case "notes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Notes</h2>
              <p className="text-muted-foreground">
                Saisie des notes pour vos modules et classes affectés
              </p>
            </div>
            <EnseignantNotesTab />
          </div>
        );
      case "contenu-pedagogique":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Contenu Pédagogique</h2>
              <p className="text-muted-foreground">
                Gérez les ressources de formation pour vos classes
              </p>
            </div>
            <EnseignantContenuTab />
          </div>
        );
      case "devoirs":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Devoirs</h2>
              <p className="text-muted-foreground">
                Gérez les travaux à rendre pour vos classes
              </p>
            </div>
            <EnseignantDevoirsTab />
          </div>
        );
      case "trombinoscope":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Trombinoscope</h2>
              <p className="text-muted-foreground">
                Visualisez les stagiaires de vos classes
              </p>
            </div>
            <EnseignantTrombinoscopeTab />
          </div>
        );
      case "messages":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Messages</h2>
              <p className="text-muted-foreground">
                Communiquez avec vos classes
              </p>
            </div>
            <EnseignantMessagesTab />
          </div>
        );
      case "discussions":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Discussions</h2>
              <p className="text-muted-foreground">
                Forums de discussion avec vos classes
              </p>
            </div>
            <EnseignantDiscussionsTab />
          </div>
        );
      case "enquetes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Résultats des enquêtes</h2>
              <p className="text-muted-foreground">
                Retours des stagiaires sur vos formations
              </p>
            </div>
            <EnseignantEnquetesTab />
          </div>
        );
      case "contrats":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Contrats</h2>
              <p className="text-muted-foreground">
                Vos contrats d'intervention
              </p>
            </div>
            <EnseignantContratsTab />
          </div>
        );
      default:
        return renderMonPortail();
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "border-r bg-muted/30 flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="font-semibold text-lg">Portail Enseignant</h1>
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title={sidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl mx-auto p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
