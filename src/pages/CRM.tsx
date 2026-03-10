import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, FileText, ShoppingCart, CheckCircle, Users, AlertCircle, Eye, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProspectSourcesSelect, getSourceLabel } from "@/components/crm/ProspectSourcesSelect";
import { ProspectInterestSelect } from "@/components/crm/ProspectInterestSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProspectFilters } from "@/components/crm/ProspectFilters";
import { ProspectExport } from "@/components/crm/ProspectExport";
import { SuggestiveInput } from "@/components/crm/SuggestiveInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProspectDetailSheet } from "@/components/crm/ProspectDetailSheet";
import { DevisForm } from "@/components/crm/DevisForm";
import { DevisDetailSheet } from "@/components/crm/DevisDetailSheet";
import { BonCommandeSheet } from "@/components/crm/BonCommandeSheet";
import { BonCommandeForm } from "@/components/crm/BonCommandeForm";
import { ConvertDevisToBCDialog, BCConversionConfig } from "@/components/crm/ConvertDevisToBCDialog";

interface Programme {
  id: string;
  titre: string;
  code: string;
  type: string;
}

interface ModuleCatalogue {
  id: string;
  titre: string;
}

const ITEMS_PER_PAGE = 25;

const CRM = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, canViewSection } = useUserRole();
  
  const [prospects, setProspects] = useState<any[]>([]);
  const [devis, setDevis] = useState<any[]>([]);
  const [bonsCommande, setBonsCommande] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modules, setModules] = useState<ModuleCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProspectDialog, setShowProspectDialog] = useState(false);
  const [showDevisDialog, setShowDevisDialog] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [showProspectDetail, setShowProspectDetail] = useState(false);
  const [importingBrevo, setImportingBrevo] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<any>(null);
  const [showDevisDetail, setShowDevisDetail] = useState(false);
  const [selectedBC, setSelectedBC] = useState<any>(null);
  const [showBCDetail, setShowBCDetail] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [devisToConvert, setDevisToConvert] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [showBCForm, setShowBCForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // New prospect form state
  const [prospectForm, setProspectForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    entreprise: "",
    poste: "",
    sources: [] as string[],
    sourceAutreCommentaire: "",
    interetThematiques: [] as string[],
    interetProgrammeIds: [] as string[],
    interetModuleIds: [] as string[],
  });

  // Filters state
  const [filters, setFilters] = useState({
    sources: [] as string[],
    entreprises: [] as string[],
    postes: [] as string[],
    thematiques: [] as string[],
    programmeIds: [] as string[],
    moduleIds: [] as string[],
    niveauxInteret: [] as string[],
    isDown: null as boolean | null,
  });
  
  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Extract unique values for suggestions
  const uniqueEntreprises = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.entreprise) set.add(p.entreprise);
    });
    return Array.from(set).sort();
  }, [prospects]);

  const uniquePostes = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.poste) set.add(p.poste);
    });
    return Array.from(set).sort();
  }, [prospects]);

  const uniqueThematiques = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.interet_thematiques) {
        p.interet_thematiques.forEach((t: string) => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [prospects]);

  // Check if user has access to CRM - utilise le système de permissions centralisé

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      const hasAccess = canViewSection("crm");
      console.log("🔍 CRM Access Check:", { role, hasAccess, authLoading, roleLoading });
      
      if (!hasAccess) {
        console.log("❌ No access to CRM, redirecting to dashboard");
        navigate("/");
      }
    }
  }, [role, roleLoading, authLoading, navigate, canViewSection]);

  useEffect(() => {
    if (user && !authLoading && !roleLoading) {
      console.log("📊 Fetching CRM data for user");
      fetchData();
    }
  }, [user, authLoading, roleLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prospectsRes, devisRes, bonsCommandeRes, programmesRes, modulesRes, clientsRes] = await Promise.all([
        supabase.from("prospects").select("*").order("created_at", { ascending: false }),
        supabase.from("devis").select("*, prospects(nom, prenom, email), clients(nom)").order("created_at", { ascending: false }),
        supabase.from("bons_commande").select("*, clients(nom), stagiaires(nom, prenom)").order("created_at", { ascending: false }),
        supabase.from("programmes").select("id, titre, code, type").order("titre"),
        supabase.from("module_catalogue").select("id, titre").order("titre"),
        supabase.from("clients").select("id, nom, code").order("nom"),
      ]);

      if (prospectsRes.error) throw prospectsRes.error;
      if (devisRes.error) throw devisRes.error;
      if (bonsCommandeRes.error) throw bonsCommandeRes.error;

      setProspects(prospectsRes.data || []);
      setDevis(devisRes.data || []);
      setBonsCommande(bonsCommandeRes.data || []);
      setProgrammes(programmesRes.data || []);
      setModules(modulesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching CRM data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const resetProspectForm = () => {
    setProspectForm({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      entreprise: "",
      poste: "",
      sources: [],
      sourceAutreCommentaire: "",
      interetThematiques: [],
      interetProgrammeIds: [],
      interetModuleIds: [],
    });
  };

  const validateProspectForm = () => {
    if (!prospectForm.nom.trim()) {
      return "Le nom est obligatoire";
    }
    if (!prospectForm.email.trim() && !prospectForm.telephone.trim()) {
      return "Veuillez renseigner au moins un email ou un téléphone";
    }
    if (prospectForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospectForm.email.trim())) {
      return "L'email n'est pas valide";
    }
    return null;
  };

  const handleCreateProspect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const validationError = validateProspectForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const prospectData = {
        nom: prospectForm.nom,
        prenom: prospectForm.prenom,
        email: prospectForm.email,
        telephone: prospectForm.telephone,
        entreprise: prospectForm.entreprise,
        poste: prospectForm.poste,
        sources: prospectForm.sources,
        source_autre_commentaire: prospectForm.sourceAutreCommentaire,
        interet_thematiques: prospectForm.interetThematiques,
        interet_programme_ids: prospectForm.interetProgrammeIds,
        interet_module_ids: prospectForm.interetModuleIds,
        statut: "nouveau",
        created_by: user?.id,
      };

      const { error: prospectError } = await supabase
        .from("prospects")
        .insert([prospectData]);

      if (prospectError) throw prospectError;

      // Sync with Brevo (non-blocking - don't fail if Brevo sync fails)
      try {
        await supabase.functions.invoke("brevo-sync", {
          body: { action: "create_contact", prospect: prospectData },
        });
      } catch (brevoError) {
        console.warn("Brevo sync failed (non-critical):", brevoError);
        // Don't show error to user - Brevo sync is optional
      }

      toast.success("Prospect créé avec succès");
      setShowProspectDialog(false);
      resetProspectForm();
      fetchData();
    } catch (error: any) {
      console.error("Error creating prospect:", error);
      toast.error("Erreur lors de la création du prospect");
    }
  };

  // Open conversion dialog instead of direct conversion
  const openConvertDialog = (devisId: string) => {
    const devisData = devis.find(d => d.id === devisId);
    if (!devisData) return;
    setDevisToConvert(devisData);
    setShowConvertDialog(true);
  };

  // Generate next BC number
  const generateBCNumber = async () => {
    const { data: lastBC } = await supabase
      .from("bons_commande")
      .select("numero_bc")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastBC ? parseInt(lastBC.numero_bc.split("-")[1]) + 1 : 1;
    return `BC-${String(nextNumber).padStart(4, "0")}`;
  };

  // Get or create client from prospect
  const getOrCreateClient = async (devisData: any) => {
    let client_id = devisData.client_id;
    if (!client_id && devisData.prospect_id) {
      const prospect = prospects.find(p => p.id === devisData.prospect_id);
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert([{
          nom: prospect.entreprise || `${prospect.prenom} ${prospect.nom}`,
          code: `CLI-${Date.now()}`,
          email: prospect.email,
          telephone: prospect.telephone,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (clientError) throw clientError;
      client_id = newClient.id;
    }
    return client_id;
  };

  const convertDevisToBonCommande = async (config: BCConversionConfig) => {
    if (!devisToConvert || !user) return;

    try {
      const devisData = devisToConvert;

      if (config.mode === "single_client") {
        // Single client takes all
        const numero_bc = await generateBCNumber();
        const client_id = config.clientId || await getOrCreateClient(devisData);

        const { error: bcError } = await supabase
          .from("bons_commande")
          .insert([{
            numero_bc,
            devis_id: devisData.id,
            client_id,
            programme_id: devisData.programme_id,
            montant_total: devisData.montant_total,
            montant_restant: devisData.montant_total,
            statut: "valide",
            date_emission: new Date().toISOString().split("T")[0],
            created_by: user.id,
            type_payeur: "client",
            mode_repartition: "total",
          }]);

        if (bcError) throw bcError;
        toast.success("Bon de commande créé pour le client");

      } else if (config.mode === "single_stagiaire") {
        // Single stagiaire takes all
        const numero_bc = await generateBCNumber();

        const { error: bcError } = await supabase
          .from("bons_commande")
          .insert([{
            numero_bc,
            devis_id: devisData.id,
            stagiaire_id: config.stagiaireId,
            programme_id: devisData.programme_id,
            montant_total: devisData.montant_total,
            montant_restant: devisData.montant_total,
            statut: "valide",
            date_emission: new Date().toISOString().split("T")[0],
            created_by: user.id,
            type_payeur: "stagiaire",
            mode_repartition: "total",
          }]);

        if (bcError) throw bcError;
        toast.success("Bon de commande créé pour le stagiaire");

      } else if (config.mode === "split" && config.splitConfig) {
        // Split between stagiaire and client
        const { stagiaireId, clientId, splitMode, stagiaireValue, clientValue } = config.splitConfig;
        
        // Calculate amounts
        let montantStagiaire: number;
        let montantClient: number;
        const montantTotal = parseFloat(devisData.montant_total);

        if (splitMode === "pourcentage") {
          montantStagiaire = (montantTotal * stagiaireValue) / 100;
          montantClient = montantTotal - montantStagiaire;
        } else {
          montantStagiaire = stagiaireValue;
          montantClient = montantTotal - stagiaireValue;
        }

        // Create BC for stagiaire
        const numeroBCStagiaire = await generateBCNumber();
        const { error: bcStagiaireError } = await supabase
          .from("bons_commande")
          .insert([{
            numero_bc: numeroBCStagiaire,
            devis_id: devisData.id,
            devis_parent_id: devisData.id,
            stagiaire_id: stagiaireId,
            programme_id: devisData.programme_id,
            montant_total: montantStagiaire,
            montant_restant: montantStagiaire,
            statut: "valide",
            date_emission: new Date().toISOString().split("T")[0],
            created_by: user.id,
            type_payeur: "stagiaire",
            mode_repartition: splitMode === "pourcentage" ? "pourcentage" : "montant_fixe",
            pourcentage_part: splitMode === "pourcentage" ? stagiaireValue : null,
            montant_part: splitMode === "montant_fixe" ? stagiaireValue : null,
          }]);

        if (bcStagiaireError) throw bcStagiaireError;

        // Create BC for client
        const numeroBCClient = await generateBCNumber();
        const { error: bcClientError } = await supabase
          .from("bons_commande")
          .insert([{
            numero_bc: numeroBCClient,
            devis_id: devisData.id,
            devis_parent_id: devisData.id,
            client_id: clientId,
            programme_id: devisData.programme_id,
            montant_total: montantClient,
            montant_restant: montantClient,
            statut: "valide",
            date_emission: new Date().toISOString().split("T")[0],
            created_by: user.id,
            type_payeur: "client",
            mode_repartition: splitMode === "pourcentage" ? "pourcentage" : "montant_fixe",
            pourcentage_part: splitMode === "pourcentage" ? clientValue : null,
            montant_part: splitMode === "montant_fixe" ? montantClient : null,
          }]);

        if (bcClientError) throw bcClientError;
        toast.success("2 bons de commande créés (stagiaire + tiers payant)");
      }

      // Update devis status
      await supabase
        .from("devis")
        .update({ statut: "accepte" })
        .eq("id", devisData.id);

      setShowConvertDialog(false);
      setDevisToConvert(null);
      setShowDevisDetail(false);
      fetchData();
    } catch (error: any) {
      console.error("Error converting devis:", error);
      toast.error("Erreur lors de la conversion");
    }
  };

  const handleImportFromBrevo = async () => {
    setImportingBrevo(true);
    try {
      console.log("🔄 Starting Brevo import...");
      const { data, error } = await supabase.functions.invoke("brevo-sync", {
        body: { action: "import_contacts" },
      });

      if (error) throw error;

      console.log("✅ Brevo import result:", data);
      toast.success(data.message || "Contacts importés depuis Brevo");
      fetchData();
    } catch (error: any) {
      console.error("❌ Error importing from Brevo:", error);
      toast.error("Erreur lors de l'importation depuis Brevo");
    } finally {
      setImportingBrevo(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: any = {
      nouveau: "secondary",
      qualifie: "default",
      brouillon: "outline",
      envoye: "default",
      accepte: "default",
      refuse: "destructive",
      en_attente: "secondary",
      valide: "default",
    };
    return <Badge variant={variants[statut] || "default"}>{statut}</Badge>;
  };

  const clearFilters = () => {
    setFilters({
      sources: [],
      entreprises: [],
      postes: [],
      thematiques: [],
      programmeIds: [],
      moduleIds: [],
      niveauxInteret: [],
      isDown: null,
    });
  };

  // Apply filters
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      // Text search
      const matchesSearch =
        prospect.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.entreprise?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Sources filter
      if (filters.sources.length > 0) {
        const prospectSources = prospect.sources || [];
        if (!filters.sources.some((s) => prospectSources.includes(s))) return false;
      }

      // Entreprises filter
      if (filters.entreprises.length > 0) {
        if (!prospect.entreprise || !filters.entreprises.includes(prospect.entreprise)) return false;
      }

      // Postes filter
      if (filters.postes.length > 0) {
        if (!prospect.poste || !filters.postes.includes(prospect.poste)) return false;
      }

      // Thematiques filter
      if (filters.thematiques.length > 0) {
        const prospectThematiques = prospect.interet_thematiques || [];
        if (!filters.thematiques.some((t) => prospectThematiques.includes(t))) return false;
      }

      // Programmes filter
      if (filters.programmeIds.length > 0) {
        const prospectProgrammes = prospect.interet_programme_ids || [];
        if (!filters.programmeIds.some((id) => prospectProgrammes.includes(id))) return false;
      }

      // Modules filter
      if (filters.moduleIds.length > 0) {
        const prospectModules = prospect.interet_module_ids || [];
        if (!filters.moduleIds.some((id) => prospectModules.includes(id))) return false;
      }

      // Niveau d'intérêt filter
      if (filters.niveauxInteret.length > 0) {
        if (!filters.niveauxInteret.includes(prospect.niveau_interet || "non_defini")) return false;
      }

      // Is down filter
      if (filters.isDown !== null) {
        if (prospect.is_down !== filters.isDown) return false;
      }

      return true;
    });
  }, [prospects, searchTerm, filters]);

  // Pagination for prospects
  const totalProspectPages = Math.ceil(filteredProspects.length / ITEMS_PER_PAGE);
  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProspects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProspects, currentPage]);

  if (loading || roleLoading || authLoading) {
    console.log("⏳ CRM Loading state:", { loading, roleLoading, authLoading });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log("✅ CRM Rendering main content");

  const stats = {
    prospects: prospects.length,
    devisEnCours: devis.filter(d => d.statut === "envoye").length,
    bonsCommande: bonsCommande.length,
    caTotal: bonsCommande.reduce((acc, bc) => acc + parseFloat(bc.montant_total || 0), 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">CRM & Pipeline Commercial</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleImportFromBrevo} 
            variant="outline"
            disabled={importingBrevo}
          >
            {importingBrevo ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Importation...
              </>
            ) : (
              "Importer depuis Brevo"
            )}
          </Button>
          <Button onClick={() => setShowProspectDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Prospect
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prospects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis en Cours</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.devisEnCours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bons de Commande</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bonsCommande}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Validé</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.caTotal.toFixed(2)} €</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="prospects">
            <TabsList>
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
              <TabsTrigger value="devis">Devis</TabsTrigger>
              <TabsTrigger value="bons-commande">Bons de Commande</TabsTrigger>
            </TabsList>

            <TabsContent value="prospects" className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <ProspectFilters
                  prospects={prospects}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                />
                <ProspectExport
                  prospects={filteredProspects}
                  programmes={programmes}
                  modules={modules}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredProspects.length === prospects.length 
                  ? `${prospects.length} prospect(s) - Cliquez sur l'icône œil pour consulter les détails`
                  : `${filteredProspects.length} prospect(s) sur ${prospects.length} (filtre actif)`
                }
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Niveau d'intérêt</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProspects.map((prospect) => (
                    <TableRow key={prospect.id} className={prospect.is_down ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {prospect.is_down && <XCircle className="h-4 w-4 text-destructive" />}
                          {prospect.prenom} {prospect.nom}
                        </div>
                      </TableCell>
                      <TableCell>{prospect.email || prospect.telephone || "-"}</TableCell>
                      <TableCell>{prospect.entreprise || "-"}</TableCell>
                      <TableCell>
                        {prospect.is_down ? (
                          <Badge variant="destructive">Perdu</Badge>
                        ) : prospect.niveau_interet === "tres_interesse" ? (
                          <Badge className="bg-green-100 text-green-800">Très intéressé</Badge>
                        ) : prospect.niveau_interet === "moyennement_interesse" ? (
                          <Badge className="bg-amber-100 text-amber-800">Moyennement</Badge>
                        ) : prospect.niveau_interet === "peu_interesse" ? (
                          <Badge className="bg-red-100 text-red-800">Peu intéressé</Badge>
                        ) : (
                          <Badge variant="secondary">Non défini</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatutBadge(prospect.statut)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedProspect(prospect);
                              setShowProspectDetail(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!prospect.is_down && (
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedProspect(prospect);
                                setShowDevisDialog(true);
                              }}
                            >
                              Devis
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Prospects */}
              {totalProspectPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalProspectPages} ({filteredProspects.length} prospects)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm">{currentPage} / {totalProspectPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalProspectPages, p + 1))}
                      disabled={currentPage === totalProspectPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="devis">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Devis</TableHead>
                    <TableHead>Client/Prospect</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Date Émission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devis.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.numero_devis}</TableCell>
                      <TableCell>
                        {d.clients?.nom || (d.prospects ? `${d.prospects.prenom} ${d.prospects.nom}` : "-")}
                      </TableCell>
                      <TableCell>{parseFloat(d.montant_total).toFixed(2)} €</TableCell>
                      <TableCell>{new Date(d.date_emission).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatutBadge(d.statut)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedDevis(d);
                            setShowDevisDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="bons-commande">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowBCForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Bon de Commande
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° BC</TableHead>
                    <TableHead>Payeur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Facturé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonsCommande.map((bc) => (
                    <TableRow key={bc.id}>
                      <TableCell>{bc.numero_bc}</TableCell>
                      <TableCell>
                        {bc.clients?.nom || (bc.stagiaires ? `${bc.stagiaires.nom} ${bc.stagiaires.prenom}` : "-")}
                        {bc.type_payeur && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({bc.type_payeur === "client" ? "Entreprise" : bc.type_payeur === "stagiaire" ? "Individuel" : bc.type_payeur})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{parseFloat(bc.montant_total).toFixed(2)} €</TableCell>
                      <TableCell>{parseFloat(bc.montant_facture || 0).toFixed(2)} €</TableCell>
                      <TableCell>{new Date(bc.date_emission).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={bc.est_cloture ? "secondary" : "default"}>
                          {bc.est_cloture ? "Clôturé" : bc.statut}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedBC(bc);
                            setShowBCDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Gérer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog Nouveau Prospect */}
      <Dialog open={showProspectDialog} onOpenChange={(open) => {
        setShowProspectDialog(open);
        if (!open) resetProspectForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nouveau Prospect</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
            <form onSubmit={handleCreateProspect} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={prospectForm.prenom}
                    onChange={(e) => setProspectForm({ ...prospectForm, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={prospectForm.nom}
                    onChange={(e) => setProspectForm({ ...prospectForm, nom: e.target.value })}
                    required
                  />
                </div>
              </div>
              {!prospectForm.email.trim() && !prospectForm.telephone.trim() && (
                <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-600">
                    Veuillez renseigner au moins un email ou un téléphone
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="email">Email {!prospectForm.telephone.trim() && "*"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={prospectForm.email}
                  onChange={(e) => setProspectForm({ ...prospectForm, email: e.target.value })}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone {!prospectForm.email.trim() && "*"}</Label>
                <Input
                  id="telephone"
                  value={prospectForm.telephone}
                  onChange={(e) => setProspectForm({ ...prospectForm, telephone: e.target.value })}
                  placeholder="+33 6 00 00 00 00"
                />
              </div>
              <div>
                <Label>Entreprise</Label>
                <SuggestiveInput
                  value={prospectForm.entreprise}
                  onChange={(value) => setProspectForm({ ...prospectForm, entreprise: value })}
                  suggestions={uniqueEntreprises}
                  placeholder="Saisir ou sélectionner..."
                />
              </div>
              <div>
                <Label>Poste</Label>
                <SuggestiveInput
                  value={prospectForm.poste}
                  onChange={(value) => setProspectForm({ ...prospectForm, poste: value })}
                  suggestions={uniquePostes}
                  placeholder="Saisir ou sélectionner..."
                />
              </div>

              <ProspectSourcesSelect
                value={prospectForm.sources}
                onChange={(sources) => setProspectForm({ ...prospectForm, sources })}
                autreCommentaire={prospectForm.sourceAutreCommentaire}
                onAutreCommentaireChange={(comment) =>
                  setProspectForm({ ...prospectForm, sourceAutreCommentaire: comment })
                }
              />

              <ProspectInterestSelect
                thematiques={prospectForm.interetThematiques}
                onThematiquesChange={(thematiques) =>
                  setProspectForm({ ...prospectForm, interetThematiques: thematiques })
                }
                programmeIds={prospectForm.interetProgrammeIds}
                onProgrammeIdsChange={(ids) =>
                  setProspectForm({ ...prospectForm, interetProgrammeIds: ids })
                }
                moduleIds={prospectForm.interetModuleIds}
                onModuleIdsChange={(ids) =>
                  setProspectForm({ ...prospectForm, interetModuleIds: ids })
                }
                existingThematiques={uniqueThematiques}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowProspectDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog Créer Devis */}
      <DevisForm
        open={showDevisDialog}
        onOpenChange={setShowDevisDialog}
        prospect={selectedProspect}
        onSuccess={fetchData}
        programmes={programmes}
      />

      {/* Fiche prospect détaillée */}
      <ProspectDetailSheet
        prospect={selectedProspect}
        open={showProspectDetail}
        onOpenChange={setShowProspectDetail}
        onUpdate={fetchData}
        programmes={programmes}
        modules={modules}
      />

      {/* Détail Devis */}
      <DevisDetailSheet
        devis={selectedDevis}
        open={showDevisDetail}
        onOpenChange={setShowDevisDetail}
        onUpdate={fetchData}
        programmes={programmes}
        onConvertToBC={openConvertDialog}
      />

      {/* Dialog de conversion Devis -> BC */}
      <ConvertDevisToBCDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        devis={devisToConvert}
        onConvert={convertDevisToBonCommande}
        clients={clients}
      />

      {/* Formulaire création BC directe */}
      <BonCommandeForm
        open={showBCForm}
        onOpenChange={setShowBCForm}
        onSuccess={fetchData}
        clients={clients}
        programmes={programmes}
      />

      {/* Détail Bon de Commande */}
      <BonCommandeSheet
        bonCommande={selectedBC}
        open={showBCDetail}
        onOpenChange={setShowBCDetail}
        onUpdate={fetchData}
      />
    </div>
  );
};

export default CRM;
