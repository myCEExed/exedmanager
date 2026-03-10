import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  FileDown,
  FileSpreadsheet,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useEnseignantExport } from "@/hooks/useEnseignantExport";

interface ModuleHistory {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_heures: number | null;
  classe_id: string;
  classe_nom: string;
  programme_titre: string;
}

interface ClasseStats {
  classe_id: string;
  classe_nom: string;
  sous_code: string;
  programme_titre: string;
  date_debut: string | null;
  date_fin: string | null;
  nb_modules: number;
  total_heures: number;
}

interface UniqueModule {
  code: string;
  titre: string;
}

interface EnseignantHistoryTabProps {
  enseignantId: string;
  enseignantName: string;
}

export const EnseignantHistoryTab = ({ enseignantId, enseignantName }: EnseignantHistoryTabProps) => {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleHistory[]>([]);
  const [uniqueModules, setUniqueModules] = useState<UniqueModule[]>([]);
  
  // Filters
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>([]);
  const [moduleFilterOpen, setModuleFilterOpen] = useState(false);

  const { exportHistoryToPDF, exportHistoryToExcel } = useEnseignantExport();

  useEffect(() => {
    loadHistory();
  }, [enseignantId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Get all affectations for this enseignant
      const { data: affectations, error: affError } = await supabase
        .from("affectations")
        .select(`
          id,
          module_id,
          modules(
            id,
            code,
            titre,
            date_debut,
            date_fin,
            duree_heures,
            classe_id,
            classes(
              id,
              nom,
              sous_code,
              date_debut,
              date_fin,
              programmes(titre)
            )
          )
        `)
        .eq("enseignant_id", enseignantId);

      if (affError) throw affError;

      // Transform data
      const modulesData: ModuleHistory[] = [];
      const uniqueModulesMap = new Map<string, UniqueModule>();

      affectations?.forEach((aff: any) => {
        if (aff.modules) {
          const mod = aff.modules;
          const classe = mod.classes;
          
          if (classe) {
            modulesData.push({
              id: mod.id,
              code: mod.code,
              titre: mod.titre,
              date_debut: mod.date_debut,
              date_fin: mod.date_fin,
              duree_heures: mod.duree_heures,
              classe_id: classe.id,
              classe_nom: classe.nom,
              programme_titre: classe.programmes?.titre || "",
            });

            // Track unique modules by code
            if (!uniqueModulesMap.has(mod.code)) {
              uniqueModulesMap.set(mod.code, {
                code: mod.code,
                titre: mod.titre,
              });
            }
          }
        }
      });

      // Sort by date
      modulesData.sort((a, b) => {
        const dateA = a.date_debut ? new Date(a.date_debut).getTime() : 0;
        const dateB = b.date_debut ? new Date(b.date_debut).getTime() : 0;
        return dateB - dateA;
      });

      setModules(modulesData);
      setUniqueModules(Array.from(uniqueModulesMap.values()));
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredModules = useMemo(() => {
    let result = modules;

    if (dateDebut) {
      result = result.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) >= new Date(dateDebut);
      });
    }

    if (dateFin) {
      result = result.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) <= new Date(dateFin);
      });
    }

    if (selectedModuleCodes.length > 0) {
      result = result.filter(m => selectedModuleCodes.includes(m.code));
    }

    return result;
  }, [modules, dateDebut, dateFin, selectedModuleCodes]);

  // Calculate classes stats from filtered modules
  const classesStats = useMemo(() => {
    const classesMap = new Map<string, ClasseStats>();

    filteredModules.forEach(mod => {
      const existing = classesMap.get(mod.classe_id);
      if (existing) {
        existing.nb_modules += 1;
        existing.total_heures += mod.duree_heures || 0;
      } else {
        classesMap.set(mod.classe_id, {
          classe_id: mod.classe_id,
          classe_nom: mod.classe_nom,
          sous_code: "",
          programme_titre: mod.programme_titre,
          date_debut: null,
          date_fin: null,
          nb_modules: 1,
          total_heures: mod.duree_heures || 0,
        });
      }
    });

    return Array.from(classesMap.values());
  }, [filteredModules]);

  // Calculate stats
  const stats = useMemo(() => ({
    total_modules: filteredModules.length,
    total_classes: classesStats.length,
    total_heures: filteredModules.reduce((sum, m) => sum + (m.duree_heures || 0), 0),
  }), [filteredModules, classesStats]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  };

  const clearFilters = () => {
    setDateDebut("");
    setDateFin("");
    setSelectedModuleCodes([]);
  };

  const hasActiveFilters = dateDebut || dateFin || selectedModuleCodes.length > 0;

  const toggleModuleCode = (code: string) => {
    setSelectedModuleCodes(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleExportPDF = () => {
    exportHistoryToPDF(
      enseignantName,
      stats,
      filteredModules,
      classesStats,
      { dateDebut, dateFin, selectedModules: selectedModuleCodes }
    );
    toast.success("Export PDF généré avec succès");
  };

  const handleExportExcel = () => {
    exportHistoryToExcel(
      enseignantName,
      stats,
      filteredModules,
      classesStats,
      { dateDebut, dateFin, selectedModules: selectedModuleCodes }
    );
    toast.success("Export Excel généré avec succès");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Période du</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Au</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Modules</Label>
              <Popover open={moduleFilterOpen} onOpenChange={setModuleFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-between">
                    {selectedModuleCodes.length > 0
                      ? `${selectedModuleCodes.length} sélectionné(s)`
                      : "Tous les modules"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <ScrollArea className="h-[250px] p-4">
                    <div className="space-y-2">
                      {uniqueModules.map((mod) => (
                        <div key={mod.code} className="flex items-center space-x-2">
                          <Checkbox
                            id={`module-${mod.code}`}
                            checked={selectedModuleCodes.includes(mod.code)}
                            onCheckedChange={() => toggleModuleCode(mod.code)}
                          />
                          <label
                            htmlFor={`module-${mod.code}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            <span className="font-medium">{mod.code}</span>
                            <span className="text-muted-foreground ml-1">- {mod.titre}</span>
                          </label>
                        </div>
                      ))}
                      {uniqueModules.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucun module dispensé
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-500" />
              Modules dispensés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_modules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              Classes animées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_classes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Heures de formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_heures.toFixed(1)} h</div>
          </CardContent>
        </Card>
      </div>

      {/* Modules List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Modules dispensés ({filteredModules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredModules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun module trouvé avec les filtres actuels
            </p>
          ) : (
            <div className="space-y-3">
              {filteredModules.map((mod, index) => (
                <div
                  key={`${mod.id}-${index}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{mod.titre}</div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{mod.code}</Badge>
                      <span>•</span>
                      <span>{mod.classe_nom}</span>
                      <span>•</span>
                      <span className="text-xs">{mod.programme_titre}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3 h-3" />
                      {formatDate(mod.date_debut)} - {formatDate(mod.date_fin)}
                    </div>
                    {mod.duree_heures && (
                      <Badge variant="secondary" className="w-fit">
                        <Clock className="w-3 h-3 mr-1" />
                        {mod.duree_heures}h
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Classes animées ({classesStats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classesStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune classe trouvée avec les filtres actuels
            </p>
          ) : (
            <div className="space-y-3">
              {classesStats.map((classe) => (
                <div
                  key={classe.classe_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{classe.classe_nom}</div>
                    <div className="text-sm text-muted-foreground">
                      {classe.programme_titre}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {classe.nb_modules} module{classe.nb_modules > 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      {classe.total_heures.toFixed(1)}h
                    </Badge>
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
