import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, BookOpen, AlertTriangle, Download, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useExcelExport } from "@/hooks/useExcelExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Programme {
  id: string;
  titre: string;
  code: string;
  type: string;
}

interface Client {
  id: string;
  nom: string;
  code: string;
}

interface Module {
  id: string;
  titre: string;
  code: string;
  classe_id: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { exportToExcel } = useExcelExport();
  
  // États pour les statistiques
  const [stats, setStats] = useState({
    heuresRealisees: 0,
    heuresProgrammees: 0,
    stagiaireFormes: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les filtres
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [programmeFilter, setProgrammeFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  
  // Données pour les filtres
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Données brutes pour les stats détaillées
  const [rawModulesData, setRawModulesData] = useState<any[]>([]);
  const [rawInscriptionsData, setRawInscriptionsData] = useState<any[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, typeFilter, programmeFilter, moduleFilter, clientFilter]);

  const loadFilterOptions = async () => {
    try {
      // Charger les programmes
      const { data: programmesData } = await supabase
        .from("programmes")
        .select("id, titre, code, type")
        .order("titre");
      setProgrammes(programmesData || []);

      // Charger les clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, nom, code")
        .order("nom");
      setClients(clientsData || []);

      // Charger les modules
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, titre, code, classe_id")
        .order("titre");
      setModules(modulesData || []);
    } catch (error) {
      console.error("Erreur chargement des options de filtre:", error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les alertes
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Calculer les statistiques pour l'année civile en cours
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
      
      // Construire la requête modules avec les filtres
      let modulesQuery = supabase
        .from("modules")
        .select(`
          id,
          duree_heures, 
          date_debut, 
          date_fin,
          titre,
          code,
          classe_id,
          classes!left(
            id,
            nom,
            programme_id,
            programmes!left(
              id,
              nom,
              code,
              type,
              client_id
            )
          )
        `)
        .gte("date_debut", startOfYear.toISOString())
        .lte("date_debut", endOfYear.toISOString());

      const { data: modulesData } = await modulesQuery;
      
      // Filtrer les modules selon les critères sélectionnés
      let filteredModules = modulesData || [];
      
      if (typeFilter !== "all") {
        filteredModules = filteredModules.filter((m: any) => 
          m.classes?.programmes?.type === typeFilter
        );
      }
      
      if (programmeFilter !== "all") {
        filteredModules = filteredModules.filter((m: any) => 
          m.classes?.programmes?.id === programmeFilter
        );
      }
      
      if (moduleFilter !== "all") {
        filteredModules = filteredModules.filter((m: any) => m.id === moduleFilter);
      }
      
      if (clientFilter !== "all") {
        filteredModules = filteredModules.filter((m: any) => 
          m.classes?.programmes?.client_id === clientFilter
        );
      }
      
      setRawModulesData(filteredModules);

      // Compter les stagiaires uniques formés cette année via inscriptions
      let inscriptionsQuery = supabase
        .from("inscriptions")
        .select(`
          stagiaire_id, 
          classe_id, 
          classes!inner(
            id,
            date_debut,
            programme_id,
            programmes!left(
              id,
              type,
              client_id
            )
          )
        `)
        .gte("classes.date_debut", startOfYear.toISOString())
        .lte("classes.date_debut", endOfYear.toISOString());

      const { data: inscriptionsData } = await inscriptionsQuery;
      
      // Filtrer les inscriptions selon les critères
      let filteredInscriptions = inscriptionsData || [];
      
      if (typeFilter !== "all") {
        filteredInscriptions = filteredInscriptions.filter((i: any) => 
          i.classes?.programmes?.type === typeFilter
        );
      }
      
      if (programmeFilter !== "all") {
        filteredInscriptions = filteredInscriptions.filter((i: any) => 
          i.classes?.programmes?.id === programmeFilter
        );
      }
      
      if (clientFilter !== "all") {
        filteredInscriptions = filteredInscriptions.filter((i: any) => 
          i.classes?.programmes?.client_id === clientFilter
        );
      }
      
      setRawInscriptionsData(filteredInscriptions);

      const now = new Date();
      let heuresRealisees = 0;
      let heuresProgrammees = 0;

      filteredModules.forEach((module: any) => {
        const duree = Number(module.duree_heures) || 0;
        if (module.date_fin && new Date(module.date_fin) < now) {
          heuresRealisees += duree;
        }
        heuresProgrammees += duree;
      });

      // Compter les stagiaires uniques
      const stagiaireIds = new Set(filteredInscriptions.map((i: any) => i.stagiaire_id));

      setStats({
        heuresRealisees,
        heuresProgrammees,
        stagiaireFormes: stagiaireIds.size,
      });

      // Vérifier les conflits d'affectation enseignants
      await checkEnseignantConflicts();
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnseignantConflicts = async () => {
    try {
      // Récupérer toutes les affectations avec leurs dates de modules
      const { data: affectations } = await supabase
        .from("affectations")
        .select(`
          enseignant_id,
          module_id,
          modules!inner(date_debut, date_fin, code, titre)
        `);

      if (!affectations) return;

      // Grouper par enseignant et vérifier les chevauchements
      const enseignantMap = new Map<string, any[]>();
      
      affectations.forEach((aff: any) => {
        if (!enseignantMap.has(aff.enseignant_id)) {
          enseignantMap.set(aff.enseignant_id, []);
        }
        enseignantMap.get(aff.enseignant_id)!.push(aff);
      });

      // Détecter les conflits
      for (const [enseignantId, modules] of enseignantMap.entries()) {
        for (let i = 0; i < modules.length; i++) {
          for (let j = i + 1; j < modules.length; j++) {
            const mod1 = modules[i].modules;
            const mod2 = modules[j].modules;
            
            if (!mod1.date_debut || !mod2.date_debut) continue;
            
            const start1 = new Date(mod1.date_debut);
            const end1 = new Date(mod1.date_fin || mod1.date_debut);
            const start2 = new Date(mod2.date_debut);
            const end2 = new Date(mod2.date_fin || mod2.date_debut);

            // Vérifier le chevauchement
            if (start1 <= end2 && start2 <= end1) {
              // Créer une alerte
              await supabase.from("alerts").insert({
                type: "conflit_affectation",
                titre: "Conflit d'affectation enseignant",
                description: `Un enseignant est affecté à plusieurs modules simultanément: ${mod1.titre} et ${mod2.titre}`,
                severity: "error",
                enseignant_id: enseignantId,
                is_resolved: false
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "warning";
      default:
        return "secondary";
    }
  };

  const hasActiveFilters = typeFilter !== "all" || programmeFilter !== "all" || moduleFilter !== "all" || clientFilter !== "all";

  const clearFilters = () => {
    setTypeFilter("all");
    setProgrammeFilter("all");
    setModuleFilter("all");
    setClientFilter("all");
  };

  const getFilterLabel = () => {
    const parts: string[] = [];
    if (typeFilter !== "all") parts.push(typeFilter);
    if (programmeFilter !== "all") {
      const prog = programmes.find(p => p.id === programmeFilter);
      if (prog) parts.push(prog.titre);
    }
    if (moduleFilter !== "all") {
      const mod = modules.find(m => m.id === moduleFilter);
      if (mod) parts.push(mod.titre);
    }
    if (clientFilter !== "all") {
      const client = clients.find(c => c.id === clientFilter);
      if (client) parts.push(client.nom);
    }
    return parts.length > 0 ? parts.join(" • ") : "Tous";
  };

  const handleExportExcel = () => {
    const exportData = [
      {
        "Indicateur": "Heures réalisées (année)",
        "Valeur": stats.heuresRealisees,
        "Filtres appliqués": getFilterLabel(),
        "Date d'export": format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })
      },
      {
        "Indicateur": "Heures programmées",
        "Valeur": stats.heuresProgrammees,
        "Filtres appliqués": getFilterLabel(),
        "Date d'export": format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })
      },
      {
        "Indicateur": "Stagiaires formés",
        "Valeur": stats.stagiaireFormes,
        "Filtres appliqués": getFilterLabel(),
        "Date d'export": format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })
      }
    ];

    // Ajouter les détails des modules
    const modulesDetails = rawModulesData.map((m: any) => ({
      "Code module": m.code,
      "Titre": m.titre,
      "Durée (heures)": m.duree_heures || 0,
      "Date début": m.date_debut ? format(new Date(m.date_debut), "dd/MM/yyyy", { locale: fr }) : "",
      "Date fin": m.date_fin ? format(new Date(m.date_fin), "dd/MM/yyyy", { locale: fr }) : "",
      "Classe": m.classes?.nom || "",
      "Programme": m.classes?.programmes?.nom || "",
      "Type": m.classes?.programmes?.type || ""
    }));

    const success = exportToExcel(
      exportData.concat(modulesDetails as any),
      "statistiques_tableau_bord",
      "Statistiques"
    );

    if (success) {
      toast.success("Export Excel réussi");
    } else {
      toast.error("Erreur lors de l'export");
    }
  };

  // Filtrer les programmes selon le type sélectionné
  const filteredProgrammes = useMemo(() => {
    if (typeFilter === "all") return programmes;
    return programmes.filter(p => p.type === typeFilter);
  }, [programmes, typeFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d'ensemble de vos formations continues
          </p>
        </div>
        <Button onClick={handleExportExcel} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter Excel
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                <X className="h-4 w-4" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Filtre Type INTRA/INTER */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="INTRA">INTRA</SelectItem>
                  <SelectItem value="INTER">INTER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Programme */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Programme</label>
              <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {filteredProgrammes.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.code} - {prog.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Module */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Module</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.code} - {mod.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre Client */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.code} - {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Filtres actifs :</span>
              <Badge variant="secondary">{getFilterLabel()}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Heures réalisées (année)"
          value={stats.heuresRealisees}
          icon={Clock}
          trend={{ value: "+12% vs année précédente", positive: true }}
        />
        <StatCard
          title="Heures programmées"
          value={stats.heuresProgrammees}
          icon={BookOpen}
        />
        <StatCard
          title="Stagiaires formés"
          value={stats.stagiaireFormes}
          icon={Users}
          trend={{ value: "+8% ce trimestre", positive: true }}
        />
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertes actives
          </CardTitle>
          <CardDescription>
            Détection d'anomalies et notifications importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : alerts.length === 0 ? (
            <div className="rounded-lg bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">
                Aucune alerte active. Tout fonctionne correctement ! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{alert.titre}</h4>
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                    </div>
                    {alert.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;
