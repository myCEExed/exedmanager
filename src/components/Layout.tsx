import { ReactNode, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import { ChatBot } from "@/components/ChatBot";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  LogOut,
  Menu,
  Shield,
  FileText,
  Euro,
  Building2,
  TrendingUp,
  MessageSquare,
  Receipt,
  Mail,
  Car,
  Library,
  ClipboardCheck,
  BarChart3,
  Utensils,
  QrCode,
  MessagesSquare,
  Calendar,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const { role, isAdmin, canViewSection } = useUserRole();
  const location = useLocation();

  // Navigation items avec mapping vers les sections de permissions
  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard, section: "dashboard" },
    { name: "Documentation", href: "/documentation", icon: BookOpen, section: "documentation" },
    { name: "Programmes", href: "/programmes", icon: BookOpen, section: "programmes" },
    { name: "Classes", href: "/classes", icon: GraduationCap, section: "classes" },
    { name: "Planning", href: "/planning", icon: Calendar, section: "planning" },
    { name: "Modules", href: "/modules-catalogue", icon: BookOpen, section: "modules" },
    { name: "Clients", href: "/clients", icon: Building2, section: "clients" },
    { name: "Enseignants", href: "/enseignants", icon: Users, section: "enseignants" },
    { name: "Stagiaires", href: "/stagiaires", icon: Users, section: "stagiaires" },
    { name: "Trombinoscope", href: "/trombinoscope", icon: Users, section: "trombinoscope" },
    { name: "CRM", href: "/crm", icon: Users, section: "crm" },
    { name: "Factures", href: "/factures", icon: Receipt, section: "factures" },
    { name: "Recouvrements", href: "/recouvrements", icon: Euro, section: "recouvrements" },
    { name: "Performance Financière", href: "/performance-financiere", icon: TrendingUp, section: "performance_financiere" },
    { name: "Transferts", href: "/transferts", icon: Car, section: "transferts" },
    { name: "Documents", href: "/documents", icon: FileText, section: "documents" },
    { name: "Messages", href: "/messages", icon: MessageSquare, section: "messages" },
    { name: "Discussions", href: "/discussions", icon: MessagesSquare, section: "discussions" },
    { name: "Invitations", href: "/invitations", icon: Mail, section: "invitations" },
    { name: "Contenu Pédagogique", href: "/contenu-pedagogique", icon: Library, section: "contenu_pedagogique" },
    { name: "Devoirs", href: "/devoirs", icon: ClipboardCheck, section: "devoirs" },
    { name: "Notes", href: "/notes", icon: GraduationCap, section: "notes" },
    { name: "Assiduité", href: "/assiduite", icon: QrCode, section: "assiduite" },
    { name: "Progression", href: "/progression", icon: BarChart3, section: "progression" },
    { name: "Restauration", href: "/restauration", icon: Utensils, section: "restauration" },
    { name: "Contrats", href: "/contrats", icon: FileText, section: "contrats" },
  ];

  const getRoleLabel = (userRole?: string | null) => {
    switch (userRole) {
      case "proprietaire":
        return "Propriétaire";
      case "administrateur":
        return "Administrateur";
      case "responsable_scolarite":
        return "Responsable Scolarité";
      case "gestionnaire_scolarite":
        return "Gestionnaire Scolarité";
      case "direction_financiere":
        return "Direction Financière";
      case "financier":
        return "Financier";
      case "commercial":
        return "Commercial";
      case "collaborateur":
        return "Collaborateur";
      case "enseignant":
        return "Enseignant";
      case "stagiaire":
        return "Stagiaire";
      case "chauffeur":
        return "Chauffeur";
      default:
        return "Aucun rôle";
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollPositionRef.current;
    }
  }, [location.pathname]);

  const handleScroll = () => {
    if (scrollRef.current) {
      scrollPositionRef.current = scrollRef.current.scrollTop;
    }
  };

  const NavContent = ({ preserveScroll = false }: { preserveScroll?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <img src={logo} alt="CentraleSupélec EXED Campus Casablanca" className="h-16 w-auto object-contain" />
      </div>

      <div 
        ref={preserveScroll ? scrollRef : undefined} 
        onScroll={preserveScroll ? handleScroll : undefined}
        className="flex-1 overflow-y-auto sidebar-scroll"
      >
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const hasAccess = canViewSection(item.section);
            
            if (!hasAccess) return null;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          {isAdmin() && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/admin"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-5 w-5" />
              Administration
            </Link>
          )}
          
          {role === "enseignant" && (
            <Link
              to="/portail-enseignant"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/portail-enseignant"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              Mon Portail
            </Link>
          )}
          
          {role === "stagiaire" && (
            <Link
              to="/portail-stagiaire"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/portail-stagiaire"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <GraduationCap className="h-5 w-5" />
              Mon Parcours
            </Link>
          )}
          
          {role === "chauffeur" && (
            <Link
              to="/portail-chauffeur"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/portail-chauffeur"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Car className="h-5 w-5" />
              Mes Missions
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 rounded-lg bg-sidebar-accent/30 p-3">
          <p className="text-xs font-medium text-sidebar-foreground mb-1">{user?.email}</p>
          <Badge variant="outline" className="text-xs">
            {getRoleLabel(role)}
          </Badge>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <NavContent preserveScroll={true} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <div className="flex items-center gap-4">
            <img src={logo} alt="CentraleSupélec EXED" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="font-medium">{user?.email}</p>
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(role)}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <img src={logo} alt="CentraleSupélec EXED" className="h-8 w-auto object-contain" />
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6">{children}</div>
        </main>
        
        {/* ChatBot flottant */}
        <ChatBot />
      </div>
    </div>
  );
};

export default Layout;
