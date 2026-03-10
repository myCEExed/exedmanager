import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BarChart3, MessageSquare, TrendingUp } from "lucide-react";
import { Enquete, EnqueteQuestion, TYPE_QUESTION_LABELS } from "./types";

interface EnqueteResultatsDialogProps {
  enquete: Enquete & { totalInscrits: number; totalRepondants: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuestionStats {
  question: EnqueteQuestion;
  reponses: any[];
  moyenne?: number;
  distribution?: Record<string, number>;
}

export function EnqueteResultatsDialog({ enquete, open, onOpenChange }: EnqueteResultatsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [questionsStats, setQuestionsStats] = useState<QuestionStats[]>([]);

  useEffect(() => {
    if (open) {
      loadResultats();
    }
  }, [open, enquete.id]);

  const loadResultats = async () => {
    setLoading(true);
    try {
      // Load questions
      const { data: questions } = await supabase
        .from("enquetes_questions")
        .select("*")
        .eq("enquete_id", enquete.id)
        .order("ordre");

      if (!questions) return;

      // Load all response details
      const { data: reponses } = await supabase
        .from("enquetes_reponses")
        .select(`
          id,
          stagiaire_id,
          completed_at,
          enquetes_reponses_details(*)
        `)
        .eq("enquete_id", enquete.id)
        .not("completed_at", "is", null);

      // Calculate stats for each question
      const stats: QuestionStats[] = questions.map((q) => {
        const questionReponses = reponses?.flatMap(r => 
          r.enquetes_reponses_details?.filter((d: any) => d.question_id === q.id) || []
        ) || [];

        const stat: QuestionStats = {
          question: {
            ...q,
            options: q.options as any
          } as EnqueteQuestion,
          reponses: questionReponses
        };

        // Calculate moyenne for numeric questions
        if (['echelle_5', 'echelle_10', 'note_20'].includes(q.type_question)) {
          const numericValues = questionReponses
            .map((r: any) => r.valeur_numerique)
            .filter((v: any) => v !== null);
          
          if (numericValues.length > 0) {
            stat.moyenne = numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length;
          }
        }

        // Calculate distribution for choice questions
        if (['choix_unique', 'oui_non'].includes(q.type_question)) {
          stat.distribution = {};
          questionReponses.forEach((r: any) => {
            const value = r.valeur_texte || 'Non répondu';
            stat.distribution![value] = (stat.distribution![value] || 0) + 1;
          });
        }

        return stat;
      });

      setQuestionsStats(stats);
    } catch (error) {
      console.error("Error loading resultats:", error);
    } finally {
      setLoading(false);
    }
  };

  const tauxParticipation = enquete.totalInscrits > 0
    ? Math.round((enquete.totalRepondants / enquete.totalInscrits) * 100)
    : 0;

  const getScaleMax = (type: string) => {
    if (type === 'echelle_5') return 5;
    if (type === 'echelle_10') return 10;
    if (type === 'note_20') return 20;
    return 5;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Résultats: {enquete.titre}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tauxParticipation}%</div>
              <p className="text-sm text-muted-foreground">
                {enquete.totalRepondants} / {enquete.totalInscrits} stagiaires
              </p>
              <Progress value={tauxParticipation} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{questionsStats.length}</div>
              <p className="text-sm text-muted-foreground">questions dans l'enquête</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Moyenne générale
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const moyennes = questionsStats
                  .filter(s => s.moyenne !== undefined)
                  .map(s => s.moyenne!);
                const moyenneGenerale = moyennes.length > 0
                  ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length
                  : null;
                return moyenneGenerale !== null ? (
                  <>
                    <div className="text-2xl font-bold">{moyenneGenerale.toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground">sur les échelles numériques</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">N/A</p>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <ScrollArea className="h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questionsStats.map((stat, idx) => (
                <Card key={stat.question.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">Q{idx + 1}</Badge>
                        <CardTitle className="text-base">{stat.question.question}</CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {TYPE_QUESTION_LABELS[stat.question.type_question]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {stat.reponses.length} réponse(s)
                    </p>

                    {/* Affichage selon le type */}
                    {stat.moyenne !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold">{stat.moyenne.toFixed(1)}</span>
                          <span className="text-muted-foreground">
                            / {getScaleMax(stat.question.type_question)}
                          </span>
                        </div>
                        <Progress 
                          value={(stat.moyenne / getScaleMax(stat.question.type_question)) * 100} 
                        />
                      </div>
                    )}

                    {stat.distribution && (
                      <div className="space-y-2">
                        {Object.entries(stat.distribution).map(([value, count]) => (
                          <div key={value} className="flex items-center gap-2">
                            <span className="w-24 text-sm truncate">{value}</span>
                            <Progress 
                              value={(count / stat.reponses.length) * 100} 
                              className="flex-1"
                            />
                            <span className="w-12 text-sm text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {stat.question.type_question === 'texte_libre' && stat.reponses.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stat.reponses.slice(0, 5).map((r: any, i) => (
                          <div key={i} className="p-2 bg-muted rounded text-sm">
                            <MessageSquare className="h-3 w-3 inline mr-2" />
                            {r.valeur_texte || "—"}
                          </div>
                        ))}
                        {stat.reponses.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            Et {stat.reponses.length - 5} autres réponses...
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
