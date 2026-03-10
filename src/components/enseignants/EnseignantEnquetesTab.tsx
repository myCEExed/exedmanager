import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, ClipboardList, Users, TrendingUp, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TYPE_ENQUETE_LABELS, TYPE_QUESTION_LABELS } from "@/components/enquetes/types";
import type { TypeQuestion, TypeEnquete, QuestionOption } from "@/components/enquetes/types";

interface EnqueteWithStats {
  id: string;
  titre: string;
  description: string | null;
  type_enquete: TypeEnquete;
  date_debut: string | null;
  date_fin: string | null;
  est_active: boolean;
  module?: { id: string; titre: string } | null;
  classe?: { nom: string } | null;
  programme?: { titre: string } | null;
  totalRepondants: number;
  totalInscrits: number;
  tauxParticipation: number;
  questions: QuestionWithStats[];
}

interface QuestionWithStats {
  id: string;
  question: string;
  type_question: TypeQuestion;
  options: QuestionOption[] | null;
  totalReponses: number;
  moyenneNumerique?: number;
  distribution?: Record<string, number>;
  reponsesTexte?: string[];
}

export function EnseignantEnquetesTab() {
  const { user } = useAuth();
  const [enquetes, setEnquetes] = useState<EnqueteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquete, setSelectedEnquete] = useState<EnqueteWithStats | null>(null);

  useEffect(() => {
    if (user) {
      loadEnquetes();
    }
  }, [user]);

  const loadEnquetes = async () => {
    try {
      // Récupérer l'enseignant
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) {
        setLoading(false);
        return;
      }

      // Récupérer les modules de l'enseignant
      const { data: affectations } = await supabase
        .from("affectations")
        .select("module_id")
        .eq("enseignant_id", enseignant.id)
        .eq("confirmee", true);

      if (!affectations || affectations.length === 0) {
        setLoading(false);
        return;
      }

      const moduleIds = affectations.map(a => a.module_id);

      // Récupérer les enquêtes liées à ces modules
      const { data: enquetesData, error } = await supabase
        .from("enquetes")
        .select(`
          id,
          titre,
          description,
          type_enquete,
          date_debut,
          date_fin,
          est_active,
          module_id,
          classe_id,
          modules(id, titre, classe_id),
          classes(nom, id),
          programmes(titre)
        `)
        .in("module_id", moduleIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Pour chaque enquête, récupérer les statistiques
      const enquetesWithStats: EnqueteWithStats[] = [];

      for (const enquete of enquetesData || []) {
        // Récupérer les questions avec leurs réponses
        const { data: questions } = await supabase
          .from("enquetes_questions")
          .select(`
            id,
            question,
            type_question,
            options,
            ordre
          `)
          .eq("enquete_id", enquete.id)
          .order("ordre");

        // Récupérer toutes les réponses
        const { data: reponses } = await supabase
          .from("enquetes_reponses")
          .select(`
            id,
            stagiaire_id,
            completed_at,
            enquetes_reponses_details(
              question_id,
              valeur_texte,
              valeur_numerique,
              valeur_json
            )
          `)
          .eq("enquete_id", enquete.id)
          .not("completed_at", "is", null);

        // Compter les inscrits dans la classe
        const classeId = enquete.classe_id || enquete.modules?.classe_id;
        let totalInscrits = 0;
        if (classeId) {
          const { count } = await supabase
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("classe_id", classeId);
          totalInscrits = count || 0;
        }

        const totalRepondants = reponses?.length || 0;
        const tauxParticipation = totalInscrits > 0 ? (totalRepondants / totalInscrits) * 100 : 0;

        // Calculer les stats par question
        const questionsWithStats: QuestionWithStats[] = (questions || []).map(q => {
          const questionReponses = reponses?.flatMap(r => 
            r.enquetes_reponses_details?.filter(d => d.question_id === q.id) || []
          ) || [];

          const stats: QuestionWithStats = {
            id: q.id,
            question: q.question,
            type_question: q.type_question as TypeQuestion,
            options: q.options as unknown as QuestionOption[] | null,
            totalReponses: questionReponses.length
          };

          // Calculer la moyenne pour les questions numériques
          if (["echelle_5", "echelle_10", "note_20"].includes(q.type_question)) {
            const numericValues = questionReponses
              .map(r => r.valeur_numerique)
              .filter((v): v is number => v !== null);
            if (numericValues.length > 0) {
              stats.moyenneNumerique = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            }
          }

          // Calculer la distribution pour les questions à choix
          if (["choix_unique", "choix_multiple", "oui_non", "echelle_5", "echelle_10"].includes(q.type_question)) {
            stats.distribution = {};
            questionReponses.forEach(r => {
              let value: string;
              if (r.valeur_texte) {
                value = r.valeur_texte;
              } else if (r.valeur_numerique !== null) {
                value = r.valeur_numerique.toString();
              } else if (r.valeur_json) {
                // Pour choix_multiple
                const values = r.valeur_json as string[];
                values.forEach(v => {
                  stats.distribution![v] = (stats.distribution![v] || 0) + 1;
                });
                return;
              } else {
                return;
              }
              stats.distribution![value] = (stats.distribution![value] || 0) + 1;
            });
          }

          // Collecter les réponses texte
          if (q.type_question === "texte_libre") {
            stats.reponsesTexte = questionReponses
              .map(r => r.valeur_texte)
              .filter((v): v is string => v !== null && v.trim() !== "");
          }

          return stats;
        });

        enquetesWithStats.push({
          id: enquete.id,
          titre: enquete.titre,
          description: enquete.description,
          type_enquete: enquete.type_enquete as TypeEnquete,
          date_debut: enquete.date_debut,
          date_fin: enquete.date_fin,
          est_active: enquete.est_active ?? false,
          module: enquete.modules,
          classe: enquete.classes,
          programme: enquete.programmes,
          totalRepondants,
          totalInscrits,
          tauxParticipation,
          questions: questionsWithStats
        });
      }

      setEnquetes(enquetesWithStats);
    } catch (error) {
      console.error("Error loading enquetes:", error);
      toast.error("Erreur lors du chargement des enquêtes");
    } finally {
      setLoading(false);
    }
  };

  const renderDistributionChart = (distribution: Record<string, number>, options?: QuestionOption[] | null) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return <p className="text-sm text-muted-foreground">Aucune réponse</p>;

    const sortedEntries = Object.entries(distribution).sort((a, b) => {
      // Try to sort numerically first
      const numA = parseFloat(a[0]);
      const numB = parseFloat(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a[0].localeCompare(b[0]);
    });

    return (
      <div className="space-y-2">
        {sortedEntries.map(([value, count]) => {
          const percentage = (count / total) * 100;
          const label = options?.find(o => o.value === value)?.label || value;
          return (
            <div key={value} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des résultats...</div>;
  }

  if (enquetes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Aucune enquête disponible pour vos modules</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Liste des enquêtes */}
      <div className="grid gap-4 md:grid-cols-2">
        {enquetes.map((enquete) => (
          <Card 
            key={enquete.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedEnquete(enquete)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{enquete.titre}</CardTitle>
                  <CardDescription>
                    {enquete.module?.titre}
                    {enquete.classe && ` - ${enquete.classe.nom}`}
                  </CardDescription>
                </div>
                <Badge variant={enquete.type_enquete === "a_chaud" ? "default" : "secondary"}>
                  {TYPE_ENQUETE_LABELS[enquete.type_enquete]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{enquete.totalRepondants}/{enquete.totalInscrits} réponses</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>{enquete.tauxParticipation.toFixed(0)}% participation</span>
                </div>
              </div>
              <Progress value={enquete.tauxParticipation} />
              
              {/* Aperçu de la note moyenne si disponible */}
              {enquete.questions.some(q => q.moyenneNumerique !== undefined) && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>
                    Note moyenne : {
                      (enquete.questions
                        .filter(q => q.moyenneNumerique !== undefined)
                        .reduce((sum, q) => sum + (q.moyenneNumerique || 0), 0) /
                      enquete.questions.filter(q => q.moyenneNumerique !== undefined).length
                      ).toFixed(1)
                    }
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog des résultats détaillés */}
      <Dialog open={!!selectedEnquete} onOpenChange={() => setSelectedEnquete(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedEnquete?.titre}
            </DialogTitle>
            {selectedEnquete?.module && (
              <p className="text-sm text-muted-foreground">
                {selectedEnquete.module.titre}
                {selectedEnquete.classe && ` - ${selectedEnquete.classe.nom}`}
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Résumé */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{selectedEnquete?.totalRepondants}</div>
                      <div className="text-sm text-muted-foreground">Répondants</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{selectedEnquete?.totalInscrits}</div>
                      <div className="text-sm text-muted-foreground">Inscrits</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{selectedEnquete?.tauxParticipation.toFixed(0)}%</div>
                      <div className="text-sm text-muted-foreground">Participation</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions et réponses */}
              <div className="space-y-4">
                {selectedEnquete?.questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <CardTitle className="text-sm font-medium">{question.question}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {TYPE_QUESTION_LABELS[question.type_question]} · {question.totalReponses} réponse(s)
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {question.moyenneNumerique !== undefined && (
                        <div className="mb-3 flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">
                            Moyenne : {question.moyenneNumerique.toFixed(2)}
                            {question.type_question === "echelle_5" && " / 5"}
                            {question.type_question === "echelle_10" && " / 10"}
                            {question.type_question === "note_20" && " / 20"}
                          </span>
                        </div>
                      )}

                      {question.distribution && Object.keys(question.distribution).length > 0 && (
                        renderDistributionChart(question.distribution, question.options)
                      )}

                      {question.reponsesTexte && question.reponsesTexte.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MessageSquare className="h-4 w-4" />
                            Réponses libres
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {question.reponsesTexte.map((texte, i) => (
                              <div key={i} className="p-2 bg-muted rounded text-sm">
                                "{texte}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.totalReponses === 0 && (
                        <p className="text-sm text-muted-foreground italic">Aucune réponse</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
