import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, UtensilsCrossed, BarChart3, RefreshCw } from "lucide-react";
import { RestaurationRecapTab } from "@/components/restauration/RestaurationRecapTab";
import { useRestaurationBudget } from "@/hooks/useRestaurationBudget";

interface OffreRestauration {
  id: string;
  nature_restauration: string;
  formule_restauration: string;
  prix_unitaire: number;
  devise: "EUR" | "MAD";
}

export default function Restauration() {
  const { user } = useAuth();
  const { canViewSection, canEditSection } = useUserRole();
  const { toast } = useToast();
  const { syncRestaurationToBudget } = useRestaurationBudget();
  const [offres, setOffres] = useState<OffreRestauration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    nature_restauration: "",
    formule_restauration: "",
    prix_unitaire: "",
    devise: "EUR" as "EUR" | "MAD",
  });

  useEffect(() => {
    if (user && canViewSection("restauration")) {
      loadOffres();
    }
  }, [user]);

  const loadOffres = async () => {
    const { data, error } = await supabase
      .from("offres_restauration")
      .select("*")
      .order("nature_restauration");

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setOffres(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const offreData = {
      nature_restauration: formData.nature_restauration,
      formule_restauration: formData.formule_restauration,
      prix_unitaire: parseFloat(formData.prix_unitaire),
      devise: formData.devise,
      created_by: user?.id,
    };

    if (editingId) {
      const { error } = await supabase
        .from("offres_restauration")
        .update(offreData)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Offre modifiée avec succès" });
        setDialogOpen(false);
        setEditingId(null);
        loadOffres();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("offres_restauration")
        .insert(offreData);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Offre créée avec succès" });
        setDialogOpen(false);
        loadOffres();
        resetForm();
      }
    }
  };

  const handleEdit = (offre: OffreRestauration) => {
    setEditingId(offre.id);
    setFormData({
      nature_restauration: offre.nature_restauration,
      formule_restauration: offre.formule_restauration,
      prix_unitaire: offre.prix_unitaire.toString(),
      devise: offre.devise || "EUR",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) return;

    const { error } = await supabase
      .from("offres_restauration")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Offre supprimée" });
      loadOffres();
    }
  };

  const resetForm = () => {
    setFormData({
      nature_restauration: "",
      formule_restauration: "",
      prix_unitaire: "",
      devise: "EUR",
    });
    setEditingId(null);
  };

  if (!canViewSection("restauration")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }


  const handleSyncBudget = async () => {
    setSyncing(true);
    const success = await syncRestaurationToBudget();
    if (success) {
      toast({ title: "Succès", description: "Les coûts de restauration ont été synchronisés avec le budget." });
    } else {
      toast({ title: "Erreur", description: "Impossible de synchroniser les coûts.", variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion de la Restauration</h1>
          <p className="text-muted-foreground">
            Gérez les offres et le suivi de restauration pour vos formations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncBudget} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sync Budget
          </Button>
        </div>
      </div>

      <Tabs defaultValue="offres" className="w-full">
        <TabsList>
          <TabsTrigger value="offres" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Offres
          </TabsTrigger>
          <TabsTrigger value="recap" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Récapitulatif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offres" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Offre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Modifier l'offre" : "Créer une offre"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nature de la restauration *</Label>
                    <Input
                      value={formData.nature_restauration}
                      onChange={(e) => setFormData({ ...formData, nature_restauration: e.target.value })}
                      placeholder="Ex: Déjeuner, Pause café, Cocktail..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Formule de restauration *</Label>
                    <Input
                      value={formData.formule_restauration}
                      onChange={(e) => setFormData({ ...formData, formule_restauration: e.target.value })}
                      placeholder="Ex: Buffet, Menu, Plateau repas..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prix unitaire *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.prix_unitaire}
                        onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Devise *</Label>
                      <Select value={formData.devise} onValueChange={(v: "EUR" | "MAD") => setFormData({ ...formData, devise: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">€ EUR</SelectItem>
                          <SelectItem value="MAD">MAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingId ? "Modifier" : "Créer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Offres de restauration</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nature</TableHead>
                    <TableHead>Formule</TableHead>
                    <TableHead>Prix Unitaire</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offres.map((offre) => (
                    <TableRow key={offre.id}>
                      <TableCell className="font-medium">{offre.nature_restauration}</TableCell>
                      <TableCell>{offre.formule_restauration}</TableCell>
                      <TableCell>{offre.prix_unitaire.toFixed(2)} {offre.devise === "MAD" ? "MAD" : "€"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(offre)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(offre.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recap" className="mt-6">
          <RestaurationRecapTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
