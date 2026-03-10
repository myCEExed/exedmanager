import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";

interface ProgrammeCoutsManagerProps {
  programmeId: string;
  onCoutsChange?: () => void;
}

export const ProgrammeCoutsManager = ({ programmeId, onCoutsChange }: ProgrammeCoutsManagerProps) => {
  const { user } = useAuth();
  const { currency, convertAmount } = useCurrency();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("programmes");
  const [couts, setCouts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCout, setEditingCout] = useState<any>(null);
  const [formData, setFormData] = useState({
    type_cout: "",
    description: "",
    montant: "",
    devise: currency,
  });

  useEffect(() => {
    loadCouts();
  }, [programmeId]);

  const loadCouts = async () => {
    const { data, error } = await supabase
      .from("programme_couts")
      .select("*")
      .eq("programme_id", programmeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors du chargement des coûts:", error);
      return;
    }

    setCouts(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.type_cout || !formData.montant) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const montantNum = parseFloat(formData.montant);
    if (isNaN(montantNum) || montantNum < 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    // Convertir en EUR pour le stockage
    const montantEUR = formData.devise === "EUR" 
      ? montantNum 
      : await convertAmount(montantNum, formData.devise as "MAD" | "EUR", "EUR");

    const payload = {
      programme_id: programmeId,
      type_cout: formData.type_cout,
      description: formData.description || null,
      montant: montantEUR,
      devise: formData.devise,
      montant_devise_origine: montantNum,
      created_by: user?.id,
    };

    if (editingCout) {
      const { error } = await supabase
        .from("programme_couts")
        .update(payload)
        .eq("id", editingCout.id);

      if (error) {
        toast.error("Erreur lors de la modification du coût");
        console.error(error);
        return;
      }
      toast.success("Coût modifié avec succès");
    } else {
      const { error } = await supabase
        .from("programme_couts")
        .insert(payload);

      if (error) {
        toast.error("Erreur lors de l'ajout du coût");
        console.error(error);
        return;
      }
      toast.success("Coût ajouté avec succès");
    }

    setDialogOpen(false);
    setEditingCout(null);
    setFormData({ type_cout: "", description: "", montant: "", devise: currency });
    loadCouts();
    onCoutsChange?.();
  };

  const handleEdit = (cout: any) => {
    setEditingCout(cout);
    setFormData({
      type_cout: cout.type_cout,
      description: cout.description || "",
      montant: (cout.montant_devise_origine || cout.montant).toString(),
      devise: cout.devise || "EUR",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (coutId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce coût ?")) {
      return;
    }

    const { error } = await supabase
      .from("programme_couts")
      .delete()
      .eq("id", coutId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      return;
    }

    toast.success("Coût supprimé");
    loadCouts();
    onCoutsChange?.();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCout(null);
    setFormData({ type_cout: "", description: "", montant: "", devise: currency });
  };

  const formatCurrency = (amount: number, devise: string = "EUR") => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: devise,
    }).format(amount);
  };

  const totalCouts = couts.reduce((sum, cout) => sum + (cout.montant || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Coûts du programme</CardTitle>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un coût
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCout ? "Modifier le coût" : "Ajouter un coût"}
              </DialogTitle>
              <DialogDescription>
                {editingCout ? "Modifiez les informations du coût" : "Ajoutez un nouveau coût au programme"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type de coût *</Label>
                <Input
                  value={formData.type_cout}
                  onChange={(e) => setFormData({ ...formData, type_cout: e.target.value })}
                  placeholder="Ex: Formation, Location, etc."
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du coût..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Devise *</Label>
                  <Select value={formData.devise} onValueChange={(v: "EUR" | "MAD") => setFormData({ ...formData, devise: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="MAD">MAD (DH)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingCout ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {couts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun coût enregistré. Ajoutez des coûts pour suivre le budget du programme.
          </p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {couts.map((cout) => (
                <div
                  key={cout.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <div className="flex-1">
                    <p className="font-medium">{cout.type_cout}</p>
                    {cout.description && (
                      <p className="text-sm text-muted-foreground">{cout.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-right">
                      {formatCurrency(cout.montant_devise_origine || cout.montant, cout.devise || "EUR")}
                    </p>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cout)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cout.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Total</p>
                <p className="text-xl font-bold">{formatCurrency(totalCouts, "EUR")}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
