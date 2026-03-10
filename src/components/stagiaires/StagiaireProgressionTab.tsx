import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, Calendar, CheckCircle } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

interface InscriptionWithProgress {
  id: string;
  statut: string | null;
  classe: {
    id: string;
    nom: string;
    date_debut: string | null;
    date_fin: string | null;
    programme: {
      titre: string;
    };
  };
  modulesTotal: number;
  modulesDone: number;
  progressPercent: number;
}

export function StagiaireProgressionTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inscriptions, setInscriptions] = useState<InscriptionWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    try {
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      // Get inscriptions
      const { data: inscriptionsData } = await supabase
        .from("inscriptions")
        .select(`
          id,
          statut,
          classes (
            id,
            nom,
            date_debut,
            date_fin,
            programmes (
              titre
            )
          )
        `)
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptionsData || inscriptionsData.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate progress for each inscription
      const inscriptionsWithProgress = await Promise.all(
        inscriptionsData
          .filter(i => i.classes && i.classes.programmes)
          .map(async (inscription) => {
            const classeId = inscription.classes!.id;

            // Get total modules for this class
            const { count: totalModules } = await supabase
              .from("modules")
              .select("*", { count: "exact", head: true })
              .eq("classe_id", classeId);

            // Get completed modules (past end date)
            const now = new Date().toISOString();
            const { count: doneModules } = await supabase
              .from("modules")
              .select("*", { count: "exact", head: true })
              .eq("classe_id", classeId)
              .lt("date_fin", now);

            const total = totalModules || 0;
            const done = doneModules || 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            return {
              id: inscription.id,
              statut: inscription.statut,
              classe: {
                id: inscription.classes!.id,
                nom: inscription.classes!.nom,
                date_debut: inscription.classes!.date_debut,
                date_fin: inscription.classes!.date_fin,
                programme: {
                  titre: inscription.classes!.programmes!.titre
                }
              },
              modulesTotal: total,
              modulesDone: done,
              progressPercent: progress
            };
          })
      );

      setInscriptions(inscriptionsWithProgress);
    } catch (error) {
      console.error("Error loading progress:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (inscription: InscriptionWithProgress) => {
    if (inscription.statut === "termine") {
      return <Badge variant="default" className="bg-green-600">Terminé</Badge>;
    }
    if (inscription.progressPercent === 100) {
      return <Badge variant="default" className="bg-green-600">Terminé</Badge>;
    }
    if (inscription.classe.date_debut && isBefore(new Date(), new Date(inscription.classe.date_debut))) {
      return <Badge variant="outline">À venir</Badge>;
    }
    return <Badge variant="secondary">En cours</Badge>;
  };

  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    if (isAfter(now, end)) return null;
    return differenceInDays(end, now);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (inscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune formation en cours</p>
          <p className="text-sm text-muted-foreground mt-2">
            Votre progression apparaîtra ici une fois inscrit à une formation
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall progress
  const totalModules = inscriptions.reduce((acc, i) => acc + i.modulesTotal, 0);
  const completedModules = inscriptions.reduce((acc, i) => acc + i.modulesDone, 0);
  const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progression globale
          </CardTitle>
          <CardDescription>
            Votre avancement sur l'ensemble de vos formations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{overallProgress}%</span>
              <span className="text-sm text-muted-foreground">
                {completedModules}/{totalModules} modules complétés
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Individual Formation Progress */}
      <div className="grid gap-4">
        {inscriptions.map((inscription) => {
          const remainingDays = getRemainingDays(inscription.classe.date_fin);

          return (
            <Card key={inscription.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{inscription.classe.programme.titre}</CardTitle>
                    <CardDescription>{inscription.classe.nom}</CardDescription>
                  </div>
                  {getStatusBadge(inscription)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progression</span>
                      <span className="font-medium">{inscription.progressPercent}%</span>
                    </div>
                    <Progress value={inscription.progressPercent} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {inscription.modulesDone}/{inscription.modulesTotal} modules complétés
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {inscription.classe.date_debut && inscription.classe.date_fin && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(inscription.classe.date_debut), "d MMM", { locale: fr })}
                          {" - "}
                          {format(new Date(inscription.classe.date_fin), "d MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    )}
                    {remainingDays !== null && remainingDays >= 0 && (
                      <Badge variant="outline">
                        {remainingDays === 0 
                          ? "Se termine aujourd'hui" 
                          : `${remainingDays} jours restants`}
                      </Badge>
                    )}
                    {inscription.progressPercent === 100 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Terminé</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
