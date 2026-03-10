import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, History, Edit, Send, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DevisForm } from "./DevisForm";

interface DevisDetailSheetProps {
  devis: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  programmes: any[];
  onConvertToBC: (devisId: string) => void; // Opens dialog instead of direct conversion
}

export function DevisDetailSheet({ devis, open, onOpenChange, onUpdate, programmes, onConvertToBC }: DevisDetailSheetProps) {
  const { user } = useAuth();
  const [lignes, setLignes] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (devis && open) {
      loadData();
    }
  }, [devis, open]);

  const loadData = async () => {
    if (!devis) return;

    // Load lignes
    const { data: lignesData } = await supabase
      .from("lignes_devis")
      .select("*")
      .eq("devis_id", devis.id);
    setLignes(lignesData || []);

    // Load historique
    const { data: histData } = await supabase
      .from("devis_historique")
      .select("*, profiles:modified_by(email, first_name, last_name)")
      .eq("devis_id", devis.id)
      .order("created_at", { ascending: false });
    setHistorique(histData || []);
  };

  const updateStatus = async (newStatut: string) => {
    if (!devis || !user) return;

    setLoading(true);
    try {
      await supabase.from("devis").update({
        statut: newStatut,
        updated_at: new Date().toISOString(),
      }).eq("id", devis.id);

      // Log history
      await supabase.from("devis_historique").insert({
        devis_id: devis.id,
        action: newStatut === "envoye" ? "envoi" : newStatut === "accepte" ? "acceptation" : "refus",
        ancien_statut: devis.statut,
        nouveau_statut: newStatut,
        modified_by: user.id,
      });

      toast.success(`Statut mis à jour: ${getStatutLabel(newStatut)}`);
      onUpdate();
      loadData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!devis) return;
    setLoading(true);
    try {
      await onConvertToBC(devis.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      brouillon: "Brouillon",
      envoye: "Envoyé",
      accepte: "Accepté",
      refuse: "Refusé",
    };
    return labels[statut] || statut;
  };

  const getStatutColor = (statut: string) => {
    const colors: Record<string, string> = {
      brouillon: "bg-gray-100 text-gray-800",
      envoye: "bg-blue-100 text-blue-800",
      accepte: "bg-green-100 text-green-800",
      refuse: "bg-red-100 text-red-800",
    };
    return colors[statut] || "bg-gray-100 text-gray-800";
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      creation: "Création",
      modification: "Modification",
      envoi: "Envoi",
      acceptation: "Acceptation",
      refus: "Refus",
    };
    return labels[action] || action;
  };

  if (!devis) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {devis.numero_devis}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-100px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Montant HT</p>
                  <p className="text-xl font-bold">{parseFloat(devis.montant_ht || 0).toFixed(2)} €</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Montant TTC</p>
                  <p className="text-2xl font-bold">{parseFloat(devis.montant_total).toFixed(2)} €</p>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className={getStatutColor(devis.statut)}>
                  {getStatutLabel(devis.statut)}
                </Badge>
                
                <div className="flex gap-2 flex-wrap">
                {(devis.statut === "brouillon" || devis.statut === "envoye" || devis.statut === "refuse") && (
                    <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
                      <Edit className="h-4 w-4 mr-1" /> Modifier
                    </Button>
                  )}
                  {(devis.statut === "brouillon" || devis.statut === "refuse") && (
                    <Button size="sm" onClick={() => updateStatus("envoye")} disabled={loading}>
                      <Send className="h-4 w-4 mr-1" /> {devis.statut === "refuse" ? "Renvoyer" : "Envoyer"}
                    </Button>
                  )}
                  {devis.statut === "envoye" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus("refuse")} disabled={loading}>
                        <XCircle className="h-4 w-4 mr-1" /> Refusé
                      </Button>
                      <Button size="sm" onClick={handleConvert} disabled={loading}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Accepter → BC
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Client/Prospect:</span> {devis.clients?.nom || (devis.prospects ? `${devis.prospects.prenom} ${devis.prospects.nom}` : "-")}</p>
                <p><span className="text-muted-foreground">Date émission:</span> {format(new Date(devis.date_emission), "dd/MM/yyyy", { locale: fr })}</p>
                <p><span className="text-muted-foreground">Valide jusqu'au:</span> {format(new Date(devis.date_validite), "dd/MM/yyyy", { locale: fr })}</p>
                {devis.description && <p><span className="text-muted-foreground">Description:</span> {devis.description}</p>}
              </div>

              <Tabs defaultValue="lignes">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lignes">Lignes</TabsTrigger>
                  <TabsTrigger value="historique">Historique</TabsTrigger>
                </TabsList>

                <TabsContent value="lignes" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>PU (€)</TableHead>
                        <TableHead>Total (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>{ligne.designation}</TableCell>
                          <TableCell>{ligne.quantite}</TableCell>
                          <TableCell>{parseFloat(ligne.prix_unitaire).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">{parseFloat(ligne.montant_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end">
                    <div className="w-48 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total HT:</span>
                        <span>{parseFloat(devis.montant_ht || 0).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA ({devis.tva}%):</span>
                        <span>{(parseFloat(devis.montant_total) - parseFloat(devis.montant_ht || 0)).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>Total TTC:</span>
                        <span>{parseFloat(devis.montant_total).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="historique" className="space-y-4">
                  {historique.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun historique disponible
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {historique.map((h) => (
                        <div key={h.id} className="border rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{getActionLabel(h.action)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {h.ancien_statut && h.nouveau_statut && (
                            <p className="text-sm">
                              Statut: {getStatutLabel(h.ancien_statut)} → {getStatutLabel(h.nouveau_statut)}
                            </p>
                          )}
                          {h.ancien_montant && h.nouveau_montant && (
                            <p className="text-sm">
                              Montant: {parseFloat(h.ancien_montant).toFixed(2)} € → {parseFloat(h.nouveau_montant).toFixed(2)} €
                            </p>
                          )}
                          {h.commentaire && <p className="text-sm text-muted-foreground">{h.commentaire}</p>}
                          <p className="text-xs text-muted-foreground">
                            Par: {h.profiles?.first_name || h.profiles?.email || "Système"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DevisForm
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        existingDevis={devis}
        onSuccess={() => {
          onUpdate();
          loadData();
        }}
        programmes={programmes}
      />
    </>
  );
}
