import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface EditProgrammeDialogProps {
  programme: any;
  onProgrammeUpdated: () => void;
}

export const EditProgrammeDialog = ({ programme, onProgrammeUpdated }: EditProgrammeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    titre: string;
    code: string;
    code_description: string;
    type: "INTER" | "INTRA";
    client_id: string;
    date_debut: string;
    date_fin: string;
    is_retroactive: boolean;
  }>({
    titre: "",
    code: "",
    code_description: "",
    type: "INTER",
    client_id: "",
    date_debut: "",
    date_fin: "",
    is_retroactive: false,
  });

  useEffect(() => {
    if (open) {
      loadClients();
      setFormData({
        titre: programme.titre || "",
        code: programme.code || "",
        code_description: programme.code_description || "",
        type: programme.type || "INTER",
        client_id: programme.client_id || "",
        date_debut: programme.date_debut || "",
        date_fin: programme.date_fin || "",
        is_retroactive: programme.is_retroactive || false,
      });
    }
  }, [open, programme]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, nom, code")
      .order("nom");

    if (error) {
      console.error("Erreur lors du chargement des clients:", error);
      return;
    }

    setClients(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.titre || !formData.code) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (formData.date_debut && formData.date_fin && formData.date_debut > formData.date_fin) {
      toast.error("La date de début ne peut pas être après la date de fin");
      return;
    }

    if (formData.type === "INTRA" && !formData.client_id) {
      toast.error("Veuillez sélectionner un client pour un programme INTRA");
      return;
    }

    const { error } = await supabase
      .from("programmes")
      .update({
        titre: formData.titre,
        code: formData.code,
        code_description: formData.code_description || null,
        type: formData.type,
        client_id: formData.type === "INTRA" ? formData.client_id : null,
        date_debut: formData.date_debut || null,
        date_fin: formData.date_fin || null,
        is_retroactive: formData.is_retroactive,
      })
      .eq("id", programme.id);

    if (error) {
      toast.error("Erreur lors de la modification du programme");
      console.error(error);
      return;
    }

    toast.success("Programme modifié avec succès");
    setOpen(false);
    onProgrammeUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Modifier le programme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le programme</DialogTitle>
          <DialogDescription>
            Modifiez les informations principales du programme
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Titre du programme *</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Ex: Formation avancée en management"
              />
            </div>
            <div>
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: PROG-001"
              />
            </div>
          </div>

          <div>
            <Label>Description du code</Label>
            <Textarea
              value={formData.code_description}
              onChange={(e) => setFormData({ ...formData, code_description: e.target.value })}
              placeholder="Description détaillée du programme..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type de programme *</Label>
              <Select value={formData.type} onValueChange={(v: "INTER" | "INTRA") => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTER">INTER-ENTREPRISE</SelectItem>
                  <SelectItem value="INTRA">INTRA-ENTREPRISE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "INTRA" && (
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
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
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="retroactive"
              checked={formData.is_retroactive}
              onCheckedChange={(checked) => setFormData({ ...formData, is_retroactive: checked })}
            />
            <Label htmlFor="retroactive" className="cursor-pointer">
              Programme rétroactif
            </Label>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Enregistrer les modifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
