import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, List, AlertTriangle, Filter, X, RefreshCw, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { usePlanningConflicts, ModulePlanning } from "@/hooks/usePlanningConflicts";
import { PlanningCalendarMultiView } from "@/components/planning/PlanningCalendarMultiView";
import { ConflictPanel } from "@/components/planning/ConflictPanel";
import { ModuleList } from "@/components/planning/ModuleList";
import { ModuleEditDialog } from "@/components/planning/ModuleEditDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlanningExport } from "@/hooks/usePlanningExport";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
}

const Planning = () => {
  const { modules, conflicts, loading, refresh } = usePlanningConflicts();
  const { exportToPDF, exportToExcel } = usePlanningExport();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("planning");
  const [selectedModule, setSelectedModule] = useState<ModulePlanning | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [filters, setFilters] = useState<{
    programme?: string;
    classe?: string;
    enseignant?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }>({});

  useEffect(() => {
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    const [progResult, classeResult, ensResult] = await Promise.all([
      supabase.from("programmes").select("id, titre, code").order("titre"),
      supabase.from("classes").select("id, nom, sous_code, programme_id").order("nom"),
      supabase.from("enseignants").select("id, nom, prenom").order("nom")
    ]);

    if (progResult.data) setProgrammes(progResult.data);
    if (classeResult.data) setClasses(classeResult.data);
    if (ensResult.data) setEnseignants(ensResult.data);
  };

  const handleModuleClick = (module: ModulePlanning) => {
    if (!canEdit) return; // Ne pas ouvrir le dialog en mode lecture seule
    setSelectedModule(module);
    setEditDialogOpen(true);
  };

  const handleConflictClick = (conflict: any) => {
    if (!canEdit) return; // Ne pas ouvrir le dialog en mode lecture seule
    if (conflict.modules.length > 0) {
      setSelectedModule(conflict.modules[0]);
      setEditDialogOpen(true);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);
  const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined).length;

  // Filter classes by programme
  const filteredClasses = filters.programme
    ? classes.filter((c) => c.programme_id === filters.programme)
    : classes;

  const handleExportPDF = () => {
    try {
      exportToPDF(modules, conflicts, filters, programmes, classes);
      toast.success("Export PDF généré avec succès");
    } catch (error) {
      console.error("Erreur export PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(modules, conflicts, filters, programmes, classes);
      toast.success("Export Excel généré avec succès");
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
          <p className="text-muted-foreground">
            Vue globale de la planification des modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtres</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Effacer
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Programme</Label>
                  <select
                    value={filters.programme || ""}
                    onChange={(e) => setFilters({ ...filters, programme: e.target.value || undefined, classe: undefined })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Tous les programmes</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>{p.titre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Classe</Label>
                  <select
                    value={filters.classe || ""}
                    onChange={(e) => setFilters({ ...filters, classe: e.target.value || undefined })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Toutes les classes</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Intervenant</Label>
                  <select
                    value={filters.enseignant || ""}
                    onChange={(e) => setFilters({ ...filters, enseignant: e.target.value || undefined })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Tous les intervenants</option>
                    {enseignants.map((e) => (
                      <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Date début</Label>
                    <Input
                      type="date"
                      value={filters.dateStart ? filters.dateStart.toISOString().split("T")[0] : ""}
                      onChange={(e) => setFilters({ ...filters, dateStart: e.target.value ? new Date(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={filters.dateEnd ? filters.dateEnd.toISOString().split("T")[0] : ""}
                      onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value ? new Date(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""} de planification détecté{conflicts.length > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {conflicts.filter((c) => c.type === "enseignant").length} conflit(s) enseignant, {conflicts.filter((c) => c.type === "stagiaire").length} conflit(s) stagiaire
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("conflict-panel")?.scrollIntoView({ behavior: "smooth" })}
            >
              Voir les détails
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Calendar/List View */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "calendar" | "list")}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendrier
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                Liste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement du planning...</p>
                  </CardContent>
                </Card>
              ) : (
                <PlanningCalendarMultiView
                  modules={modules}
                  conflicts={conflicts}
                  onModuleClick={canEdit ? handleModuleClick : undefined}
                  filters={filters}
                  readOnly={!canEdit}
                />
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement des modules...</p>
                  </CardContent>
                </Card>
              ) : (
                <ModuleList
                  modules={modules}
                  conflicts={conflicts}
                  onModuleClick={canEdit ? handleModuleClick : undefined}
                  filters={filters}
                  readOnly={!canEdit}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Conflict Panel */}
        <div id="conflict-panel">
          <ConflictPanel
            conflicts={conflicts}
            onConflictClick={canEdit ? handleConflictClick : undefined}
            onModuleClick={canEdit ? handleModuleClick : undefined}
            readOnly={!canEdit}
          />
        </div>
      </div>

      {/* Edit Dialog - Only render if canEdit */}
      {canEdit && (
        <ModuleEditDialog
          module={selectedModule}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={refresh}
        />
      )}
    </div>
  );
};

export default Planning;
