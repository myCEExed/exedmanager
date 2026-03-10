import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Devise = "EUR" | "MAD";

interface LigneDevis {
  id?: string;
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

interface DevisFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: any;
  client?: any;
  existingDevis?: any;
  onSuccess: () => void;
  programmes: any[];
}

export function DevisForm({ open, onOpenChange, prospect, client, existingDevis, onSuccess, programmes }: DevisFormProps) {
  const { user } = useAuth();
  const { exchangeRate, convertAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [devise, setDevise] = useState<Devise>("EUR");
  
  const [formData, setFormData] = useState({
    programme_id: "",
    description: "",
    conditions: "",
    notes: "",
    tva: 20,
    date_validite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const [lignes, setLignes] = useState<LigneDevis[]>([
    { designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }
  ]);

  useEffect(() => {
    if (existingDevis) {
      setFormData({
        programme_id: existingDevis.programme_id || "",
        description: existingDevis.description || "",
        conditions: existingDevis.conditions || "",
        notes: existingDevis.notes || "",
        tva: existingDevis.tva || 20,
        date_validite: existingDevis.date_validite || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setDevise((existingDevis.devise as Devise) || "EUR");
      // Load existing lines
      loadLignes(existingDevis.id);
    } else {
      resetForm();
    }
  }, [existingDevis, open]);

  const loadLignes = async (devisId: string) => {
    const { data } = await supabase
      .from("lignes_devis")
      .select("*")
      .eq("devis_id", devisId);
    if (data && data.length > 0) {
      setLignes(data);
    }
  };

  const resetForm = () => {
    setFormData({
      programme_id: "",
      description: "",
      conditions: "",
      notes: "",
      tva: 20,
      date_validite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setDevise("EUR");
    setLignes([{ designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }]);
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneDevis, value: string | number) => {
    const updated = [...lignes];
    if (field === "designation") {
      updated[index].designation = value as string;
    } else {
      const numValue = parseFloat(value as string) || 0;
      if (field === "quantite") updated[index].quantite = numValue;
      if (field === "prix_unitaire") updated[index].prix_unitaire = numValue;
    }
    updated[index].montant_total = updated[index].quantite * updated[index].prix_unitaire;
    setLignes(updated);
  };

  const calculateTotals = () => {
    const montantHT = lignes.reduce((acc, l) => acc + l.montant_total, 0);
    const montantTVA = montantHT * (formData.tva / 100);
    const montantTTC = montantHT + montantTVA;
    return { montantHT, montantTVA, montantTTC };
  };

  const generateNumeroDevis = async () => {
    const { data: lastDevis } = await supabase
      .from("devis")
      .select("numero_devis")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastDevis ? parseInt(lastDevis.numero_devis.split("-")[1]) + 1 : 1;
    return `DEV-${String(nextNumber).padStart(4, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lignes.every(l => !l.designation.trim())) {
      toast.error("Veuillez ajouter au moins une ligne au devis");
      return;
    }

    setLoading(true);
    try {
      const { montantHT, montantTTC } = calculateTotals();
      
      // Convert to EUR for storage
      const montantHTEur = devise === "MAD" ? convertAmount(montantHT, "MAD", "EUR") : montantHT;
      const montantTTCEur = devise === "MAD" ? convertAmount(montantTTC, "MAD", "EUR") : montantTTC;

      if (existingDevis) {
        // Update existing devis
        const { error: updateError } = await supabase
          .from("devis")
          .update({
            programme_id: formData.programme_id || null,
            description: formData.description,
            conditions: formData.conditions,
            notes: formData.notes,
            tva: formData.tva,
            date_validite: formData.date_validite,
            montant_ht: montantHTEur,
            montant_total: montantTTCEur,
            montant_ht_devise_origine: montantHT,
            montant_total_devise_origine: montantTTC,
            devise,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDevis.id);

        if (updateError) throw updateError;

        // Log history
        await supabase.from("devis_historique").insert({
          devis_id: existingDevis.id,
          action: "modification",
          ancien_montant: existingDevis.montant_total,
          nouveau_montant: montantTTC,
          ancien_statut: existingDevis.statut,
          nouveau_statut: existingDevis.statut,
          commentaire: "Modification du devis",
          modified_by: user?.id,
        });

        // Delete old lines and insert new ones
        await supabase.from("lignes_devis").delete().eq("devis_id", existingDevis.id);
        
        const validLignes = lignes.filter(l => l.designation.trim());
        if (validLignes.length > 0) {
          await supabase.from("lignes_devis").insert(
            validLignes.map(l => ({
              devis_id: existingDevis.id,
              designation: l.designation,
              quantite: l.quantite,
              prix_unitaire: l.prix_unitaire,
              montant_total: l.montant_total,
            }))
          );
        }

        toast.success("Devis mis à jour avec succès");
      } else {
        // Create new devis
        const numero_devis = await generateNumeroDevis();

        const { data: newDevis, error: devisError } = await supabase
          .from("devis")
          .insert({
            numero_devis,
            prospect_id: prospect?.id || null,
            client_id: client?.id || null,
            programme_id: formData.programme_id || null,
            description: formData.description,
            conditions: formData.conditions,
            notes: formData.notes,
            tva: formData.tva,
            date_emission: new Date().toISOString().split("T")[0],
            date_validite: formData.date_validite,
            montant_ht: montantHTEur,
            montant_total: montantTTCEur,
            montant_ht_devise_origine: montantHT,
            montant_total_devise_origine: montantTTC,
            devise,
            statut: "brouillon",
            created_by: user?.id,
          })
          .select()
          .single();

        if (devisError) throw devisError;

        // Insert lines
        const validLignes = lignes.filter(l => l.designation.trim());
        if (validLignes.length > 0) {
          await supabase.from("lignes_devis").insert(
            validLignes.map(l => ({
              devis_id: newDevis.id,
              designation: l.designation,
              quantite: l.quantite,
              prix_unitaire: l.prix_unitaire,
              montant_total: l.montant_total,
            }))
          );
        }

        // Log creation
        await supabase.from("devis_historique").insert({
          devis_id: newDevis.id,
          action: "creation",
          nouveau_montant: montantTTC,
          nouveau_statut: "brouillon",
          commentaire: "Création du devis",
          modified_by: user?.id,
        });

        toast.success("Devis créé avec succès");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving devis:", error);
      toast.error("Erreur lors de l'enregistrement du devis");
    } finally {
      setLoading(false);
    }
  };

  const { montantHT, montantTVA, montantTTC } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {existingDevis ? "Modifier le devis" : `Nouveau devis pour ${prospect?.prenom || client?.nom || ""} ${prospect?.nom || ""}`}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Programme (optionnel)</Label>
                <Select 
                  value={formData.programme_id} 
                  onValueChange={(value) => setFormData({ ...formData, programme_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {p.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de validité *</Label>
                <Input
                  type="date"
                  value={formData.date_validite}
                  onChange={(e) => setFormData({ ...formData, date_validite: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Devise selector */}
            <div className="space-y-2">
              <Label>Devise</Label>
              <RadioGroup
                value={devise}
                onValueChange={(v) => setDevise(v as Devise)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EUR" id="eur" />
                  <Label htmlFor="eur" className="cursor-pointer">€ Euro (EUR)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MAD" id="mad" />
                  <Label htmlFor="mad" className="cursor-pointer">MAD (Dirham)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Description du devis..."
              />
            </div>

            {/* Lignes du devis */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Lignes du devis</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Désignation</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix unitaire ({devise === "EUR" ? "€" : "MAD"})</TableHead>
                    <TableHead>Total ({devise === "EUR" ? "€" : "MAD"})</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((ligne, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={ligne.designation}
                          onChange={(e) => updateLigne(index, "designation", e.target.value)}
                          placeholder="Désignation..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={ligne.quantite}
                          onChange={(e) => updateLigne(index, "quantite", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ligne.prix_unitaire}
                          onChange={(e) => updateLigne(index, "prix_unitaire", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {ligne.montant_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLigne(index)}
                          disabled={lignes.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totaux */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 border rounded-lg p-4">
                <div className="flex justify-between">
                  <span>Total HT:</span>
                  <span className="font-medium">{montantHT.toFixed(2)} {devise === "EUR" ? "€" : "MAD"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TVA:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-16 h-8"
                      value={formData.tva}
                      onChange={(e) => setFormData({ ...formData, tva: parseFloat(e.target.value) || 0 })}
                    />
                    <span>%</span>
                    <span className="font-medium">({montantTVA.toFixed(2)} {devise === "EUR" ? "€" : "MAD"})</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total TTC:</span>
                  <span>{montantTTC.toFixed(2)} {devise === "EUR" ? "€" : "MAD"}</span>
                </div>
                {devise === "MAD" && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    ≈ {(montantTTC / exchangeRate).toFixed(2)} € (taux: {exchangeRate})
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Conditions</Label>
              <Textarea
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                rows={2}
                placeholder="Conditions de paiement, délais..."
              />
            </div>

            <div>
              <Label>Notes internes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Notes internes (non visibles par le client)..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : existingDevis ? "Mettre à jour" : "Créer le devis"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
