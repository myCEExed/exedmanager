import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ProgrammeClassesManagerProps {
  programmeId: string;
  onClassesChange?: () => void;
}

export const ProgrammeClassesManager = ({ programmeId, onClassesChange }: ProgrammeClassesManagerProps) => {
  const { user } = useAuth();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("programmes");
  const [classes, setClasses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    nom: "",
    sous_code: "",
    date_debut: "",
    date_fin: "",
  });

  useEffect(() => {
    loadClasses();
  }, [programmeId]);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        inscriptions (count)
      `)
      .eq("programme_id", programmeId)
      .order("date_debut", { ascending: true });

    if (error) {
      console.error("Erreur lors du chargement des classes:", error);
      return;
    }

    setClasses(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.nom || !formData.sous_code) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (formData.date_debut && formData.date_fin && formData.date_debut > formData.date_fin) {
      toast.error("La date de début ne peut pas être après la date de fin");
      return;
    }

    const payload = {
      programme_id: programmeId,
      nom: formData.nom,
      sous_code: formData.sous_code,
      date_debut: formData.date_debut || null,
      date_fin: formData.date_fin || null,
      created_by: user?.id,
    };

    if (editingClass) {
      const { error } = await supabase
        .from("classes")
        .update(payload)
        .eq("id", editingClass.id);

      if (error) {
        toast.error("Erreur lors de la modification de la classe");
        console.error(error);
        return;
      }
      toast.success("Classe modifiée avec succès");
    } else {
      const { error } = await supabase
        .from("classes")
        .insert(payload);

      if (error) {
        toast.error("Erreur lors de la création de la classe");
        console.error(error);
        return;
      }
      toast.success("Classe créée avec succès");
    }

    setDialogOpen(false);
    setEditingClass(null);
    setFormData({ nom: "", sous_code: "", date_debut: "", date_fin: "" });
    loadClasses();
    onClassesChange?.();
  };

  const handleEdit = (classe: any) => {
    setEditingClass(classe);
    setFormData({
      nom: classe.nom,
      sous_code: classe.sous_code,
      date_debut: classe.date_debut || "",
      date_fin: classe.date_fin || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (classeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) {
      return;
    }

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", classeId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      return;
    }

    toast.success("Classe supprimée");
    loadClasses();
    onClassesChange?.();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClass(null);
    setFormData({ nom: "", sous_code: "", date_debut: "", date_fin: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Classes du programme</CardTitle>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une classe
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Modifier la classe" : "Ajouter une classe"}
              </DialogTitle>
              <DialogDescription>
                {editingClass ? "Modifiez les informations de la classe" : "Créez une nouvelle classe pour ce programme"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de la classe *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Classe A"
                />
              </div>
              <div>
                <Label>Sous-code *</Label>
                <Input
                  value={formData.sous_code}
                  onChange={(e) => setFormData({ ...formData, sous_code: e.target.value })}
                  placeholder="Ex: A1"
                />
              </div>
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingClass ? "Modifier" : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune classe créée. Ajoutez des classes pour organiser le programme.
          </p>
        ) : (
          <div className="space-y-2">
            {classes.map((classe) => (
              <div
                key={classe.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <p className="font-medium">{classe.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    Code: {classe.sous_code}
                    {classe.date_debut && ` • ${new Date(classe.date_debut).toLocaleDateString("fr-FR")}`}
                    {classe.date_fin && ` - ${new Date(classe.date_fin).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(classe)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(classe.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
