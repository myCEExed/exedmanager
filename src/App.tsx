import { Toaster } from "@/components/ui/toaster";
import Planning from "./pages/Planning";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Programmes from "./pages/Programmes";
import ProgrammeDetail from "./pages/ProgrammeDetail";
import Classes from "./pages/Classes";
import ClasseDetail from "./pages/ClasseDetail";
import Modules from "./pages/Modules";
import ModulesCatalogue from "./pages/ModulesCatalogue";
import ModuleCatalogueDetail from "./pages/ModuleCatalogueDetail";
import EnseignantDetail from "./pages/EnseignantDetail";
import StagiaireDetail from "./pages/StagiaireDetail";
import Enseignants from "./pages/Enseignants";
import Stagiaires from "./pages/Stagiaires";
import Trombinoscope from "./pages/Trombinoscope";
import PortailEnseignant from "./pages/PortailEnseignant";
import PortailStagiaire from "./pages/PortailStagiaire";
import PortailChauffeur from "./pages/PortailChauffeur";
import Admin from "./pages/Admin";
import Invitations from "./pages/Invitations";
import AcceptInvitation from "./pages/AcceptInvitation";
import Documents from "./pages/Documents";
import Messages from "./pages/Messages";
import Factures from "./pages/Factures";
import Recouvrements from "./pages/Recouvrements";
import PerformanceFinanciere from "./pages/PerformanceFinanciere";
import Transferts from "./pages/Transferts";
import Clients from "./pages/Clients";
import CRM from "./pages/CRM";
import ContenuPedagogique from "./pages/ContenuPedagogique";
import Devoirs from "./pages/Devoirs";
import Progression from "./pages/Progression";
import Documentation from "./pages/Documentation";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Notes from "./pages/Notes";
import Restauration from "./pages/Restauration";
import Assiduite from "./pages/Assiduite";
import Discussions from "./pages/Discussions";
import Contrats from "./pages/Contrats";
import Tests from "./pages/Tests";
import QRCodeViewer from "./pages/QRCodeViewer";
import ResetPassword from "./pages/ResetPassword";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
};

const ProtectedStandaloneRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CurrencyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programmes"
            element={
              <ProtectedRoute>
                <Programmes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programmes/:id"
            element={
              <ProtectedRoute>
                <ProgrammeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <Classes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/:id"
            element={
              <ProtectedRoute>
                <ClasseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <ProtectedRoute>
                <Modules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <Planning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules-catalogue"
            element={
              <ProtectedRoute>
                <ModulesCatalogue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules-catalogue/:id"
            element={
              <ProtectedRoute>
                <ModuleCatalogueDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enseignants"
            element={
              <ProtectedRoute>
                <Enseignants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enseignants/:id"
            element={
              <ProtectedRoute>
                <EnseignantDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stagiaires"
            element={
              <ProtectedRoute>
                <Stagiaires />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stagiaires/:id"
            element={
              <ProtectedRoute>
                <StagiaireDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trombinoscope"
            element={
              <ProtectedRoute>
                <Trombinoscope />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portail-enseignant"
            element={
              <ProtectedStandaloneRoute>
                <PortailEnseignant />
              </ProtectedStandaloneRoute>
            }
          />
          <Route
            path="/portail-stagiaire"
            element={
              <ProtectedStandaloneRoute>
                <PortailStagiaire />
              </ProtectedStandaloneRoute>
            }
          />
          <Route
            path="/portail-chauffeur"
            element={
              <ProtectedRoute>
                <PortailChauffeur />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invitations"
            element={
              <ProtectedRoute>
                <Invitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/factures"
            element={
              <ProtectedRoute>
                <Factures />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recouvrements"
            element={
              <ProtectedRoute>
                <Recouvrements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance-financiere"
            element={
              <ProtectedRoute>
                <PerformanceFinanciere />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transferts"
            element={
              <ProtectedRoute>
                <Transferts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <CRM />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contenu-pedagogique"
            element={
              <ProtectedRoute>
                <ContenuPedagogique />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devoirs"
            element={
              <ProtectedRoute>
                <Devoirs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progression"
            element={
              <ProtectedRoute>
                <Progression />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentation"
            element={
              <ProtectedRoute>
                <Documentation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restauration"
            element={
              <ProtectedRoute>
                <Restauration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assiduite"
            element={
              <ProtectedRoute>
                <Assiduite />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discussions"
            element={
              <ProtectedRoute>
                <Discussions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contrats"
            element={
              <ProtectedRoute>
                <Contrats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <Tests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-code/:id"
            element={
              <ProtectedStandaloneRoute>
                <QRCodeViewer />
              </ProtectedStandaloneRoute>
            }
          />
          <Route path="/invitation/:token" element={<AcceptInvitation />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </CurrencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
