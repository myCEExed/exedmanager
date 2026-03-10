import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Pencil, Trash2, Users, Phone, Mail } from "lucide-react";

interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  telephone?: string;
  telephone_indicatif: string;
  email?: string;
  disponible: boolean;
  notes?: string;
}

export const ChauffeursTab = () => {
  const { toast } = useToast();
  const { canEditSection } = useUserRole();
  const canEditTransferts = canEditSection("transferts");

  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    telephone_indicatif: "+212",
    email: "",
    disponible: true,
    notes: "",
  });

  useEffect(() => {
    loadChauffeurs();
  }, []);

  const loadChauffeurs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chauffeurs")
        .select("*")
        .order("nom");

      if (error) throw error;
      setChauffeurs(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les chauffeurs",
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
      if (editingId) {
        const { error } = await supabase
          .from("chauffeurs")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Chauffeur modifié avec succès" });
      } else {
        const { error } = await supabase.from("chauffeurs").insert(formData);
        if (error) throw error;
        toast({ title: "Chauffeur créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadChauffeurs();
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

  const handleEdit = (chauffeur: Chauffeur) => {
    setEditingId(chauffeur.id);
    setFormData({
      nom: chauffeur.nom,
      prenom: chauffeur.prenom,
      telephone: chauffeur.telephone || "",
      telephone_indicatif: chauffeur.telephone_indicatif,
      email: chauffeur.email || "",
      disponible: chauffeur.disponible,
      notes: chauffeur.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce chauffeur ?")) return;

    try {
      const { error } = await supabase.from("chauffeurs").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Chauffeur supprimé avec succès" });
      loadChauffeurs();
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
      prenom: "",
      telephone: "",
      telephone_indicatif: "+212",
      email: "",
      disponible: true,
      notes: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des chauffeurs</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau chauffeur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouveau"} chauffeur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <div className="flex gap-2">
                    <Input className="w-20" value={formData.telephone_indicatif} onChange={(e) => setFormData({ ...formData, telephone_indicatif: e.target.value })} />
                    <Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Disponible</Label>
                <Switch checked={formData.disponible} onCheckedChange={(checked) => setFormData({ ...formData, disponible: checked })} />
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
              <TableHead>Chauffeur</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chauffeurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun chauffeur enregistré
                </TableCell>
              </TableRow>
            ) : (
              chauffeurs.map((chauffeur) => (
                <TableRow key={chauffeur.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {chauffeur.nom} {chauffeur.prenom}
                    </div>
                  </TableCell>
                  <TableCell>
                    {chauffeur.telephone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {chauffeur.telephone_indicatif} {chauffeur.telephone}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {chauffeur.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {chauffeur.email}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${chauffeur.disponible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {chauffeur.disponible ? "Disponible" : "Indisponible"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(chauffeur)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(chauffeur.id)}>
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