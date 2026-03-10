import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Globe, Star } from "lucide-react";

interface Hotel {
  id: string;
  nom: string;
  adresse?: string;
  ville: string;
  pays: string;
  telephone?: string;
  telephone_indicatif: string;
  email?: string;
  site_web?: string;
  etoiles?: number;
  notes?: string;
}

export const HotelsTab = () => {
  const { toast } = useToast();
  const { canEditSection } = useUserRole();
  const canEditTransferts = canEditSection("transferts");

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    adresse: "",
    ville: "",
    pays: "Maroc",
    telephone: "",
    telephone_indicatif: "+212",
    email: "",
    site_web: "",
    etoiles: "",
    notes: "",
  });

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .order("nom");

      if (error) throw error;
      setHotels(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les hôtels",
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
        etoiles: formData.etoiles ? parseInt(formData.etoiles) : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("hotels")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Hôtel modifié avec succès" });
      } else {
        const { error } = await supabase.from("hotels").insert(data);
        if (error) throw error;
        toast({ title: "Hôtel créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadHotels();
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

  const handleEdit = (hotel: Hotel) => {
    setEditingId(hotel.id);
    setFormData({
      nom: hotel.nom,
      adresse: hotel.adresse || "",
      ville: hotel.ville,
      pays: hotel.pays,
      telephone: hotel.telephone || "",
      telephone_indicatif: hotel.telephone_indicatif,
      email: hotel.email || "",
      site_web: hotel.site_web || "",
      etoiles: hotel.etoiles?.toString() || "",
      notes: hotel.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet hôtel ?")) return;

    try {
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Hôtel supprimé avec succès" });
      loadHotels();
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
      adresse: "",
      ville: "",
      pays: "Maroc",
      telephone: "",
      telephone_indicatif: "+212",
      email: "",
      site_web: "",
      etoiles: "",
      notes: "",
    });
  };

  const renderStars = (count?: number) => {
    if (!count) return null;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Base de données des hôtels</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel hôtel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouvel"} hôtel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nom *</Label>
                  <Input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Adresse</Label>
                  <Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Pays *</Label>
                  <Input value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} required />
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

                <div className="space-y-2">
                  <Label>Site web</Label>
                  <Input type="url" value={formData.site_web} onChange={(e) => setFormData({ ...formData, site_web: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Étoiles (1-5)</Label>
                  <Input type="number" min="1" max="5" value={formData.etoiles} onChange={(e) => setFormData({ ...formData, etoiles: e.target.value })} />
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
              <TableHead>Hôtel</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Étoiles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun hôtel enregistré
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{hotel.nom}</div>
                        {hotel.adresse && <div className="text-sm text-muted-foreground">{hotel.adresse}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {hotel.ville}, {hotel.pays}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {hotel.telephone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {hotel.telephone_indicatif} {hotel.telephone}
                        </div>
                      )}
                      {hotel.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {hotel.email}
                        </div>
                      )}
                      {hotel.site_web && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <a href={hotel.site_web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Site web
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderStars(hotel.etoiles)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(hotel)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(hotel.id)}>
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