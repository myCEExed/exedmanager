import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  Users, 
  Euro, 
  Calendar, 
  BookOpen, 
  GraduationCap,
  FileDown,
  FileSpreadsheet,
  Filter,
  X
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useClientExport } from "@/hooks/useClientExport";

interface Client {
  id: string;
  nom: string;
  code: string;
}

interface Programme {
  id: string;
  code: string;
  titre: string;
  type: string;
  date_debut: string | null;
  date_fin: string | null;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  date_debut: string | null;
  date_fin: string | null;
  programme_id: string;
  programme_titre: string;
  nb_stagiaires: number;
}

interface ClientStats {
  nb_programmes: number;
  nb_stagiaires: number;
  ca_total: number;
  ca_par_annee: { annee: number; montant: number }[];
}

interface ClientStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export const ClientStatsDialog = ({ open, onOpenChange, client }: ClientStatsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  
  // Filters
  const [filterAnnee, setFilterAnnee] = useState<string>("__all__");
  const [filterProgramme, setFilterProgramme] = useState<string>("__all__");
  const [filterClasse, setFilterClasse] = useState<string>("__all__");

  const { exportStatsToPDF, exportStatsToExcel, exportHistoryToPDF, exportHistoryToExcel } = useClientExport();

  useEffect(() => {
    if (open && client) {
      loadClientData();
    }
  }, [open, client]);

  const loadClientData = async () => {
    if (!client) return;
    setLoading(true);

    try {
      // Load programmes for this client
      const { data: programmesData, error: progError } = await supabase
        .from("programmes")
        .select("id, code, titre, type, date_debut, date_fin")
        .eq("client_id", client.id)
        .order("date_debut", { ascending: false });

      if (progError) throw progError;
      setProgrammes(programmesData || []);

      // Load classes for these programmes
      const programmeIds = programmesData?.map(p => p.id) || [];
      
      if (programmeIds.length > 0) {
        const { data: classesData, error: classError } = await supabase
          .from("classes")
          .select(`
            id,
            nom,
            sous_code,
            date_debut,
            date_fin,
            programme_id,
            programmes(titre)
          `)
          .in("programme_id", programmeIds)
          .order("date_debut", { ascending: false });

        if (classError) throw classError;

        // Get stagiaire counts for each class
        const classesWithCounts = await Promise.all(
          (classesData || []).map(async (classe) => {
            const { count } = await supabase
              .from("inscriptions")
              .select("*", { count: "exact", head: true })
              .eq("classe_id", classe.id);

            return {
              id: classe.id,
              nom: classe.nom,
              sous_code: classe.sous_code,
              date_debut: classe.date_debut,
              date_fin: classe.date_fin,
              programme_id: classe.programme_id,
              programme_titre: (classe.programmes as any)?.titre || "",
              nb_stagiaires: count || 0,
            };
          })
        );

        setClasses(classesWithCounts);
      } else {
        setClasses([]);
      }

      // Calculate stats
      await calculateStats(client.id, programmesData || []);
    } catch (error) {
      console.error("Error loading client data:", error);
      toast.error("Erreur lors du chargement des données client");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (clientId: string, clientProgrammes: Programme[]) => {
    try {
      const programmeIds = clientProgrammes.map(p => p.id);
      
      if (programmeIds.length === 0) {
        setStats({
          nb_programmes: 0,
          nb_stagiaires: 0,
          ca_total: 0,
          ca_par_annee: [],
        });
        return;
      }

      // Get all classes for these programmes
      const { data: allClasses } = await supabase
        .from("classes")
        .select("id")
        .in("programme_id", programmeIds);

      const classIds = allClasses?.map(c => c.id) || [];

      if (classIds.length === 0) {
        setStats({
          nb_programmes: clientProgrammes.length,
          nb_stagiaires: 0,
          ca_total: 0,
          ca_par_annee: [],
        });
        return;
      }

      // Get invoices for these classes
      const { data: factures } = await supabase
        .from("factures")
        .select("montant_total, date_emission, stagiaire_id")
        .in("classe_id", classIds);

      const uniqueStagiaires = new Set(factures?.map(f => f.stagiaire_id) || []);
      const caTotal = factures?.reduce((sum, f) => sum + Number(f.montant_total), 0) || 0;

      const caParAnnee = factures?.reduce((acc, f) => {
        const annee = new Date(f.date_emission).getFullYear();
        const existing = acc.find(item => item.annee === annee);
        if (existing) {
          existing.montant += Number(f.montant_total);
        } else {
          acc.push({ annee, montant: Number(f.montant_total) });
        }
        return acc;
      }, [] as { annee: number; montant: number }[]) || [];

      setStats({
        nb_programmes: clientProgrammes.length,
        nb_stagiaires: uniqueStagiaires.size,
        ca_total: caTotal,
        ca_par_annee: caParAnnee.sort((a, b) => b.annee - a.annee),
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
    }
  };

  // Get available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    programmes.forEach(p => {
      if (p.date_debut) years.add(new Date(p.date_debut).getFullYear());
    });
    classes.forEach(c => {
      if (c.date_debut) years.add(new Date(c.date_debut).getFullYear());
    });
    stats?.ca_par_annee.forEach(ca => years.add(ca.annee));
    return Array.from(years).sort((a, b) => b - a);
  }, [programmes, classes, stats]);

  // Filtered data based on selected filters
  const filteredProgrammes = useMemo(() => {
    let result = programmes;
    
    if (filterAnnee && filterAnnee !== "__all__") {
      result = result.filter(p => {
        if (!p.date_debut) return false;
        return new Date(p.date_debut).getFullYear().toString() === filterAnnee;
      });
    }
    
    if (filterProgramme && filterProgramme !== "__all__") {
      result = result.filter(p => p.id === filterProgramme);
    }
    
    return result;
  }, [programmes, filterAnnee, filterProgramme]);

  const filteredClasses = useMemo(() => {
    let result = classes;
    
    if (filterAnnee && filterAnnee !== "__all__") {
      result = result.filter(c => {
        if (!c.date_debut) return false;
        return new Date(c.date_debut).getFullYear().toString() === filterAnnee;
      });
    }
    
    if (filterProgramme && filterProgramme !== "__all__") {
      result = result.filter(c => c.programme_id === filterProgramme);
    }
    
    if (filterClasse && filterClasse !== "__all__") {
      result = result.filter(c => c.id === filterClasse);
    }
    
    return result;
  }, [classes, filterAnnee, filterProgramme, filterClasse]);

  // Filtered stats
  const filteredStats = useMemo(() => {
    if (!stats) return null;

    let filteredCaParAnnee = stats.ca_par_annee;
    
    if (filterAnnee && filterAnnee !== "__all__") {
      filteredCaParAnnee = filteredCaParAnnee.filter(ca => ca.annee.toString() === filterAnnee);
    }

    const filteredCaTotal = filteredCaParAnnee.reduce((sum, ca) => sum + ca.montant, 0);
    const filteredNbStagiaires = filteredClasses.reduce((sum, c) => sum + c.nb_stagiaires, 0);

    const hasFilters = (filterAnnee && filterAnnee !== "__all__") || 
                       (filterProgramme && filterProgramme !== "__all__") || 
                       (filterClasse && filterClasse !== "__all__");

    return {
      nb_programmes: filteredProgrammes.length,
      nb_stagiaires: filteredNbStagiaires,
      ca_total: hasFilters ? filteredCaTotal : stats.ca_total,
      ca_par_annee: filteredCaParAnnee,
    };
  }, [stats, filterAnnee, filterProgramme, filterClasse, filteredProgrammes, filteredClasses]);

  const clearFilters = () => {
    setFilterAnnee("__all__");
    setFilterProgramme("__all__");
    setFilterClasse("__all__");
  };

  const hasActiveFilters = (filterAnnee && filterAnnee !== "__all__") || 
                           (filterProgramme && filterProgramme !== "__all__") || 
                           (filterClasse && filterClasse !== "__all__");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: fr });
  };

  const handleExportStatsPDF = () => {
    if (!client || !filteredStats) return;
    exportStatsToPDF(
      client.nom,
      filteredStats,
      { annee: filterAnnee, programmeId: filterProgramme, classeId: filterClasse },
      filteredProgrammes,
      filteredClasses
    );
    toast.success("Export PDF généré avec succès");
  };

  const handleExportStatsExcel = () => {
    if (!client || !filteredStats) return;
    exportStatsToExcel(
      client.nom,
      filteredStats,
      { annee: filterAnnee, programmeId: filterProgramme, classeId: filterClasse },
      filteredProgrammes,
      filteredClasses
    );
    toast.success("Export Excel généré avec succès");
  };

  const handleExportHistoryPDF = () => {
    if (!client) return;
    exportHistoryToPDF(client.nom, filteredProgrammes, filteredClasses);
    toast.success("Export PDF généré avec succès");
  };

  const handleExportHistoryExcel = () => {
    if (!client) return;
    exportHistoryToExcel(client.nom, filteredProgrammes, filteredClasses);
    toast.success("Export Excel généré avec succès");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {client?.nom} - Vue d'ensemble
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistiques
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Historique
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 py-4 border-b">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                Filtres:
              </div>
              
              <Select value={filterAnnee} onValueChange={setFilterAnnee}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterProgramme} onValueChange={setFilterProgramme}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous</SelectItem>
                  {programmes.map(prog => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.titre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClasse} onValueChange={setFilterClasse}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  {classes.map(classe => (
                    <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 pr-4">
              <TabsContent value="stats" className="mt-4 space-y-6">
                {/* Export buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportStatsPDF}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportStatsExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Programmes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{filteredStats?.nb_programmes || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Stagiaires
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{filteredStats?.nb_stagiaires || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Euro className="w-4 h-4 text-primary" />
                        Chiffre d'affaires
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {(filteredStats?.ca_total || 0).toLocaleString("fr-FR")} €
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CA by Year */}
                {filteredStats && filteredStats.ca_par_annee.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Chiffre d'affaires par année</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {filteredStats.ca_par_annee.map(item => (
                          <div
                            key={item.annee}
                            className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="font-medium">{item.annee}</span>
                            <span className="text-lg font-bold">{item.montant.toLocaleString("fr-FR")} €</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-6">
                {/* Export buttons */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportHistoryPDF}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportHistoryExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>

                {/* Programmes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-500" />
                      Programmes ({filteredProgrammes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredProgrammes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun programme associé
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredProgrammes.map(prog => (
                          <div
                            key={prog.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{prog.titre}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{prog.code}</span>
                                <Badge variant="outline" className="text-xs">{prog.type}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {formatDate(prog.date_debut)} - {formatDate(prog.date_fin)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Classes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-purple-500" />
                      Classes ({filteredClasses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredClasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune classe associée
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {filteredClasses.map(classe => (
                          <div
                            key={classe.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{classe.nom}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{classe.sous_code}</span>
                                <span>•</span>
                                <span>{classe.programme_titre}</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1">
                              <Badge variant="secondary" className="w-fit">
                                <Users className="w-3 h-3 mr-1" />
                                {classe.nb_stagiaires} stagiaires
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(classe.date_debut)} - {formatDate(classe.date_fin)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
