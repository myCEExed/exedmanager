import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface TarifTransfert {
  id: string;
  nom: string;
  description: string | null;
  type_transport: string;
  trajet: string | null;
  prix: number;
  devise: string;
  actif: boolean;
}

const TYPES_TRANSPORT = [
  { value: "avion", label: "Avion" },
  { value: "train", label: "Train" },
  { value: "voiture", label: "Voiture" },
  { value: "taxi", label: "Taxi" },
  { value: "navette", label: "Navette" },
  { value: "bus", label: "Bus" },
];

const DEVISES = [
  { value: "MAD" as const, label: "MAD (Dirham)" },
  { value: "EUR" as const, label: "EUR (Euro)" },
];

export const TarifsTransfertTab = () => {
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const { canEditSection } = useUserRole();
  const canEditTransferts = canEditSection("transferts");

  const [tarifs, setTarifs] = useState<TarifTransfert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    type_transport: "voiture",
    trajet: "",
    prix: "",
    devise: "MAD" as "MAD" | "EUR",
    actif: true,
  });

  useEffect(() => {
    loadTarifs();
  }, []);

  const loadTarifs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tarifs_transfert")
        .select("*")
        .order("nom");

      if (error) throw error;
      setTarifs(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les tarifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        nom: formData.nom,
        description: formData.description || null,
        type_transport: formData.type_transport,
        trajet: formData.trajet || null,
        prix: parseFloat(formData.prix),
        devise: formData.devise,
        actif: formData.actif,
      };

      if (editingId) {
        const { error } = await supabase
          .from("tarifs_transfert")
          .update(data as any)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Tarif modifié avec succès" });
      } else {
        const { error } = await supabase.from("tarifs_transfert").insert([data] as any);
        if (error) throw error;
        toast({ title: "Tarif créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadTarifs();
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

  const handleEdit = (tarif: TarifTransfert) => {
    setEditingId(tarif.id);
    setFormData({
      nom: tarif.nom,
      description: tarif.description || "",
      type_transport: tarif.type_transport,
      trajet: tarif.trajet || "",
      prix: tarif.prix.toString(),
      devise: (tarif.devise === "EUR" || tarif.devise === "MAD") ? tarif.devise : "MAD",
      actif: tarif.actif,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce tarif ?")) return;

    try {
      const { error } = await supabase.from("tarifs_transfert").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Tarif supprimé avec succès" });
      loadTarifs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActif = async (id: string, actif: boolean) => {
    try {
      const { error } = await supabase
        .from("tarifs_transfert")
        .update({ actif: !actif })
        .eq("id", id);
      if (error) throw error;
      loadTarifs();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nom: "",
      description: "",
      type_transport: "voiture",
      trajet: "",
      prix: "",
      devise: "MAD",
      actif: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tarifs de Transfert</h2>
          <p className="text-muted-foreground">Configurez les prix des différents types de transfert</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau tarif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouveau"} tarif</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du tarif *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Navette aéroport standard"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de transport *</Label>
                  <Select
                    value={formData.type_transport}
                    onValueChange={(value) => setFormData({ ...formData, type_transport: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_TRANSPORT.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trajet</Label>
                  <Input
                    value={formData.trajet}
                    onChange={(e) => setFormData({ ...formData, trajet: e.target.value })}
                    placeholder="Ex: Aéroport - Hôtel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.prix}
                    onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Devise *</Label>
                  <Select
                    value={formData.devise}
                    onValueChange={(value: "EUR" | "MAD") => setFormData({ ...formData, devise: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVISES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.actif}
                  onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
                />
                <Label>Tarif actif</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Trajet</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tarifs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Tag className="h-8 w-8 text-muted-foreground/50" />
                    <span>Aucun tarif configuré</span>
                    <span className="text-sm">Créez des tarifs pour les utiliser lors de la création de transferts</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tarifs.map((tarif) => (
                <TableRow key={tarif.id} className={!tarif.actif ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{tarif.nom}</TableCell>
                  <TableCell className="capitalize">{tarif.type_transport}</TableCell>
                  <TableCell>{tarif.trajet || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {tarif.prix.toLocaleString()} {tarif.devise}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={tarif.actif}
                      onCheckedChange={() => toggleActif(tarif.id, tarif.actif)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tarif)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tarif.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
