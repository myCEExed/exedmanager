import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, FileText, ListChecks, Eye } from "lucide-react";
import { toast } from "sonner";
import { QuestionEditor } from "./QuestionEditor";
import { TypeEnquete, TypeQuestion, TYPE_ENQUETE_LABELS, ModeleEnquete, ModeleEnqueteQuestion } from "./types";

interface ModeleEnqueteEditorProps {
  modele?: ModeleEnquete;
  onSave: () => void;
  trigger?: React.ReactNode;
}

interface QuestionData {
  id?: string;
  question: string;
  type_question: TypeQuestion;
  options: any;
  obligatoire: boolean;
  ordre: number;
  condition_question_id: string | null;
  condition_valeur: string[] | null;
}

export function ModeleEnqueteEditor({ modele, onSave, trigger }: ModeleEnqueteEditorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("infos");
  
  const [nom, setNom] = useState(modele?.nom || "");
  const [description, setDescription] = useState(modele?.description || "");
  const [typeEnquete, setTypeEnquete] = useState<TypeEnquete>(modele?.type_enquete || "a_chaud");
  const [estActif, setEstActif] = useState(modele?.est_actif ?? true);
  const [questions, setQuestions] = useState<QuestionData[]>([]);

  useEffect(() => {
    if (modele && open) {
      loadQuestions();
    }
  }, [modele, open]);

  const loadQuestions = async () => {
    if (!modele) return;
    
    const { data, error } = await supabase
      .from("modeles_enquete_questions")
      .select("*")
      .eq("modele_id", modele.id)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Error loading questions:", error);
      return;
    }

    setQuestions(data.map(q => ({
      id: q.id,
      question: q.question,
      type_question: q.type_question as TypeQuestion,
      options: q.options,
      obligatoire: q.obligatoire,
      ordre: q.ordre,
      condition_question_id: q.condition_question_id,
      condition_valeur: q.condition_valeur as string[] | null
    })));
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        type_question: "echelle_5",
        options: null,
        obligatoire: true,
        ordre: questions.length,
        condition_question_id: null,
        condition_valeur: null
      }
    ]);
  };

  const updateQuestion = (index: number, data: QuestionData) => {
    const newQuestions = [...questions];
    newQuestions[index] = data;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    // Update ordre
    newQuestions.forEach((q, i) => q.ordre = i);
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      toast.error("Le nom du modèle est requis");
      return;
    }

    setLoading(true);
    try {
      let modeleId = modele?.id;

      if (modele) {
        // Update existing modele
        const { error } = await supabase
          .from("modeles_enquete")
          .update({
            nom,
            description,
            type_enquete: typeEnquete,
            est_actif: estActif,
            updated_at: new Date().toISOString()
          })
          .eq("id", modele.id);

        if (error) throw error;
      } else {
        // Create new modele
        const { data, error } = await supabase
          .from("modeles_enquete")
          .insert({
            nom,
            description,
            type_enquete: typeEnquete,
            est_actif: estActif,
            created_by: user?.id
          })
          .select()
          .single();

        if (error) throw error;
        modeleId = data.id;
      }

      // Save questions
      if (modeleId) {
        // Delete existing questions if updating
        if (modele) {
          await supabase
            .from("modeles_enquete_questions")
            .delete()
            .eq("modele_id", modeleId);
        }

        // Insert new questions
        if (questions.length > 0) {
          const questionsToInsert = questions.map((q, index) => ({
            modele_id: modeleId,
            question: q.question,
            type_question: q.type_question,
            options: q.options,
            obligatoire: q.obligatoire,
            ordre: index,
            condition_question_id: q.condition_question_id,
            condition_valeur: q.condition_valeur
          }));

          const { error: questionsError } = await supabase
            .from("modeles_enquete_questions")
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }

      toast.success(modele ? "Modèle mis à jour" : "Modèle créé");
      setOpen(false);
      onSave();
    } catch (error: any) {
      console.error("Error saving modele:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!modele) {
      setNom("");
      setDescription("");
      setTypeEnquete("a_chaud");
      setEstActif(true);
      setQuestions([]);
    } else {
      setNom(modele.nom);
      setDescription(modele.description || "");
      setTypeEnquete(modele.type_enquete);
      setEstActif(modele.est_actif);
      loadQuestions();
    }
    setActiveTab("infos");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau modèle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {modele ? "Modifier le modèle" : "Nouveau modèle d'enquête"}
          </DialogTitle>
          <DialogDescription>
            Configurez votre modèle d'enquête avec ses questions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="infos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Questions ({questions.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="infos" className="space-y-4 px-1">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nom du modèle *</Label>
                  <Input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Évaluation satisfaction module"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description du modèle d'enquête..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type d'enquête</Label>
                    <Select value={typeEnquete} onValueChange={(v) => setTypeEnquete(v as TypeEnquete)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_ENQUETE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Modèle actif</Label>
                      <p className="text-sm text-muted-foreground">
                        Peut être utilisé pour créer des enquêtes
                      </p>
                    </div>
                    <Switch checked={estActif} onCheckedChange={setEstActif} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 px-1">
              {questions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Aucune question définie</p>
                    <Button onClick={addQuestion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une question
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id || index}
                      question={question}
                      index={index}
                      allQuestions={questions}
                      onUpdate={(data) => updateQuestion(index, data)}
                      onDelete={() => deleteQuestion(index)}
                      onMoveUp={index > 0 ? () => moveQuestion(index, 'up') : undefined}
                      onMoveDown={index < questions.length - 1 ? () => moveQuestion(index, 'down') : undefined}
                    />
                  ))}
                  <Button variant="outline" onClick={addQuestion} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une question
                  </Button>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
