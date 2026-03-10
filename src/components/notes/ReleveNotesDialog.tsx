import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDown, FileText } from "lucide-react";
import { useExcelExport } from "@/hooks/useExcelExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReleveNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagiaireId: string;
  stagiaireNom: string;
  programmeId?: string;
  classeId?: string;
}

interface NoteDetail {
  module_code: string;
  module_titre: string;
  evaluation_titre: string;
  type_evaluation: string;
  note: number | null;
  note_max: number;
  coefficient: number;
  date_evaluation: string | null;
}

interface NoteConsolidee {
  module_code: string;
  module_titre: string;
  moyenne: number | null;
  total_coefficient: number;
  nb_evaluations: number;
}

export function ReleveNotesDialog({
  open,
  onOpenChange,
  stagiaireId,
  stagiaireNom,
  programmeId,
  classeId,
}: ReleveNotesDialogProps) {
  const [typeReleve, setTypeReleve] = useState<"consolide" | "detaille">("consolide");
  const [loading, setLoading] = useState(false);
  const { exportToExcel } = useExcelExport();
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all notes for this stagiaire
      let query = supabase
        .from("notes_stagiaires")
        .select(`
          note,
          commentaire,
          evaluations!inner (
            titre,
            type_evaluation,
            coefficient,
            note_max,
            date_evaluation,
            classe_id,
            modules!inner (
              code,
              titre,
              classes!inner (
                id,
                programme_id
              )
            )
          )
        `)
        .eq("stagiaire_id", stagiaireId);

      const { data: notesData, error } = await query;

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }

      if (!notesData || notesData.length === 0) {
        toast({ title: "Info", description: "Aucune note trouvée pour ce stagiaire" });
        return;
      }

      // Filter by programme and/or classe if specified
      let filteredNotes = notesData.filter((n: any) => {
        const noteClasseId = n.evaluations?.classe_id;
        const noteProgrammeId = n.evaluations?.modules?.classes?.programme_id;
        
        if (classeId && classeId !== "all" && noteClasseId !== classeId) return false;
        if (programmeId && programmeId !== "all" && noteProgrammeId !== programmeId) return false;
        return true;
      });

      if (filteredNotes.length === 0) {
        toast({ title: "Info", description: "Aucune note correspondant aux filtres" });
        return;
      }

      if (typeReleve === "detaille") {
        // Export détaillé
        const exportData = filteredNotes.map((n: any) => ({
          "Module (Code)": n.evaluations?.modules?.code || "",
          "Module (Titre)": n.evaluations?.modules?.titre || "",
          "Évaluation": n.evaluations?.titre || "",
          "Type": n.evaluations?.type_evaluation === "finale" ? "Finale" : "Intermédiaire",
          "Date": n.evaluations?.date_evaluation 
            ? new Date(n.evaluations.date_evaluation).toLocaleDateString("fr-FR") 
            : "-",
          "Note": n.note !== null ? n.note : "Non saisie",
          "Note Max": n.evaluations?.note_max || 20,
          "Coefficient": n.evaluations?.coefficient || 1,
          "Commentaire": n.commentaire || "",
        }));

        exportToExcel(exportData, `releve_detaille_${stagiaireNom.replace(/\s/g, "_")}`, "Relevé Détaillé");
      } else {
        // Export consolidé par module
        const moduleMap = new Map<string, { 
          code: string; 
          titre: string; 
          totalPondere: number; 
          totalCoeff: number;
          nbEvaluations: number;
        }>();

        filteredNotes.forEach((n: any) => {
          const moduleCode = n.evaluations?.modules?.code || "N/A";
          const moduleTitre = n.evaluations?.modules?.titre || "";
          const note = n.note;
          const noteMax = n.evaluations?.note_max || 20;
          const coeff = n.evaluations?.coefficient || 1;

          if (!moduleMap.has(moduleCode)) {
            moduleMap.set(moduleCode, {
              code: moduleCode,
              titre: moduleTitre,
              totalPondere: 0,
              totalCoeff: 0,
              nbEvaluations: 0,
            });
          }

          const moduleData = moduleMap.get(moduleCode)!;
          moduleData.nbEvaluations++;
          
          if (note !== null) {
            // Normaliser sur 20 puis pondérer
            const noteNormalisee = (note / noteMax) * 20;
            moduleData.totalPondere += noteNormalisee * coeff;
            moduleData.totalCoeff += coeff;
          }
        });

        const exportData = Array.from(moduleMap.values()).map((m) => ({
          "Module (Code)": m.code,
          "Module (Titre)": m.titre,
          "Moyenne (/20)": m.totalCoeff > 0 
            ? (m.totalPondere / m.totalCoeff).toFixed(2) 
            : "Non calculable",
          "Nb Évaluations": m.nbEvaluations,
          "Total Coefficients": m.totalCoeff.toFixed(1),
        }));

        // Calculer moyenne générale
        const totalPondereGlobal = Array.from(moduleMap.values()).reduce((acc, m) => acc + m.totalPondere, 0);
        const totalCoeffGlobal = Array.from(moduleMap.values()).reduce((acc, m) => acc + m.totalCoeff, 0);
        
        exportData.push({
          "Module (Code)": "",
          "Module (Titre)": "MOYENNE GÉNÉRALE",
          "Moyenne (/20)": totalCoeffGlobal > 0 
            ? (totalPondereGlobal / totalCoeffGlobal).toFixed(2) 
            : "Non calculable",
          "Nb Évaluations": filteredNotes.length,
          "Total Coefficients": totalCoeffGlobal.toFixed(1),
        });

        exportToExcel(exportData, `releve_consolide_${stagiaireNom.replace(/\s/g, "_")}`, "Relevé Consolidé");
      }

      toast({ title: "Succès", description: "Relevé exporté avec succès" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relevé de notes
          </DialogTitle>
          <DialogDescription>
            Générer un relevé de notes pour {stagiaireNom}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type de relevé</Label>
            <RadioGroup 
              value={typeReleve} 
              onValueChange={(v) => setTypeReleve(v as "consolide" | "detaille")}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="consolide" id="consolide" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="consolide" className="font-medium cursor-pointer">
                    Relevé consolidé par module
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Affiche la moyenne pondérée de chaque module
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="detaille" id="detaille" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="detaille" className="font-medium cursor-pointer">
                    Relevé détaillé
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Liste toutes les évaluations avec leurs notes individuelles
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              <FileDown className="mr-2 h-4 w-4" />
              {loading ? "Export en cours..." : "Exporter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
