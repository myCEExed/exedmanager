import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Euro,
  Calendar,
  User,
  Building,
  Download,
  Eye
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Facture {
  id: string;
  numero_facture: string;
  stagiaire_id: string | null;
  classe_id: string | null;
  bon_commande_id: string | null;
  montant_total: number;
  montant_paye: number;
  statut: string;
  date_emission: string;
  date_echeance: string;
  notes: string | null;
  stagiaires?: {
    nom: string;
    prenom: string;
    email: string;
  } | null;
  classes?: {
    nom: string;
    sous_code: string;
  } | null;
  bons_commande?: {
    numero_bc: string;
  } | null;
}

interface FactureDetailSheetProps {
  facture: Facture | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

// Définition des transitions de statut valides
const statusTransitions: Record<string, string[]> = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["partielle", "payee", "annulee"],
  partielle: ["payee", "annulee"],
  payee: [], // Statut final
  annulee: [], // Statut final
};

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  partielle: "Partiellement payée",
  payee: "Payée",
  annulee: "Annulée",
};

const statusColors: Record<string, string> = {
  brouillon: "bg-gray-500",
  envoyee: "bg-blue-500",
  partielle: "bg-orange-500",
  payee: "bg-green-500",
  annulee: "bg-red-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  brouillon: <FileText className="w-4 h-4" />,
  envoyee: <Send className="w-4 h-4" />,
  partielle: <Clock className="w-4 h-4" />,
  payee: <CheckCircle className="w-4 h-4" />,
  annulee: <XCircle className="w-4 h-4" />,
};

export function FactureDetailSheet({ 
  facture, 
  open, 
  onOpenChange, 
  onUpdate 
}: FactureDetailSheetProps) {
  const { toast } = useToast();
  const { formatAmount, currency } = useCurrency();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    newStatus: string;
  }>({ open: false, newStatus: "" });
  const [loading, setLoading] = useState(false);

  if (!facture) return null;

  const availableTransitions = statusTransitions[facture.statut] || [];
  const resteDu = facture.montant_total - (facture.montant_paye || 0);
  const isOverdue = new Date(facture.date_echeance) < new Date() && 
    !["payee", "annulee"].includes(facture.statut);

  const handleStatusChange = async (newStatus: string) => {
    // Vérification spéciale pour le statut "payee"
    if (newStatus === "payee" && resteDu > 0) {
      toast({
        title: "Action impossible",
        description: "Le montant total n'a pas encore été payé. Utilisez le statut 'Partiellement payée'.",
        variant: "destructive",
      });
      return;
    }
    
    setConfirmDialog({ open: true, newStatus });
  };

  const confirmStatusChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("factures")
        .update({ 
          statut: confirmDialog.newStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq("id", facture.id);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `La facture est maintenant "${statusLabels[confirmDialog.newStatus]}"`,
      });

      onUpdate();
      setConfirmDialog({ open: false, newStatus: "" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(facture.numero_facture, 105, 28, { align: "center" });
    
    // Status badge
    doc.setFontSize(10);
    doc.text(`Statut: ${statusLabels[facture.statut]}`, 15, 45);
    
    // Dates
    doc.text(`Date d'émission: ${new Date(facture.date_emission).toLocaleDateString("fr-FR")}`, 15, 55);
    doc.text(`Date d'échéance: ${new Date(facture.date_echeance).toLocaleDateString("fr-FR")}`, 15, 62);
    
    // Client info
    if (facture.stagiaires) {
      doc.setFont("helvetica", "bold");
      doc.text("Client:", 15, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`${facture.stagiaires.prenom} ${facture.stagiaires.nom}`, 15, 87);
      doc.text(facture.stagiaires.email, 15, 94);
    }
    
    if (facture.classes) {
      doc.text(`Classe: ${facture.classes.nom} (${facture.classes.sous_code})`, 15, 104);
    }
    
    // Financial details
    const startY = 120;
    doc.setFont("helvetica", "bold");
    doc.text("Détails financiers", 15, startY);
    
    doc.setFont("helvetica", "normal");
    const symbol = currency === "EUR" ? "€" : "MAD";
    
    // Table
    (doc as any).autoTable({
      startY: startY + 5,
      head: [["Description", "Montant"]],
      body: [
        ["Montant total", `${facture.montant_total.toFixed(2)} ${symbol}`],
        ["Montant payé", `${(facture.montant_paye || 0).toFixed(2)} ${symbol}`],
        ["Reste dû", `${resteDu.toFixed(2)} ${symbol}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    // BC reference
    if (facture.bons_commande) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Référence BC: ${facture.bons_commande.numero_bc}`, 15, finalY);
    }
    
    // Notes
    if (facture.notes) {
      const notesY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 15, notesY);
      doc.setFont("helvetica", "normal");
      doc.text(facture.notes, 15, notesY + 7, { maxWidth: 180 });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Document généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 285, { align: "center" });
    
    doc.save(`facture_${facture.numero_facture}.pdf`);
    
    toast({
      title: "PDF exporté",
      description: `La facture ${facture.numero_facture} a été téléchargée`,
    });
  };

  // Composant de prévisualisation
  const InvoicePreview = () => (
    <div className="bg-white border rounded-lg shadow-sm p-6 text-black min-h-[600px]">
      {/* En-tête de facture */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">FACTURE</h1>
        <p className="text-gray-600 mt-1">{facture.numero_facture}</p>
      </div>

      {/* Statut */}
      <div className="flex justify-center mb-6">
        <span className={`px-3 py-1 rounded-full text-white text-sm ${statusColors[facture.statut]}`}>
          {statusLabels[facture.statut]}
        </span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <span className="text-gray-500">Date d'émission:</span>
          <p className="font-medium">{new Date(facture.date_emission).toLocaleDateString("fr-FR")}</p>
        </div>
        <div>
          <span className="text-gray-500">Date d'échéance:</span>
          <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <hr className="my-4" />

      {/* Informations client */}
      {(facture.stagiaires || facture.classes) && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-2">Client</h3>
          {facture.stagiaires && (
            <div className="text-sm">
              <p className="font-medium">{facture.stagiaires.prenom} {facture.stagiaires.nom}</p>
              <p className="text-gray-500">{facture.stagiaires.email}</p>
            </div>
          )}
          {facture.classes && (
            <p className="text-sm mt-1">
              Classe: {facture.classes.nom} ({facture.classes.sous_code})
            </p>
          )}
        </div>
      )}

      {/* Référence BC */}
      {facture.bons_commande && (
        <div className="mb-6 text-sm">
          <span className="text-gray-500">Référence BC:</span>
          <span className="ml-2 font-medium">{facture.bons_commande.numero_bc}</span>
        </div>
      )}

      <hr className="my-4" />

      {/* Tableau des montants */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-3">Détails financiers</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="text-left py-2 px-3 rounded-tl-lg">Description</th>
              <th className="text-right py-2 px-3 rounded-tr-lg">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-3">Montant total</td>
              <td className="py-2 px-3 text-right font-medium">
                {formatAmount(facture.montant_total)}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-3">Montant payé</td>
              <td className="py-2 px-3 text-right font-medium text-green-600">
                {formatAmount(facture.montant_paye || 0)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-2 px-3 font-bold">Reste dû</td>
              <td className={`py-2 px-3 text-right font-bold ${resteDu > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatAmount(resteDu)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Barre de progression */}
      {facture.montant_total > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progression du paiement</span>
            <span>{Math.round(((facture.montant_paye || 0) / facture.montant_total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ 
                width: `${Math.min(100, ((facture.montant_paye || 0) / facture.montant_total) * 100)}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      {facture.notes && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{facture.notes}</p>
        </div>
      )}

      {/* Pied de page */}
      <div className="mt-auto pt-6 border-t text-center text-xs text-gray-400">
        Document généré le {new Date().toLocaleDateString("fr-FR")}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0">
          <div className="p-6 pb-0">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Facture {facture.numero_facture}
              </SheetTitle>
            </SheetHeader>
          </div>

          <Tabs defaultValue="details" className="mt-4">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Prévisualisation
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-0">
              <ScrollArea className="h-[calc(100vh-140px)] px-6 pb-6">
                <div className="space-y-6 pt-4">
                  {/* Export button */}
                  <div className="flex gap-2">
                    <Button onClick={exportToPDF} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter PDF
                    </Button>
                  </div>

                  {/* Statut actuel */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut actuel</span>
                    <Badge className={`${statusColors[facture.statut]} text-white flex items-center gap-1`}>
                      {statusIcons[facture.statut]}
                      {statusLabels[facture.statut]}
                    </Badge>
                  </div>

                  {isOverdue && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Cette facture est en retard de paiement
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Actions de changement de statut */}
                  {availableTransitions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Changer le statut</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTransitions.map((status) => (
                          <Button
                            key={status}
                            variant={status === "annulee" ? "destructive" : "outline"}
                            className="justify-start"
                            onClick={() => handleStatusChange(status)}
                          >
                            {statusIcons[status]}
                            <span className="ml-2">{statusLabels[status]}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTransitions.length === 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Cette facture est dans un statut final et ne peut plus être modifiée.
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Détails financiers */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Détails financiers</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Montant total</p>
                        <p className="text-lg font-bold">{formatAmount(facture.montant_total)}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Montant payé</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatAmount(facture.montant_paye || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Reste dû</span>
                        <span className={`text-lg font-bold ${resteDu > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatAmount(resteDu)}
                        </span>
                      </div>
                      {facture.montant_total > 0 && (
                        <div className="mt-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ 
                                width: `${Math.min(100, ((facture.montant_paye || 0) / facture.montant_total) * 100)}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {Math.round(((facture.montant_paye || 0) / facture.montant_total) * 100)}% payé
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Informations */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Informations</h3>
                    
                    <div className="space-y-3">
                      {facture.stagiaires && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {facture.stagiaires.prenom} {facture.stagiaires.nom}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {facture.stagiaires.email}
                            </p>
                          </div>
                        </div>
                      )}

                      {facture.classes && (
                        <div className="flex items-center gap-3">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{facture.classes.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              {facture.classes.sous_code}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">
                            Émise le {new Date(facture.date_emission).toLocaleDateString("fr-FR")}
                          </p>
                          <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Échéance: {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>

                      {facture.bons_commande && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm">
                            BC: {facture.bons_commande.numero_bc}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {facture.notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="font-medium">Notes</h3>
                        <p className="text-sm text-muted-foreground">{facture.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Workflow visuel */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-medium">Cycle de vie</h3>
                    <div className="flex items-center justify-between">
                      {["brouillon", "envoyee", "partielle", "payee"].map((status, index, arr) => (
                        <div key={status} className="flex items-center">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-white text-xs
                            ${facture.statut === status ? statusColors[status] : 
                              arr.indexOf(facture.statut) > index ? 'bg-green-500' : 'bg-muted text-muted-foreground'}
                          `}>
                            {index + 1}
                          </div>
                          {index < arr.length - 1 && (
                            <div className={`w-8 h-0.5 ${
                              arr.indexOf(facture.statut) > index ? 'bg-green-500' : 'bg-muted'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Brouillon</span>
                      <span>Envoyée</span>
                      <span>Partielle</span>
                      <span>Payée</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <ScrollArea className="h-[calc(100vh-140px)] px-6 pb-6">
                <div className="pt-4">
                  <div className="flex justify-end mb-4">
                    <Button onClick={exportToPDF} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger PDF
                    </Button>
                  </div>
                  <InvoicePreview />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dialog de confirmation */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment passer cette facture au statut "{statusLabels[confirmDialog.newStatus]}" ?
              {confirmDialog.newStatus === "annulee" && (
                <span className="block mt-2 text-destructive font-medium">
                  Cette action est irréversible.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={loading}
              className={confirmDialog.newStatus === "annulee" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {loading ? "..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
