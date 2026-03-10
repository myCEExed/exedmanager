import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface ProgressionModule {
  id: string;
  stagiaire_id: string;
  module_id: string;
  statut: string;
  pourcentage_completion: number;
  temps_passe_minutes: number;
  derniere_activite: string;
  modules: {
    id: string;
    titre: string;
    code: string;
    duree_heures: number | null;
    classe_id: string;
  };
  stagiaires?: {
    nom: string;
    prenom: string;
    email: string;
  };
  absent?: boolean; // Ajouté pour marquer les absences
}

interface Stats {
  total_modules: number;
  modules_termines: number;
  modules_en_cours: number;
  modules_absents: number;
  temps_total_minutes: number;
  taux_completion_moyen: number;
}

interface Programme {
  id: string;
  code: string;
  titre: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

export default function Progression() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { toast } = useToast();
  const [progressions, setProgressions] = useState<ProgressionModule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Programmes et classes
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [selectedClasse, setSelectedClasse] = useState<string>("");
  
  // Stagiaires
  const [stagiaires, setStagiaires] = useState<any[]>([]);
  const [selectedStagiaire, setSelectedStagiaire] = useState<string>("");

  // Classes filtrées par programme
  const filteredClasses = useMemo(() => {
    if (!selectedProgramme) return [];
    return allClasses.filter(c => c.programme_id === selectedProgramme);
  }, [allClasses, selectedProgramme]);

  // Détecte si on affiche la vue consolidée (toutes les classes du programme)
  const isConsolidatedView = useMemo(() => {
    return selectedProgramme && selectedClasse === "all";
  }, [selectedProgramme, selectedClasse]);

  useEffect(() => {
    if (role === "administrateur" || role === "gestionnaire_scolarite") {
      fetchProgrammesAndClasses();
    } else {
      fetchProgression();
    }
  }, [role]);

  useEffect(() => {
    // Reset classe et stagiaire quand on change de programme
    setSelectedClasse("");
    setSelectedStagiaire("");
    setStagiaires([]);
    setProgressions([]);
    setStats(null);
  }, [selectedProgramme]);

  useEffect(() => {
    if (selectedClasse) {
      if (selectedClasse === "all") {
        // Vue consolidée: charger tous les stagiaires du programme
        fetchStagiairesForProgramme(selectedProgramme);
      } else {
        fetchStagiaires(selectedClasse);
      }
      setSelectedStagiaire("");
      setProgressions([]);
      setStats(null);
    }
  }, [selectedClasse]);

  useEffect(() => {
    if (selectedClasse) {
      if (selectedStagiaire === "all") {
        // Vue consolidée tous les stagiaires
        if (selectedClasse === "all") {
          fetchConsolidatedProgressionForProgramme(selectedProgramme);
        } else {
          fetchConsolidatedProgressionForClasse(selectedClasse);
        }
      } else if (selectedStagiaire) {
        if (selectedClasse === "all") {
          fetchProgressionForStagiaireInProgramme(selectedStagiaire, selectedProgramme);
        } else {
          fetchProgressionForStagiaire(selectedStagiaire, selectedClasse);
        }
      }
    }
  }, [selectedStagiaire, selectedClasse]);

  const fetchProgrammesAndClasses = async () => {
    try {
      const [{ data: programmesData }, { data: classesData }] = await Promise.all([
        supabase.from("programmes").select("id, code, titre").order("code"),
        supabase.from("classes").select("id, nom, sous_code, programme_id").order("sous_code"),
      ]);
      
      setProgrammes(programmesData || []);
      setAllClasses(classesData || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStagiaires = async (classeId: string) => {
    const { data } = await supabase
      .from("inscriptions")
      .select(`
        stagiaire_id,
        stagiaires (id, nom, prenom, email)
      `)
      .eq("classe_id", classeId);

    if (data) {
      setStagiaires(data.map((item: any) => item.stagiaires).filter(Boolean));
    }
  };

  const fetchStagiairesForProgramme = async (programmeId: string) => {
    // Récupérer tous les stagiaires inscrits dans les classes du programme
    const classeIds = filteredClasses.map(c => c.id);
    if (classeIds.length === 0) {
      setStagiaires([]);
      return;
    }

    const { data } = await supabase
      .from("inscriptions")
      .select(`
        stagiaire_id,
        stagiaires (id, nom, prenom, email)
      `)
      .in("classe_id", classeIds);

    if (data) {
      // Dédupliquer les stagiaires (un stagiaire peut être dans plusieurs classes)
      const stagiaireMap = new Map();
      data.forEach((item: any) => {
        if (item.stagiaires) {
          stagiaireMap.set(item.stagiaires.id, item.stagiaires);
        }
      });
      setStagiaires(Array.from(stagiaireMap.values()));
    }
  };

  const fetchProgression = async () => {
    try {
      let query = supabase
        .from("progression_stagiaires")
        .select(`
          *,
          modules (id, titre, code, duree_heures, classe_id)
        `);

      if (role === "stagiaire") {
        const { data: stagiaireData } = await supabase
          .from("stagiaires")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (stagiaireData) {
          query = query.eq("stagiaire_id", stagiaireData.id);
        }
      }

      const { data, error } = await query.order("derniere_activite", { ascending: false });

      if (error) throw error;

      setProgressions(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressionForStagiaire = async (stagiaireId: string, classeId: string) => {
    setLoading(true);
    try {
      // 1. Récupérer les modules de la classe
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, titre, code, duree_heures, classe_id")
        .eq("classe_id", classeId);

      const modules = modulesData || [];
      const moduleIds = modules.map(m => m.id);

      // 2. Récupérer les absences du stagiaire pour ces modules
      const { data: absencesData } = await supabase
        .from("assiduite")
        .select("module_id, present")
        .eq("stagiaire_id", stagiaireId)
        .in("module_id", moduleIds)
        .eq("present", false);

      const absentModuleIds = new Set((absencesData || []).map(a => a.module_id));

      // 3. Récupérer la progression du stagiaire
      const { data: progressionData, error } = await supabase
        .from("progression_stagiaires")
        .select(`
          *,
          modules (id, titre, code, duree_heures, classe_id),
          stagiaires (nom, prenom, email)
        `)
        .eq("stagiaire_id", stagiaireId)
        .in("module_id", moduleIds)
        .order("derniere_activite", { ascending: false });

      if (error) throw error;

      // 4. Marquer les modules où le stagiaire était absent
      const progressionsWithAbsence = (progressionData || []).map(p => ({
        ...p,
        absent: absentModuleIds.has(p.module_id),
      }));

      // Filtrer les modules avec absence si demandé
      const filteredProgressions = progressionsWithAbsence.filter(p => !p.absent);

      setProgressions(filteredProgressions);
      calculateStats(filteredProgressions, absentModuleIds.size);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressionForStagiaireInProgramme = async (stagiaireId: string, programmeId: string) => {
    setLoading(true);
    try {
      // Récupérer toutes les classes du programme
      const classeIds = filteredClasses.map(c => c.id);
      
      // 1. Récupérer les modules des classes du programme
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, titre, code, duree_heures, classe_id")
        .in("classe_id", classeIds);

      const modules = modulesData || [];
      const moduleIds = modules.map(m => m.id);

      if (moduleIds.length === 0) {
        setProgressions([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // 2. Récupérer les absences du stagiaire
      const { data: absencesData } = await supabase
        .from("assiduite")
        .select("module_id, present")
        .eq("stagiaire_id", stagiaireId)
        .in("module_id", moduleIds)
        .eq("present", false);

      const absentModuleIds = new Set((absencesData || []).map(a => a.module_id));

      // 3. Récupérer la progression
      const { data: progressionData, error } = await supabase
        .from("progression_stagiaires")
        .select(`
          *,
          modules (id, titre, code, duree_heures, classe_id),
          stagiaires (nom, prenom, email)
        `)
        .eq("stagiaire_id", stagiaireId)
        .in("module_id", moduleIds)
        .order("derniere_activite", { ascending: false });

      if (error) throw error;

      // 4. Filtrer les modules avec absence
      const filteredProgressions = (progressionData || []).filter(
        p => !absentModuleIds.has(p.module_id)
      );

      setProgressions(filteredProgressions);
      calculateStats(filteredProgressions, absentModuleIds.size);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedProgressionForClasse = async (classeId: string) => {
    setLoading(true);
    try {
      // Récupérer les modules de la classe
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, titre, code, duree_heures, classe_id")
        .eq("classe_id", classeId);

      const modules = modulesData || [];
      const moduleIds = modules.map(m => m.id);

      if (moduleIds.length === 0) {
        setProgressions([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // Récupérer la progression de tous les stagiaires
      const { data: progressionData, error } = await supabase
        .from("progression_stagiaires")
        .select(`
          *,
          modules (id, titre, code, duree_heures, classe_id),
          stagiaires (nom, prenom, email)
        `)
        .in("module_id", moduleIds)
        .order("derniere_activite", { ascending: false });

      if (error) throw error;

      setProgressions(progressionData || []);
      calculateStats(progressionData || []);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedProgressionForProgramme = async (programmeId: string) => {
    setLoading(true);
    try {
      // Récupérer toutes les classes du programme
      const classeIds = filteredClasses.map(c => c.id);
      
      if (classeIds.length === 0) {
        setProgressions([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // Récupérer les modules des classes du programme
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, titre, code, duree_heures, classe_id")
        .in("classe_id", classeIds);

      const modules = modulesData || [];
      const moduleIds = modules.map(m => m.id);

      if (moduleIds.length === 0) {
        setProgressions([]);
        setStats(null);
        setLoading(false);
        return;
      }

      // Récupérer la progression de tous les stagiaires
      const { data: progressionData, error } = await supabase
        .from("progression_stagiaires")
        .select(`
          *,
          modules (id, titre, code, duree_heures, classe_id),
          stagiaires (nom, prenom, email)
        `)
        .in("module_id", moduleIds)
        .order("derniere_activite", { ascending: false });

      if (error) throw error;

      setProgressions(progressionData || []);
      calculateStats(progressionData || []);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ProgressionModule[], absentsCount = 0) => {
    const stats: Stats = {
      total_modules: data.length,
      modules_termines: data.filter((p) => p.statut === "termine").length,
      modules_en_cours: data.filter((p) => p.statut === "en_cours").length,
      modules_absents: absentsCount,
      temps_total_minutes: data.reduce((sum, p) => sum + p.temps_passe_minutes, 0),
      taux_completion_moyen: data.length > 0
        ? Math.round(data.reduce((sum, p) => sum + p.pourcentage_completion, 0) / data.length)
        : 0,
    };
    setStats(stats);
  };

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { variant: any; label: string; icon: any }> = {
      non_commence: { variant: "secondary", label: "Non commencé", icon: AlertCircle },
      en_cours: { variant: "default", label: "En cours", icon: Clock },
      termine: { variant: "default", label: "Terminé", icon: CheckCircle2 },
    };
    const config = configs[statut] || configs.non_commence;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins.toString().padStart(2, "0") : ""}`;
  };

  if (loading && !selectedProgramme) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suivi de Progression</h1>
        <p className="text-muted-foreground mt-1">
          Tableau de bord des apprentissages
          {isConsolidatedView && (
            <Badge variant="outline" className="ml-2">Vue consolidée programme</Badge>
          )}
        </p>
      </div>

      {(role === "administrateur" || role === "gestionnaire_scolarite") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Programme</label>
            <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un programme..." />
              </SelectTrigger>
              <SelectContent>
                {programmes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} - {p.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProgramme && (
            <div>
              <label className="text-sm font-medium mb-2 block">Classe</label>
              <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une classe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-medium">Toutes les classes (vue consolidée)</span>
                  </SelectItem>
                  {filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.sous_code} - {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedClasse && (
            <div>
              <label className="text-sm font-medium mb-2 block">Stagiaire</label>
              <Select value={selectedStagiaire} onValueChange={setSelectedStagiaire}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un stagiaire..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-medium">Tous les stagiaires (vue consolidée)</span>
                  </SelectItem>
                  {stagiaires.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.prenom} {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {stats && (progressions.length > 0 || stats.modules_absents > 0) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modules Suivis</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_modules}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terminés</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.modules_termines}</div>
              <p className="text-xs text-muted-foreground">
                {stats.modules_en_cours} en cours
              </p>
            </CardContent>
          </Card>

          {stats.modules_absents > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absences</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.modules_absents}</div>
                <p className="text-xs text-muted-foreground">modules non comptés</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps Total</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMinutesToHours(stats.temps_total_minutes)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progression Moyenne</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.taux_completion_moyen}%</div>
              <Progress value={stats.taux_completion_moyen} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Chargement de la progression...</p>
            </CardContent>
          </Card>
        ) : progressions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedStagiaire
                  ? "Aucune progression enregistrée pour ce stagiaire"
                  : selectedClasse
                  ? "Sélectionnez un stagiaire pour voir la progression"
                  : selectedProgramme
                  ? "Sélectionnez une classe pour continuer"
                  : "Sélectionnez un programme pour commencer"}
              </p>
            </CardContent>
          </Card>
        ) : (
          progressions.map((progression) => (
            <Card key={progression.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {progression.modules.code} - {progression.modules.titre}
                      {getStatutBadge(progression.statut)}
                    </CardTitle>
                    {progression.stagiaires && (
                      <CardDescription>
                        {progression.stagiaires.prenom} {progression.stagiaires.nom}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{progression.pourcentage_completion}%</div>
                    <p className="text-sm text-muted-foreground">
                      {formatMinutesToHours(progression.temps_passe_minutes)} passées
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progression.pourcentage_completion} className="h-2" />
                {progression.modules.duree_heures && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Durée estimée: {progression.modules.duree_heures}h
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
