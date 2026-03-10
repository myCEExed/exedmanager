import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Note {
  id: string;
  note: number | null;
  commentaire: string | null;
  created_at: string;
  evaluation: {
    titre: string;
    type_evaluation: string;
    note_max: number | null;
    coefficient: number | null;
    module: {
      titre: string;
    } | null;
    classe: {
      nom: string;
      programme: {
        titre: string;
      };
    };
  } | null;
  devoir: {
    titre: string;
    type_devoir: string;
    points_max: number | null;
    coefficient: number;
  } | null;
}

export function StagiaireNotesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
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

      const { data, error } = await supabase
        .from("notes_stagiaires")
        .select(`
          id,
          note,
          commentaire,
          created_at,
          evaluations (
            titre,
            type_evaluation,
            note_max,
            coefficient,
            modules (
              titre
            ),
            classes (
              nom,
              programmes (
                titre
              )
            )
          ),
          devoirs (
            titre,
            type_devoir,
            points_max,
            coefficient
          )
        `)
        .eq("stagiaire_id", stagiaire.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const validNotes = data.map(n => ({
          id: n.id,
          note: n.note,
          commentaire: n.commentaire,
          created_at: n.created_at,
          evaluation: n.evaluations ? {
            titre: n.evaluations.titre,
            type_evaluation: n.evaluations.type_evaluation,
            note_max: n.evaluations.note_max,
            coefficient: n.evaluations.coefficient,
            module: n.evaluations.modules ? { titre: n.evaluations.modules.titre } : null,
            classe: {
              nom: n.evaluations.classes?.nom || "",
              programme: {
                titre: n.evaluations.classes?.programmes?.titre || ""
              }
            }
          } : null,
          devoir: n.devoirs ? {
            titre: n.devoirs.titre,
            type_devoir: n.devoirs.type_devoir,
            points_max: n.devoirs.points_max,
            coefficient: n.devoirs.coefficient
          } : null
        }));
        setNotes(validNotes);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotePercentage = (note: number, max: number) => {
    return ((note / max) * 100).toFixed(0);
  };

  const getNoteColor = (note: number, max: number) => {
    const percentage = (note / max) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune note disponible</p>
          <p className="text-sm text-muted-foreground mt-2">
            Vos notes apparaîtront ici après les évaluations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const source = note.evaluation || note.devoir;
        const max = note.evaluation?.note_max || note.devoir?.points_max || 20;
        const titre = note.evaluation?.titre || note.devoir?.titre || "Évaluation";
        const type = note.evaluation?.type_evaluation || note.devoir?.type_devoir || "Devoir";

        return (
          <Card key={note.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {titre}
                    <Badge variant="outline">{type}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {note.evaluation?.classe && (
                      <span>
                        {note.evaluation.classe.programme.titre} - {note.evaluation.classe.nom}
                      </span>
                    )}
                    {note.evaluation?.module && <span> • {note.evaluation.module.titre}</span>}
                  </CardDescription>
                </div>
                {note.note !== null && (
                  <div className={`text-2xl font-bold ${getNoteColor(note.note, max)}`}>
                    {note.note}/{max}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                {note.note !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Pourcentage:</span>
                    <span className={getNoteColor(note.note, max)}>
                      {getNotePercentage(note.note, max)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(note.created_at), "d MMMM yyyy", { locale: fr })}</span>
                </div>
              </div>
              {note.commentaire && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">{note.commentaire}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
