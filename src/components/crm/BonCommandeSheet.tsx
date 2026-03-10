import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2, FileText, History, Receipt, Edit, TrendingUp, TrendingDown, Euro, Banknote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LigneBonCommande {
  id?: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

interface BonCommandeSheetProps {
  bonCommande: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function BonCommandeSheet({ bonCommande, open, onOpenChange, onUpdate }: BonCommandeSheetProps) {
  const { user } = useAuth();
  const { exchangeRate, convertAmount } = useCurrency();
  const [lignes, setLignes] = useState<LigneBonCommande[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [modelesFacture, setModelesFacture] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvenantDialog, setShowAvenantDialog] = useState(false);
  const [showFactureDialog, setShowFactureDialog] = useState(false);
  const [avenantType, setAvenantType] = useState<"ajout" | "reduction">("ajout");
  const [avenantForm, setAvenantForm] = useState({
    motif: "",
    commentaire: "",
  });
  const [nouvelleLigne, setNouvelleLigne] = useState<LigneBonCommande>({
    designation: "",
    quantite: 1,
    prix_unitaire: 0,
    montant_total: 0,
  });
  const [lignesAReduire, setLignesAReduire] = useState<{ [key: string]: number }>({});
  const [factureForm, setFactureForm] = useState({
    montant: 0,
    date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    devise: "EUR" as "EUR" | "MAD",
    modele_facture_id: "",
  });

  useEffect(() => {
    if (bonCommande && open) {
      loadData();
    }
  }, [bonCommande, open]);

  const loadData = async () => {
    if (!bonCommande) return;

    // Load lignes
    const { data: lignesData } = await supabase
      .from("lignes_bon_commande")
      .select("*")
      .eq("bon_commande_id", bonCommande.id);
    
    if (lignesData && lignesData.length > 0) {
      setLignes(lignesData);
    } else {
      // If no lignes exist, create from devis lignes
      const { data: devisLignes } = await supabase
        .from("lignes_devis")
        .select("*")
        .eq("devis_id", bonCommande.devis_id);
      
      if (devisLignes) {
        setLignes(devisLignes.map(l => ({
          designation: l.designation,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
          montant_total: l.montant_total,
        })));
      }
    }

    // Load historique
    const { data: histData } = await supabase
      .from("bons_commande_historique")
      .select("*, profiles:modified_by(email, first_name, last_name)")
      .eq("bon_commande_id", bonCommande.id)
      .order("created_at", { ascending: false });
    setHistorique(histData || []);

    // Load factures
    const { data: facturesData } = await supabase
      .from("factures")
      .select("*")
      .eq("bon_commande_id", bonCommande.id)
      .order("created_at", { ascending: false });
    setFactures(facturesData || []);

    // Load modèles de facture
    const { data: modelesData } = await supabase
      .from("modeles_facture")
      .select("*")
      .order("is_default", { ascending: false })
      .order("nom");
    setModelesFacture(modelesData || []);
  };

  const montantRestant = bonCommande ? 
    parseFloat(bonCommande.montant_total) - parseFloat(bonCommande.montant_facture || 0) : 0;

  const handleAvenant = async () => {
    if (!bonCommande || !user) return;

    setLoading(true);
    try {
      let nouveauMontant = parseFloat(bonCommande.montant_total);
      
      if (avenantType === "ajout") {
        const montantAjout = nouvelleLigne.quantite * nouvelleLigne.prix_unitaire;
        nouveauMontant += montantAjout;

        // Add new line
        await supabase.from("lignes_bon_commande").insert({
          bon_commande_id: bonCommande.id,
          designation: nouvelleLigne.designation,
          quantite: nouvelleLigne.quantite,
          prix_unitaire: nouvelleLigne.prix_unitaire,
          montant_total: montantAjout,
        });
      } else {
        // Reduction
        let montantReduction = 0;
        for (const [ligneId, reduction] of Object.entries(lignesAReduire)) {
          if (reduction > 0) {
            const ligne = lignes.find(l => l.id === ligneId);
            if (ligne) {
              const nouveauTotal = ligne.montant_total - reduction;
              montantReduction += reduction;
              
              if (nouveauTotal <= 0) {
                await supabase.from("lignes_bon_commande").delete().eq("id", ligneId);
              } else {
                await supabase.from("lignes_bon_commande")
                  .update({ 
                    montant_total: nouveauTotal,
                    quantite: nouveauTotal / ligne.prix_unitaire,
                  })
                  .eq("id", ligneId);
              }
            }
          }
        }
        nouveauMontant -= montantReduction;
      }

      // Update bon de commande
      await supabase.from("bons_commande").update({
        montant_total: nouveauMontant,
        montant_restant: nouveauMontant - parseFloat(bonCommande.montant_facture || 0),
        updated_at: new Date().toISOString(),
      }).eq("id", bonCommande.id);

      // Log historique
      await supabase.from("bons_commande_historique").insert({
        bon_commande_id: bonCommande.id,
        action: avenantType === "ajout" ? "avenant_ajout" : "avenant_reduction",
        ancien_montant: bonCommande.montant_total,
        nouveau_montant: nouveauMontant,
        motif: avenantForm.motif,
        commentaire: avenantForm.commentaire,
        modified_by: user.id,
      });

      toast.success(`Avenant ${avenantType === "ajout" ? "d'ajout" : "de réduction"} enregistré`);
      setShowAvenantDialog(false);
      setAvenantForm({ motif: "", commentaire: "" });
      setNouvelleLigne({ designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 });
      setLignesAReduire({});
      onUpdate();
      loadData();
    } catch (error: any) {
      console.error("Error creating avenant:", error);
      toast.error("Erreur lors de la création de l'avenant");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacture = async () => {
    if (!bonCommande || !user) return;

    if (factureForm.montant <= 0) {
      toast.error("Le montant doit être supérieur à 0");
      return;
    }

    // Convertir le montant en EUR si nécessaire pour la comparaison
    const montantEnEUR = factureForm.devise === "MAD" 
      ? convertAmount(factureForm.montant, "MAD", "EUR")
      : factureForm.montant;

    if (montantEnEUR > montantRestant) {
      toast.error(`Le montant ne peut pas dépasser ${montantRestant.toFixed(2)} € (montant restant)`);
      return;
    }

    setLoading(true);
    try {
      // Generate invoice number
      const { data: lastFacture } = await supabase
        .from("factures")
        .select("numero_facture")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const nextNum = lastFacture ? 
        parseInt(lastFacture.numero_facture.split("-")[2] || "0") + 1 : 1;
      const numero_facture = `FAC-${year}${month}-${String(nextNum).padStart(4, "0")}`;

      // Create facture
      const { error: factureError } = await supabase.from("factures").insert({
        numero_facture,
        bon_commande_id: bonCommande.id,
        classe_id: null,
        stagiaire_id: null,
        montant_total: montantEnEUR,
        montant_total_devise_origine: factureForm.devise === "MAD" ? factureForm.montant : null,
        devise: factureForm.devise,
        modele_facture_id: factureForm.modele_facture_id || null,
        montant_paye: 0,
        statut: "brouillon",
        date_emission: new Date().toISOString().split("T")[0],
        date_echeance: factureForm.date_echeance,
        notes: factureForm.notes,
        created_by: user.id,
      });

      if (factureError) throw factureError;

      // Update bon de commande (utilise le montant en EUR)
      const nouveauMontantFacture = parseFloat(bonCommande.montant_facture || 0) + montantEnEUR;
      const nouveauMontantRestant = parseFloat(bonCommande.montant_total) - nouveauMontantFacture;
      const estCloture = nouveauMontantRestant <= 0;

      await supabase.from("bons_commande").update({
        montant_facture: nouveauMontantFacture,
        montant_restant: nouveauMontantRestant,
        est_cloture: estCloture,
        statut: estCloture ? "cloture" : bonCommande.statut,
        updated_at: new Date().toISOString(),
      }).eq("id", bonCommande.id);

      // Log historique
      const montantLabel = factureForm.devise === "MAD" 
        ? `${factureForm.montant.toFixed(2)} MAD (≈ ${montantEnEUR.toFixed(2)} €)`
        : `${factureForm.montant.toFixed(2)} €`;
      await supabase.from("bons_commande_historique").insert({
        bon_commande_id: bonCommande.id,
        action: estCloture ? "cloture" : "facturation",
        motif: `Facturation de ${montantLabel}`,
        commentaire: factureForm.notes,
        modified_by: user.id,
      });

      toast.success(`Facture ${numero_facture} créée avec succès`);
      setShowFactureDialog(false);
      setFactureForm({
        montant: 0,
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "",
        devise: "EUR",
        modele_facture_id: "",
      });
      onUpdate();
      loadData();
    } catch (error: any) {
      console.error("Error creating facture:", error);
      toast.error("Erreur lors de la création de la facture");
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      creation: "Création",
      modification: "Modification",
      avenant_ajout: "Avenant (ajout)",
      avenant_reduction: "Avenant (réduction)",
      facturation: "Facturation",
      cloture: "Clôture",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      creation: "bg-blue-100 text-blue-800",
      modification: "bg-amber-100 text-amber-800",
      avenant_ajout: "bg-green-100 text-green-800",
      avenant_reduction: "bg-red-100 text-red-800",
      facturation: "bg-purple-100 text-purple-800",
      cloture: "bg-gray-100 text-gray-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  if (!bonCommande) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {bonCommande.numero_bc}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-100px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Montant Total</p>
                  <p className="text-2xl font-bold">{parseFloat(bonCommande.montant_total).toFixed(2)} €</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Reste à facturer</p>
                  <p className={`text-2xl font-bold ${montantRestant > 0 ? "text-amber-600" : "text-green-600"}`}>
                    {montantRestant.toFixed(2)} €
                  </p>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={bonCommande.est_cloture ? "secondary" : "default"}>
                    {bonCommande.est_cloture ? "Clôturé" : bonCommande.statut}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Client: {bonCommande.clients?.nom || "-"}
                  </span>
                </div>
                {!bonCommande.est_cloture && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setAvenantType("ajout"); setShowAvenantDialog(true); }}>
                      <TrendingUp className="h-4 w-4 mr-1" /> Avenant +
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAvenantType("reduction"); setShowAvenantDialog(true); }}>
                      <TrendingDown className="h-4 w-4 mr-1" /> Avenant -
                    </Button>
                    <Button size="sm" onClick={() => setShowFactureDialog(true)}>
                      <Receipt className="h-4 w-4 mr-1" /> Facturer
                    </Button>
                  </div>
                )}
              </div>

              <Tabs defaultValue="lignes">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="lignes">Lignes</TabsTrigger>
                  <TabsTrigger value="factures">Factures ({factures.length})</TabsTrigger>
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
                      {lignes.map((ligne, index) => (
                        <TableRow key={ligne.id || index}>
                          <TableCell>{ligne.designation}</TableCell>
                          <TableCell>{ligne.quantite}</TableCell>
                          <TableCell>{parseFloat(String(ligne.prix_unitaire)).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            {parseFloat(String(ligne.montant_total)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="factures" className="space-y-4">
                  {factures.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune facture émise pour ce bon de commande
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Facture</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {factures.map((facture) => (
                          <TableRow key={facture.id}>
                            <TableCell className="font-medium">{facture.numero_facture}</TableCell>
                            <TableCell>{parseFloat(facture.montant_total).toFixed(2)} €</TableCell>
                            <TableCell>
                              <Badge>{facture.statut}</Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(facture.date_emission), "dd/MM/yyyy", { locale: fr })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
                            <Badge className={getActionColor(h.action)}>
                              {getActionLabel(h.action)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {h.ancien_montant && h.nouveau_montant && (
                            <p className="text-sm">
                              Montant: {parseFloat(h.ancien_montant).toFixed(2)} € → {parseFloat(h.nouveau_montant).toFixed(2)} €
                            </p>
                          )}
                          {h.motif && <p className="text-sm font-medium">{h.motif}</p>}
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

      {/* Dialog Avenant */}
      <Dialog open={showAvenantDialog} onOpenChange={setShowAvenantDialog}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {avenantType === "ajout" ? "Avenant - Ajout de prestation" : "Avenant - Réduction"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motif de l'avenant *</Label>
              <Input
                value={avenantForm.motif}
                onChange={(e) => setAvenantForm({ ...avenantForm, motif: e.target.value })}
                placeholder="Ex: Demande client, négociation..."
              />
            </div>

            {avenantType === "ajout" ? (
              <div className="space-y-3 border rounded-lg p-4">
                <Label>Nouvelle ligne à ajouter</Label>
                <Input
                  placeholder="Désignation"
                  value={nouvelleLigne.designation}
                  onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, designation: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantité</Label>
                    <Input
                      type="number"
                      min="1"
                      value={nouvelleLigne.quantite}
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 1;
                        setNouvelleLigne({
                          ...nouvelleLigne,
                          quantite: qty,
                          montant_total: qty * nouvelleLigne.prix_unitaire,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Prix unitaire (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={nouvelleLigne.prix_unitaire}
                      onChange={(e) => {
                        const pu = parseFloat(e.target.value) || 0;
                        setNouvelleLigne({
                          ...nouvelleLigne,
                          prix_unitaire: pu,
                          montant_total: nouvelleLigne.quantite * pu,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="text-right font-bold">
                  Total: {(nouvelleLigne.quantite * nouvelleLigne.prix_unitaire).toFixed(2)} €
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Sélectionnez les montants à réduire par ligne</Label>
                {lignes.map((ligne) => (
                  <div key={ligne.id} className="flex items-center gap-2 border rounded p-2">
                    <span className="flex-1 text-sm">{ligne.designation}</span>
                    <span className="text-sm text-muted-foreground">
                      ({parseFloat(String(ligne.montant_total)).toFixed(2)} €)
                    </span>
                    <Input
                      type="number"
                      className="w-24"
                      min="0"
                      max={ligne.montant_total}
                      placeholder="0"
                      value={lignesAReduire[ligne.id!] || ""}
                      onChange={(e) => setLignesAReduire({
                        ...lignesAReduire,
                        [ligne.id!]: parseFloat(e.target.value) || 0,
                      })}
                    />
                    <span className="text-sm">€</span>
                  </div>
                ))}
                <div className="text-right font-bold text-destructive">
                  Réduction totale: {Object.values(lignesAReduire).reduce((a, b) => a + b, 0).toFixed(2)} €
                </div>
              </div>
            )}

            <div>
              <Label>Commentaire</Label>
              <Textarea
                value={avenantForm.commentaire}
                onChange={(e) => setAvenantForm({ ...avenantForm, commentaire: e.target.value })}
                placeholder="Détails supplémentaires..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAvenantDialog(false)}>Annuler</Button>
              <Button onClick={handleAvenant} disabled={loading || !avenantForm.motif}>
                {loading ? "Enregistrement..." : "Valider l'avenant"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Facturation */}
      <Dialog open={showFactureDialog} onOpenChange={setShowFactureDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Créer une facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">Montant restant à facturer: <strong>{montantRestant.toFixed(2)} €</strong></p>
            </div>

            <div>
              <Label>Devise</Label>
              <RadioGroup
                value={factureForm.devise}
                onValueChange={(value: "EUR" | "MAD") => setFactureForm({ ...factureForm, devise: value })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EUR" id="facture-devise-eur" />
                  <Label htmlFor="facture-devise-eur" className="flex items-center gap-1 cursor-pointer">
                    <Euro className="w-4 h-4" /> EUR
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MAD" id="facture-devise-mad" />
                  <Label htmlFor="facture-devise-mad" className="flex items-center gap-1 cursor-pointer">
                    <Banknote className="w-4 h-4" /> MAD
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Montant à facturer ({factureForm.devise === "EUR" ? "€" : "MAD"}) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={factureForm.montant || ""}
                onChange={(e) => setFactureForm({ ...factureForm, montant: parseFloat(e.target.value) || 0 })}
              />
              {factureForm.devise === "MAD" && factureForm.montant > 0 && exchangeRate && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {convertAmount(factureForm.montant, "MAD", "EUR").toFixed(2)} € (taux: {exchangeRate})
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const montant = factureForm.devise === "MAD" 
                      ? convertAmount(montantRestant, "EUR", "MAD")
                      : montantRestant;
                    setFactureForm({ ...factureForm, montant });
                  }}
                >
                  Facturer tout
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const montant = factureForm.devise === "MAD" 
                      ? convertAmount(montantRestant / 2, "EUR", "MAD")
                      : montantRestant / 2;
                    setFactureForm({ ...factureForm, montant });
                  }}
                >
                  50%
                </Button>
              </div>
            </div>

            <div>
              <Label>Modèle de facture</Label>
              <Select 
                value={factureForm.modele_facture_id} 
                onValueChange={(value) => setFactureForm({ ...factureForm, modele_facture_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Modèle par défaut" />
                </SelectTrigger>
                <SelectContent>
                  {modelesFacture.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nom} {m.is_default && "(par défaut)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date d'échéance *</Label>
              <Input
                type="date"
                value={factureForm.date_echeance}
                onChange={(e) => setFactureForm({ ...factureForm, date_echeance: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={factureForm.notes}
                onChange={(e) => setFactureForm({ ...factureForm, notes: e.target.value })}
                placeholder="Notes pour cette facture..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFactureDialog(false)}>Annuler</Button>
              <Button onClick={handleCreateFacture} disabled={loading || factureForm.montant <= 0}>
                {loading ? "Création..." : "Créer la facture"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
