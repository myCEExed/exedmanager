import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useExcelExport } from "@/hooks/useExcelExport";
import { Filter, X, FileSpreadsheet, MapPin, Users, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Programme {
  id: string;
  code: string;
  titre: string;
}

interface ModuleWithDetails {
  module_id: string;
  module_titre: string;
  date_debut: string | null;
  date_fin: string | null;
  type_lieu: string | null;
  salle: string | null;
  lieu_hors_site: string | null;
  classe_id: string;
  classe_nom: string;
  programme_id: string;
  programme_code: string;
  programme_titre: string;
  enseignants: { id: string; prenom: string; nom: string }[];
  nb_stagiaires: number;
}

interface ClasseGrouped {
  classe_id: string;
  classe_nom: string;
  modules: ModuleWithDetails[];
}

interface ProgrammeGrouped {
  programme_id: string;
  programme_code: string;
  programme_titre: string;
  classes: ClasseGrouped[];
}

const ProgrammeDescriptifTab = () => {
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modulesData, setModulesData] = useState<ModuleWithDetails[]>([]);
  const [filterProgrammeId, setFilterProgrammeId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch programmes list
      const { data: progList, error: progError } = await supabase
        .from("programmes")
        .select("id, code, titre")
        .order("titre");

      if (progError) throw progError;
      setProgrammes(progList || []);

      // Fetch all modules with their classes and programmes
      const { data: modulesRaw, error: modulesError } = await supabase
        .from("modules")
        .select(`
          id,
          titre,
          date_debut,
          date_fin,
          type_lieu,
          salle,
          lieu_hors_site,
          classe_id,
          classes!inner (
            id,
            nom,
            programme_id,
            programmes!inner (
              id,
              code,
              titre
            )
          )
        `)
        .order("date_debut", { ascending: true, nullsFirst: false });

      if (modulesError) throw modulesError;

      // Fetch all affectations with enseignants
      const { data: affectationsRaw, error: affError } = await supabase
        .from("affectations")
        .select(`
          module_id,
          enseignants (
            id,
            prenom,
            nom
          )
        `);

      if (affError) throw affError;

      // Create a map of module_id to enseignants
      const enseignantsMap: Record<string, { id: string; prenom: string; nom: string }[]> = {};
      (affectationsRaw || []).forEach((aff: any) => {
        if (aff.enseignants) {
          if (!enseignantsMap[aff.module_id]) {
            enseignantsMap[aff.module_id] = [];
          }
          enseignantsMap[aff.module_id].push({
            id: aff.enseignants.id,
            prenom: aff.enseignants.prenom,
            nom: aff.enseignants.nom
          });
        }
      });

      // Fetch inscriptions count per classe
      const { data: inscriptionsRaw, error: inscError } = await supabase
        .from("inscriptions")
        .select("classe_id");

      if (inscError) throw inscError;

      // Count stagiaires per classe
      const stagiaireCountMap: Record<string, number> = {};
      (inscriptionsRaw || []).forEach((insc: any) => {
        stagiaireCountMap[insc.classe_id] = (stagiaireCountMap[insc.classe_id] || 0) + 1;
      });

      // Transform data
      const modules: ModuleWithDetails[] = (modulesRaw || [])
        .filter((m: any) => m.classes && m.classes.programmes)
        .map((m: any) => ({
          module_id: m.id,
          module_titre: m.titre,
          date_debut: m.date_debut,
          date_fin: m.date_fin,
          type_lieu: m.type_lieu,
          salle: m.salle,
          lieu_hors_site: m.lieu_hors_site,
          classe_id: m.classes.id,
          classe_nom: m.classes.nom,
          programme_id: m.classes.programmes.id,
          programme_code: m.classes.programmes.code,
          programme_titre: m.classes.programmes.titre,
          enseignants: enseignantsMap[m.id] || [],
          nb_stagiaires: stagiaireCountMap[m.classes.id] || 0
        }));

      setModulesData(modules);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données descriptives.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and group data
  const groupedData = useMemo(() => {
    let filtered = modulesData;
    
    if (filterProgrammeId) {
      filtered = modulesData.filter(m => m.programme_id === filterProgrammeId);
    }

    // Group by programme, then by classe
    const programmeMap: Record<string, ProgrammeGrouped> = {};

    filtered.forEach(m => {
      if (!programmeMap[m.programme_id]) {
        programmeMap[m.programme_id] = {
          programme_id: m.programme_id,
          programme_code: m.programme_code,
          programme_titre: m.programme_titre,
          classes: []
        };
      }

      const prog = programmeMap[m.programme_id];
      let classe = prog.classes.find(c => c.classe_id === m.classe_id);
      
      if (!classe) {
        classe = {
          classe_id: m.classe_id,
          classe_nom: m.classe_nom,
          modules: []
        };
        prog.classes.push(classe);
      }

      classe.modules.push(m);
    });

    // Sort modules by date within each classe
    Object.values(programmeMap).forEach(prog => {
      prog.classes.forEach(classe => {
        classe.modules.sort((a, b) => {
          if (!a.date_debut && !b.date_debut) return 0;
          if (!a.date_debut) return 1;
          if (!b.date_debut) return -1;
          return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
        });
      });
    });

    return Object.values(programmeMap);
  }, [modulesData, filterProgrammeId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const getLieuDisplay = (module: ModuleWithDetails) => {
    if (module.type_lieu === "hors_site" && module.lieu_hors_site) {
      return module.lieu_hors_site;
    }
    if (module.salle) {
      return `Salle ${module.salle}`;
    }
    if (module.type_lieu === "sur_site") {
      return "Sur site";
    }
    return "-";
  };

  const exportToExcelHandler = () => {
    const data = modulesData
      .filter(m => !filterProgrammeId || m.programme_id === filterProgrammeId)
      .map(m => ({
        "Programme": `${m.programme_code} - ${m.programme_titre}`,
        "Classe": m.classe_nom,
        "Module": m.module_titre,
        "Date début": formatDate(m.date_debut),
        "Date fin": formatDate(m.date_fin),
        "Enseignants": m.enseignants.map(e => `${e.prenom} ${e.nom}`).join(", ") || "-",
        "Nb Stagiaires": m.nb_stagiaires,
        "Lieu": getLieuDisplay(m)
      }));

    exportToExcel(data, "descriptif_programmes", "Descriptif Programmes");
    toast({ title: "Export réussi", description: "Les données ont été exportées." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span>Descriptif des Programmes</span>
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select
                value={filterProgrammeId || "__all__"}
                onValueChange={(v) => setFilterProgrammeId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Tous les programmes" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="__all__">Tous les programmes</SelectItem>
                  {programmes.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.code} - {prog.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterProgrammeId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterProgrammeId("")}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={exportToExcelHandler} 
              disabled={groupedData.length === 0}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Exporter Excel</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groupedData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Aucune donnée disponible.
          </div>
        ) : (
          groupedData.map((prog) => (
            <div key={prog.programme_id} className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground">
                  {prog.programme_code} - {prog.programme_titre}
                </h3>
              </div>

              {prog.classes.map((classe) => (
                <div key={classe.classe_id} className="ml-4 border-l-2 border-primary/20 pl-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {classe.classe_nom}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {classe.modules[0]?.nb_stagiaires || 0} stagiaire{(classe.modules[0]?.nb_stagiaires || 0) > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Module</TableHead>
                          <TableHead className="min-w-[120px]">Date début</TableHead>
                          <TableHead className="min-w-[120px]">Date fin</TableHead>
                          <TableHead className="min-w-[180px]">Enseignant(s)</TableHead>
                          <TableHead className="text-center min-w-[80px]">Stagiaires</TableHead>
                          <TableHead className="min-w-[150px]">Lieu</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classe.modules.map((module) => (
                          <TableRow key={module.module_id}>
                            <TableCell className="font-medium">
                              {module.module_titre}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(module.date_debut)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(module.date_fin)}
                            </TableCell>
                            <TableCell>
                              {module.enseignants.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {module.enseignants.map((e) => (
                                    <Badge key={e.id} variant="secondary" className="text-xs">
                                      {e.prenom} {e.nom}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Non affecté</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {module.nb_stagiaires}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {getLieuDisplay(module)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ProgrammeDescriptifTab;
