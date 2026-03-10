import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Plus, Trash2, Building2, User } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Devise = "EUR" | "MAD";

interface LigneBC {
  designation: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

interface Client {
  id: string;
  nom: string;
  code: string;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
}

interface BonCommandeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clients: Client[];
  programmes: { id: string; titre: string; code: string }[];
}

export function BonCommandeForm({ open, onOpenChange, onSuccess, clients, programmes }: BonCommandeFormProps) {
  const { user } = useAuth();
  const { exchangeRate, convertAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loadingStagiaires, setLoadingStagiaires] = useState(false);
  const [devise, setDevise] = useState<Devise>("EUR");

  const [typePayeur, setTypePayeur] = useState<"client" | "stagiaire">("client");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedStagiaire, setSelectedStagiaire] = useState<string>("");
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("");
  const [lignes, setLignes] = useState<LigneBC[]>([
    { designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }
  ]);

  useEffect(() => {
    if (open) {
      loadStagiaires();
    }
  }, [open]);

  const loadStagiaires = async () => {
    setLoadingStagiaires(true);
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("id, nom, prenom")
        .order("nom");
      
      if (error) throw error;
      setStagiaires(data || []);
    } catch (error) {
      console.error("Error loading stagiaires:", error);
    } finally {
      setLoadingStagiaires(false);
    }
  };

  const montantTotal = lignes.reduce((acc, l) => acc + l.montant_total, 0);

  const updateLigne = (index: number, field: keyof LigneBC, value: string | number) => {
    const newLignes = [...lignes];
    const ligne = { ...newLignes[index] };

    if (field === "designation") {
      ligne.designation = value as string;
    } else if (field === "quantite") {
      ligne.quantite = Number(value) || 0;
      ligne.montant_total = ligne.quantite * ligne.prix_unitaire;
    } else if (field === "prix_unitaire") {
      ligne.prix_unitaire = Number(value) || 0;
      ligne.montant_total = ligne.quantite * ligne.prix_unitaire;
    }

    newLignes[index] = ligne;
    setLignes(newLignes);
  };

  const addLigne = () => {
    setLignes([...lignes, { designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setTypePayeur("client");
    setSelectedClient("");
    setSelectedStagiaire("");
    setSelectedProgramme("");
    setNotes("");
    setConditions("");
    setDevise("EUR");
    setLignes([{ designation: "", quantite: 1, prix_unitaire: 0, montant_total: 0 }]);
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (typePayeur === "client" && !selectedClient) {
      toast.error("Veuillez sélectionner un client");
      return;
    }
    if (typePayeur === "stagiaire" && !selectedStagiaire) {
      toast.error("Veuillez sélectionner un stagiaire");
      return;
    }
    if (lignes.some(l => !l.designation.trim() || l.montant_total <= 0)) {
      toast.error("Veuillez remplir toutes les lignes avec des montants valides");
      return;
    }
    if (montantTotal <= 0) {
      toast.error("Le montant total doit être supérieur à 0");
      return;
    }

    setLoading(true);
    try {
      // Generate BC number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      const { data: lastBC } = await supabase
        .from("bons_commande")
        .select("numero_bc")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (lastBC?.numero_bc) {
        const match = lastBC.numero_bc.match(/BC-\d{6}-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      const numero_bc = `BC-${year}${month}-${String(nextNum).padStart(4, "0")}`;
      
      // Convert to EUR for storage
      const montantTotalEur = devise === "MAD" ? convertAmount(montantTotal, "MAD", "EUR") : montantTotal;

      // Create bon de commande
      const { data: newBC, error: bcError } = await supabase
        .from("bons_commande")
        .insert({
          numero_bc,
          client_id: typePayeur === "client" ? selectedClient : null,
          stagiaire_id: typePayeur === "stagiaire" ? selectedStagiaire : null,
          type_payeur: typePayeur,
          mode_repartition: "total",
          programme_id: selectedProgramme || null,
          date_emission: date.toISOString().split("T")[0],
          montant_total: montantTotalEur,
          montant_total_devise_origine: montantTotal,
          montant_restant: montantTotalEur,
          montant_facture: 0,
          devise,
          statut: "actif",
          notes,
          conditions,
          created_by: user.id,
        })
        .select()
        .single();

      if (bcError) throw bcError;

      // Create lignes
      const lignesData = lignes.map(l => ({
        bon_commande_id: newBC.id,
        designation: l.designation,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
        montant_total: l.montant_total,
      }));

      const { error: lignesError } = await supabase
        .from("lignes_bon_commande")
        .insert(lignesData);

      if (lignesError) throw lignesError;

      // Log creation in history
      await supabase.from("bons_commande_historique").insert({
        bon_commande_id: newBC.id,
        action: "creation",
        nouveau_montant: montantTotal,
        commentaire: "Création directe (sans devis)",
        modified_by: user.id,
      });

      toast.success(`Bon de commande ${numero_bc} créé avec succès`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating BC:", error);
      toast.error("Erreur lors de la création du bon de commande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nouveau Bon de Commande</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Type de payeur */}
            <div className="space-y-3">
              <Label>Type de payeur</Label>
              <RadioGroup
                value={typePayeur}
                onValueChange={(v) => setTypePayeur(v as "client" | "stagiaire")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" /> Client / Entreprise
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stagiaire" id="stagiaire" />
                  <Label htmlFor="stagiaire" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Stagiaire (individuel)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Client ou Stagiaire selection */}
            {typePayeur === "client" ? (
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom} ({client.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Stagiaire *</Label>
                <Select value={selectedStagiaire} onValueChange={setSelectedStagiaire} disabled={loadingStagiaires}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingStagiaires ? "Chargement..." : "Sélectionner un stagiaire"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stagiaires.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom} {s.prenom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Programme (optional) */}
            <div className="space-y-2">
              <Label>Programme (optionnel)</Label>
              <Select value={selectedProgramme || "none"} onValueChange={(v) => setSelectedProgramme(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Associer à un programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun programme</SelectItem>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <RadioGroupItem value="EUR" id="bc-eur" />
                  <Label htmlFor="bc-eur" className="cursor-pointer">€ Euro (EUR)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MAD" id="bc-mad" />
                  <Label htmlFor="bc-mad" className="cursor-pointer">MAD (Dirham)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Lignes du BC */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Lignes du bon de commande</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLigne}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Désignation</TableHead>
                    <TableHead className="w-[15%]">Qté</TableHead>
                    <TableHead className="w-[20%]">PU ({devise === "EUR" ? "€" : "MAD"})</TableHead>
                    <TableHead className="w-[20%]">Total ({devise === "EUR" ? "€" : "MAD"})</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((ligne, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={ligne.designation}
                          onChange={(e) => updateLigne(index, "designation", e.target.value)}
                          placeholder="Description"
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
                      <TableCell>
                        <span className="font-medium">{ligne.montant_total.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
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

              <div className="text-right space-y-1">
                <span className="text-lg font-bold">Total: {montantTotal.toFixed(2)} {devise === "EUR" ? "€" : "MAD"}</span>
                {devise === "MAD" && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {(montantTotal / exchangeRate).toFixed(2)} € (taux: {exchangeRate})
                  </p>
                )}
              </div>
            </div>

            {/* Notes et conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes internes..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Conditions</Label>
                <Textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="Conditions de paiement..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le bon de commande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
