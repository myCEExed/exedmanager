import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getSourceLabel } from "./ProspectSourcesSelect";

interface ExportField {
  key: string;
  label: string;
  selected: boolean;
}

const EXPORT_FIELDS: ExportField[] = [
  { key: "nom", label: "Nom", selected: true },
  { key: "prenom", label: "Prénom", selected: true },
  { key: "email", label: "Email", selected: true },
  { key: "telephone", label: "Téléphone", selected: true },
  { key: "entreprise", label: "Entreprise", selected: true },
  { key: "poste", label: "Poste", selected: true },
  { key: "statut", label: "Statut", selected: true },
  { key: "niveau_interet", label: "Niveau d'intérêt", selected: true },
  { key: "is_down", label: "Perdu", selected: true },
  { key: "sources", label: "Sources / Origine", selected: true },
  { key: "source_autre_commentaire", label: "Commentaire source", selected: false },
  { key: "interet_thematiques", label: "Thématiques d'intérêt", selected: true },
  { key: "interet_programmes", label: "Programmes d'intérêt", selected: true },
  { key: "interet_modules", label: "Modules d'intérêt", selected: true },
  { key: "secteur_activite", label: "Secteur d'activité", selected: false },
  { key: "adresse", label: "Adresse", selected: false },
  { key: "ville", label: "Ville", selected: false },
  { key: "code_postal", label: "Code postal", selected: false },
  { key: "pays", label: "Pays", selected: false },
  { key: "notes", label: "Notes", selected: false },
  { key: "created_at", label: "Date de création", selected: false },
];

interface ProspectExportProps {
  prospects: any[];
  programmes: { id: string; titre: string; code: string }[];
  modules: { id: string; titre: string }[];
}

export const ProspectExport = ({ prospects, programmes, modules }: ProspectExportProps) => {
  const [fields, setFields] = useState<ExportField[]>(EXPORT_FIELDS);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleField = (key: string) => {
    setFields(
      fields.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    );
  };

  const selectAll = () => {
    setFields(fields.map((f) => ({ ...f, selected: true })));
  };

  const deselectAll = () => {
    setFields(fields.map((f) => ({ ...f, selected: false })));
  };

  const getFieldValue = (prospect: any, fieldKey: string): string => {
    switch (fieldKey) {
      case "sources":
        return (prospect.sources || []).map((s: string) => getSourceLabel(s)).join(", ");
      case "interet_thematiques":
        return (prospect.interet_thematiques || []).join(", ");
      case "interet_programmes":
        return (prospect.interet_programme_ids || [])
          .map((id: string) => {
            const prog = programmes.find((p) => p.id === id);
            return prog ? `[${prog.code}] ${prog.titre}` : "";
          })
          .filter(Boolean)
          .join(", ");
      case "interet_modules":
        return (prospect.interet_module_ids || [])
          .map((id: string) => {
            const mod = modules.find((m) => m.id === id);
            return mod ? mod.titre : "";
          })
          .filter(Boolean)
          .join(", ");
      case "created_at":
        return prospect.created_at
          ? format(new Date(prospect.created_at), "dd/MM/yyyy", { locale: fr })
          : "";
      case "niveau_interet":
        const niveaux: Record<string, string> = {
          non_defini: "Non défini",
          peu_interesse: "Peu intéressé",
          moyennement_interesse: "Moyennement intéressé",
          tres_interesse: "Très intéressé",
        };
        return niveaux[prospect.niveau_interet] || "Non défini";
      case "is_down":
        return prospect.is_down ? "Oui" : "Non";
      default:
        return prospect[fieldKey] || "";
    }
  };

  const buildExportData = () => {
    const selectedFields = fields.filter((f) => f.selected);
    return prospects.map((prospect) => {
      const row: Record<string, string> = {};
      selectedFields.forEach((field) => {
        row[field.label] = getFieldValue(prospect, field.key);
      });
      return row;
    });
  };

  const exportToExcel = () => {
    try {
      const data = buildExportData();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Prospects");
      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      XLSX.writeFile(wb, `prospects_export_${timestamp}.xlsx`);
      toast.success("Export Excel réussi");
      setDialogOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  const exportToPDF = () => {
    try {
      const selectedFields = fields.filter((f) => f.selected);
      const data = buildExportData();

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Export Prospects", 14, 15);
      doc.setFontSize(10);
      doc.text(`Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`, 14, 22);
      doc.text(`${prospects.length} prospect(s)`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [selectedFields.map((f) => f.label)],
        body: data.map((row) => selectedFields.map((f) => row[f.label])),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      doc.save(`prospects_export_${timestamp}.pdf`);
      toast.success("Export PDF réussi");
      setDialogOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter les prospects ({prospects.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              Sélectionnez les champs à exporter
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Tout
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Aucun
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[300px] border rounded-md p-3">
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={field.selected}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <Label
                    htmlFor={`field-${field.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
