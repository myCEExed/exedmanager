import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface CreateProgrammeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const programmeSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est requis"),
  code: z.string().trim().min(1, "Le code est requis"),
  code_description: z.string().optional(),
  type: z.enum(["INTER", "INTRA"]),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  client_id: z.string().optional(),
}).refine(
  (data) => {
    if (data.date_debut && data.date_fin) {
      return new Date(data.date_debut) <= new Date(data.date_fin);
    }
    return true;
  },
  {
    message: "La date de début ne peut pas être après la date de fin",
    path: ["date_fin"],
  }
);

export const CreateProgrammeDialog = ({ open, onOpenChange, onSuccess }: CreateProgrammeDialogProps) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [catalogueModules, setCatalogueModules] = useState<any[]>([]);
  const [selectedModules, setSelectedModules] = useState<Array<{
    module_id: string;
    module_titre: string;
    duree: string;
    unite: "heures" | "jours";
  }>>([]);
  
  const [formData, setFormData] = useState({
    titre: "",
    code: "",
    code_description: "",
    type: "INTER" as "INTER" | "INTRA",
    date_debut: "",
    date_fin: "",
    client_id: "",
  });

  const [currentModule, setCurrentModule] = useState({
    module_id: "",
    duree: "",
    unite: "heures" as "heures" | "jours",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadClients();
      loadCatalogueModules();
    }
  }, [open]);

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, nom, code")
      .order("nom");
    setClients(data || []);
  };

  const loadCatalogueModules = async () => {
    const { data } = await supabase
      .from("module_catalogue")
      .select("*")
      .order("titre");
    setCatalogueModules(data || []);
  };

  const handleAddModule = () => {
    if (!currentModule.module_id || !currentModule.duree) {
      toast.error("Veuillez sélectionner un module et indiquer la durée");
      return;
    }

    const module = catalogueModules.find(m => m.id === currentModule.module_id);
    if (!module) return;

    setSelectedModules([...selectedModules, {
      module_id: currentModule.module_id,
      module_titre: module.titre,
      duree: currentModule.duree,
      unite: currentModule.unite,
    }]);

    setCurrentModule({ module_id: "", duree: "", unite: "heures" });
  };

  const handleRemoveModule = (index: number) => {
    setSelectedModules(selectedModules.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setErrors({});

      if (selectedModules.length === 0) {
        toast.error("Veuillez ajouter au moins un module au programme");
        return;
      }

      const validation = programmeSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0].toString()] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      if (formData.type === "INTRA" && !formData.client_id) {
        toast.error("Veuillez sélectionner un client pour un programme INTRA");
        return;
      }

      setLoading(true);

      const isRetroactive = formData.date_debut
        ? new Date(formData.date_debut) < new Date()
        : false;

      // Créer le programme
      const programmeData: any = {
        titre: formData.titre,
        code: formData.code,
        code_description: formData.code_description || null,
        type: formData.type,
        date_debut: formData.date_debut || null,
        date_fin: formData.date_fin || null,
        is_retroactive: isRetroactive,
        created_by: user?.id,
      };

      if (formData.type === "INTRA") {
        programmeData.client_id = formData.client_id;
      }

      const { data: programme, error: programmeError } = await supabase
        .from("programmes")
        .insert([programmeData])
        .select()
        .single();

      if (programmeError) {
        if (programmeError.message.includes("date de début")) {
          toast.error("La date de début ne peut pas être après la date de fin");
        } else {
          throw programmeError;
        }
        return;
      }

      // Ajouter les modules au programme
      const modulesData = selectedModules.map((module, index) => ({
        programme_id: programme.id,
        module_catalogue_id: module.module_id,
        duree: parseFloat(module.duree),
        unite_duree: module.unite,
        ordre: index + 1,
      }));

      const { error: modulesError } = await supabase
        .from("programme_modules")
        .insert(modulesData);

      if (modulesError) throw modulesError;

      toast.success("Programme créé avec succès");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error("Erreur lors de la création du programme");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      titre: "",
      code: "",
      code_description: "",
      type: "INTER",
      date_debut: "",
      date_fin: "",
      client_id: "",
    });
    setSelectedModules([]);
    setCurrentModule({ module_id: "", duree: "", unite: "heures" });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau programme</DialogTitle>
          <DialogDescription>
            Renseignez les informations du programme. Au moins un module est obligatoire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informations générales</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={errors.code ? "border-destructive" : ""}
                />
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
              </div>

              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "INTER" | "INTRA") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTER">INTER</SelectItem>
                    <SelectItem value="INTRA">INTRA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Titre *</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                className={errors.titre ? "border-destructive" : ""}
              />
              {errors.titre && <p className="text-sm text-destructive mt-1">{errors.titre}</p>}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.code_description}
                onChange={(e) => setFormData({ ...formData, code_description: e.target.value })}
                rows={3}
              />
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
                  className={errors.date_fin ? "border-destructive" : ""}
                />
                {errors.date_fin && <p className="text-sm text-destructive mt-1">{errors.date_fin}</p>}
              </div>
            </div>

            {formData.type === "INTRA" && (
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
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

          {/* Modules */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Modules (au moins 1 obligatoire) *</h3>

            {/* Liste des modules ajoutés */}
            {selectedModules.length > 0 && (
              <div className="space-y-2">
                {selectedModules.map((module, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="flex-1 text-sm">{module.module_titre}</span>
                    <span className="text-sm text-muted-foreground">
                      {module.duree} {module.unite}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveModule(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire d'ajout de module */}
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <Label className="text-xs">Module</Label>
                <Select
                  value={currentModule.module_id}
                  onValueChange={(value) => setCurrentModule({ ...currentModule, module_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogueModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Durée</Label>
                <Input
                  type="number"
                  value={currentModule.duree}
                  onChange={(e) => setCurrentModule({ ...currentModule, duree: e.target.value })}
                  placeholder="Ex: 8"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Unité</Label>
                <Select
                  value={currentModule.unite}
                  onValueChange={(value: "heures" | "jours") => setCurrentModule({ ...currentModule, unite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heures">h</SelectItem>
                    <SelectItem value="jours">j</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Button type="button" onClick={handleAddModule} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selectedModules.length === 0 && (
              <p className="text-sm text-destructive">
                ⚠️ Veuillez ajouter au moins un module pour créer le programme
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading || selectedModules.length === 0}>
              {loading ? "Création..." : "Créer le programme"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
