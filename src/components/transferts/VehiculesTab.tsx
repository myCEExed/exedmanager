import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Pencil, Trash2, Car } from "lucide-react";

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  type: string;
  capacite: number;
  statut: string;
  notes?: string;
}

export const VehiculesTab = () => {
  const { toast } = useToast();
  const { canEditSection } = useUserRole();
  const canEditTransferts = canEditSection("transferts");

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    immatriculation: "",
    type: "voiture",
    capacite: "4",
    statut: "disponible",
    notes: "",
  });

  useEffect(() => {
    loadVehicules();
  }, []);

  const loadVehicules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicules")
        .select("*")
        .order("marque");

      if (error) throw error;
      setVehicules(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les véhicules",
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
        ...formData,
        capacite: parseInt(formData.capacite),
      };

      if (editingId) {
        const { error } = await supabase
          .from("vehicules")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Véhicule modifié avec succès" });
      } else {
        const { error } = await supabase.from("vehicules").insert(data);
        if (error) throw error;
        toast({ title: "Véhicule créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadVehicules();
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

  const handleEdit = (vehicule: Vehicule) => {
    setEditingId(vehicule.id);
    setFormData({
      marque: vehicule.marque,
      modele: vehicule.modele,
      immatriculation: vehicule.immatriculation,
      type: vehicule.type,
      capacite: vehicule.capacite.toString(),
      statut: vehicule.statut,
      notes: vehicule.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) return;

    try {
      const { error } = await supabase.from("vehicules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Véhicule supprimé avec succès" });
      loadVehicules();
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
      marque: "",
      modele: "",
      immatriculation: "",
      type: "voiture",
      capacite: "4",
      statut: "disponible",
      notes: "",
    });
  };

  const getStatutBadge = (statut: string) => {
    const colors = {
      disponible: "bg-green-100 text-green-800",
      en_maintenance: "bg-yellow-100 text-yellow-800",
      en_mission: "bg-blue-100 text-blue-800",
    };
    return colors[statut as keyof typeof colors] || colors.disponible;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des véhicules</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau véhicule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouveau"} véhicule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marque *</Label>
                  <Input value={formData.marque} onChange={(e) => setFormData({ ...formData, marque: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Modèle *</Label>
                  <Input value={formData.modele} onChange={(e) => setFormData({ ...formData, modele: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Immatriculation *</Label>
                  <Input value={formData.immatriculation} onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voiture">Voiture</SelectItem>
                      <SelectItem value="minibus">Minibus</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Capacité *</Label>
                  <Input type="number" value={formData.capacite} onChange={(e) => setFormData({ ...formData, capacite: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Statut *</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="en_maintenance">En maintenance</SelectItem>
                      <SelectItem value="en_mission">En mission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
              <TableHead>Véhicule</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun véhicule enregistré
                </TableCell>
              </TableRow>
            ) : (
              vehicules.map((vehicule) => (
                <TableRow key={vehicule.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      {vehicule.marque} {vehicule.modele}
                    </div>
                  </TableCell>
                  <TableCell>{vehicule.immatriculation}</TableCell>
                  <TableCell className="capitalize">{vehicule.type}</TableCell>
                  <TableCell>{vehicule.capacite} places</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutBadge(vehicule.statut)}`}>
                      {vehicule.statut.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(vehicule.id)}>
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