import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TYPE_ENQUETE_LABELS, TYPE_QUESTION_LABELS } from "@/components/enquetes/types";
import type { TypeQuestion, TypeEnquete, QuestionOption, MatriceConfig } from "@/components/enquetes/types";

interface EnqueteWithDetails {
  id: string;
  titre: string;
  description: string | null;
  type_enquete: TypeEnquete;
  date_debut: string | null;
  date_fin: string | null;
  est_active: boolean;
  module?: { titre: string } | null;
  classe?: { nom: string } | null;
  programme?: { titre: string } | null;
  completed: boolean;
  questions: EnqueteQuestion[];
}

interface EnqueteQuestion {
  id: string;
  question: string;
  type_question: TypeQuestion;
  options: QuestionOption[] | MatriceConfig | null;
  obligatoire: boolean;
  ordre: number;
}

export function StagiaireEnquetesTab() {
  const { user } = useAuth();
  const [enquetes, setEnquetes] = useState<EnqueteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquete, setSelectedEnquete] = useState<EnqueteWithDetails | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [stagiaireId, setStagiaireId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEnquetes();
    }
  }, [user]);

  const loadEnquetes = async () => {
    try {
      // Récupérer le stagiaire
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      setStagiaireId(stagiaire.id);

      // Récupérer les classes du stagiaire
      const { data: inscriptions } = await supabase
        .from("inscriptions")
        .select("classe_id, classes(programme_id)")
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptions || inscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const classeIds = inscriptions.map(i => i.classe_id);
      const programmeIds = [...new Set(inscriptions.map(i => i.classes?.programme_id).filter(Boolean))];

      // Récupérer les enquêtes actives pour ces classes/programmes
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
          programme_id,
          modules(titre),
          classes(nom),
          programmes(titre),
          enquetes_questions(
            id,
            question,
            type_question,
            options,
            obligatoire,
            ordre
          )
        `)
        .eq("est_active", true)
        .or(`classe_id.in.(${classeIds.join(",")}),programme_id.in.(${programmeIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Récupérer les réponses existantes du stagiaire
      const { data: reponsesExistantes } = await supabase
        .from("enquetes_reponses")
        .select("enquete_id, completed_at")
        .eq("stagiaire_id", stagiaire.id);

      const reponsesMap = new Map(reponsesExistantes?.map(r => [r.enquete_id, r.completed_at]) || []);

      // Formater les données
      const formattedEnquetes: EnqueteWithDetails[] = (enquetesData || []).map(e => ({
        id: e.id,
        titre: e.titre,
        description: e.description,
        type_enquete: e.type_enquete as TypeEnquete,
        date_debut: e.date_debut,
        date_fin: e.date_fin,
        est_active: e.est_active ?? false,
        module: e.modules,
        classe: e.classes,
        programme: e.programmes,
        completed: reponsesMap.has(e.id) && reponsesMap.get(e.id) !== null,
        questions: (e.enquetes_questions || [])
          .sort((a, b) => a.ordre - b.ordre)
          .map(q => ({
            id: q.id,
            question: q.question,
            type_question: q.type_question as TypeQuestion,
            options: q.options as unknown as QuestionOption[] | MatriceConfig | null,
            obligatoire: q.obligatoire ?? false,
            ordre: q.ordre
          }))
      }));

      // Filtrer les enquêtes dont la date n'est pas expirée
      const now = new Date();
      const activeEnquetes = formattedEnquetes.filter(e => {
        if (e.date_fin) {
          return new Date(e.date_fin) >= now;
        }
        return true;
      });

      setEnquetes(activeEnquetes);
    } catch (error) {
      console.error("Error loading enquetes:", error);
      toast.error("Erreur lors du chargement des enquêtes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEnquete = (enquete: EnqueteWithDetails) => {
    if (enquete.completed) {
      toast.info("Vous avez déjà répondu à cette enquête");
      return;
    }
    setSelectedEnquete(enquete);
    setResponses({});
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmitEnquete = async () => {
    if (!selectedEnquete || !stagiaireId) return;

    // Vérifier les questions obligatoires
    const missingRequired = selectedEnquete.questions.filter(
      q => q.obligatoire && !responses[q.id]
    );

    if (missingRequired.length > 0) {
      toast.error(`Veuillez répondre à toutes les questions obligatoires (${missingRequired.length} manquante(s))`);
      return;
    }

    setSubmitting(true);
    try {
      // Créer l'enregistrement de réponse
      const { data: reponse, error: reponseError } = await supabase
        .from("enquetes_reponses")
        .insert({
          enquete_id: selectedEnquete.id,
          stagiaire_id: stagiaireId,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (reponseError) throw reponseError;

      // Enregistrer les détails des réponses
      const detailsToInsert = Object.entries(responses).map(([questionId, value]) => {
        const question = selectedEnquete.questions.find(q => q.id === questionId);
        let valeurTexte = null;
        let valeurNumerique = null;
        let valeurJson = null;

        if (typeof value === "string") {
          if (["echelle_5", "echelle_10", "note_20"].includes(question?.type_question || "")) {
            valeurNumerique = parseFloat(value);
          } else {
            valeurTexte = value;
          }
        } else if (typeof value === "number") {
          valeurNumerique = value;
        } else {
          valeurJson = value;
        }

        return {
          reponse_id: reponse.id,
          question_id: questionId,
          valeur_texte: valeurTexte,
          valeur_numerique: valeurNumerique,
          valeur_json: valeurJson
        };
      });

      const { error: detailsError } = await supabase
        .from("enquetes_reponses_details")
        .insert(detailsToInsert);

      if (detailsError) throw detailsError;

      toast.success("Merci pour votre réponse !");
      setSelectedEnquete(null);
      setResponses({});
      loadEnquetes();
    } catch (error) {
      console.error("Error submitting enquete:", error);
      toast.error("Erreur lors de l'envoi de vos réponses");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: EnqueteQuestion) => {
    const value = responses[question.id];

    switch (question.type_question) {
      case "texte_libre":
        return (
          <Textarea
            placeholder="Votre réponse..."
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            rows={3}
          />
        );

      case "choix_unique":
        const choixUniqueOptions = question.options as QuestionOption[] | null;
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(v) => handleResponseChange(question.id, v)}
          >
            {(choixUniqueOptions || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${question.id}-${i}`} />
                <Label htmlFor={`${question.id}-${i}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "choix_multiple":
        const choixMultipleOptions = question.options as QuestionOption[] | null;
        const selectedValues = (value || []) as string[];
        return (
          <div className="space-y-2">
            {(choixMultipleOptions || []).map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${i}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleResponseChange(question.id, [...selectedValues, option.value]);
                    } else {
                      handleResponseChange(question.id, selectedValues.filter(v => v !== option.value));
                    }
                  }}
                />
                <Label htmlFor={`${question.id}-${i}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case "echelle_5":
        return (
          <RadioGroup
            value={value?.toString() || ""}
            onValueChange={(v) => handleResponseChange(question.id, v)}
            className="flex gap-4"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <RadioGroupItem value={n.toString()} id={`${question.id}-${n}`} />
                <Label htmlFor={`${question.id}-${n}`} className="text-sm">{n}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "echelle_10":
        return (
          <RadioGroup
            value={value?.toString() || ""}
            onValueChange={(v) => handleResponseChange(question.id, v)}
            className="flex flex-wrap gap-3"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <RadioGroupItem value={n.toString()} id={`${question.id}-${n}`} />
                <Label htmlFor={`${question.id}-${n}`} className="text-sm">{n}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "oui_non":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(v) => handleResponseChange(question.id, v)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id={`${question.id}-oui`} />
              <Label htmlFor={`${question.id}-oui`}>Oui</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id={`${question.id}-non`} />
              <Label htmlFor={`${question.id}-non`}>Non</Label>
            </div>
          </RadioGroup>
        );

      case "note_20":
        return (
          <Input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={value || ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className="w-24"
            placeholder="0-20"
          />
        );

      case "matrice":
        const matriceConfig = question.options as MatriceConfig | null;
        if (!matriceConfig) return null;
        const matriceResponses = (value || {}) as Record<string, string>;
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left"></th>
                  {matriceConfig.colonnes.map((col, i) => (
                    <th key={i} className="p-2 text-center text-sm font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriceConfig.lignes.map((ligne, li) => (
                  <tr key={li} className="border-t">
                    <td className="p-2 text-sm">{ligne}</td>
                    {matriceConfig.colonnes.map((col, ci) => (
                      <td key={ci} className="p-2 text-center">
                        <RadioGroupItem
                          value={col}
                          checked={matriceResponses[ligne] === col}
                          onClick={() => {
                            handleResponseChange(question.id, {
                              ...matriceResponses,
                              [ligne]: col
                            });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <Input value={value || ""} onChange={(e) => handleResponseChange(question.id, e.target.value)} />;
    }
  };

  const pendingEnquetes = enquetes.filter(e => !e.completed);
  const completedEnquetes = enquetes.filter(e => e.completed);

  if (loading) {
    return <div className="text-center py-8">Chargement des enquêtes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enquêtes à compléter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Enquêtes en attente ({pendingEnquetes.length})</h3>
        </div>

        {pendingEnquetes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune enquête en attente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingEnquetes.map((enquete) => (
              <Card key={enquete.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{enquete.titre}</CardTitle>
                      <CardDescription>
                        {enquete.module?.titre || enquete.classe?.nom || enquete.programme?.titre}
                      </CardDescription>
                    </div>
                    <Badge variant={enquete.type_enquete === "a_chaud" ? "default" : "secondary"}>
                      {TYPE_ENQUETE_LABELS[enquete.type_enquete]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {enquete.description && (
                    <p className="text-sm text-muted-foreground">{enquete.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {enquete.date_fin ? (
                      <span>À compléter avant le {format(new Date(enquete.date_fin), "d MMMM yyyy", { locale: fr })}</span>
                    ) : (
                      <span>Pas de date limite</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {enquete.questions.length} question(s)
                  </div>
                  <Button onClick={() => handleOpenEnquete(enquete)} className="w-full">
                    Répondre à l'enquête
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Enquêtes complétées */}
      {completedEnquetes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">Enquêtes complétées ({completedEnquetes.length})</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {completedEnquetes.map((enquete) => (
              <Card key={enquete.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{enquete.titre}</CardTitle>
                      <CardDescription>
                        {enquete.module?.titre || enquete.classe?.nom || enquete.programme?.titre}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complétée
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog pour répondre */}
      <Dialog open={!!selectedEnquete} onOpenChange={() => setSelectedEnquete(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedEnquete?.titre}</DialogTitle>
            {selectedEnquete?.description && (
              <p className="text-sm text-muted-foreground">{selectedEnquete.description}</p>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {selectedEnquete?.questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <Label className="text-base">
                        {question.question}
                        {question.obligatoire && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {TYPE_QUESTION_LABELS[question.type_question]}
                      </p>
                    </div>
                  </div>
                  <div className="ml-8">
                    {renderQuestionInput(question)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEnquete(null)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitEnquete} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Envoi..." : "Envoyer mes réponses"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
