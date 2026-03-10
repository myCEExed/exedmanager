import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface ProgrammeModulesManagerProps {
  programmeId: string;
  onModulesChange?: () => void;
}

export const ProgrammeModulesManager = ({ programmeId, onModulesChange }: ProgrammeModulesManagerProps) => {
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("programmes");
  const [modules, setModules] = useState<any[]>([]);
  const [catalogueModules, setCatalogueModules] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [duree, setDuree] = useState("");
  const [uniteDuree, setUniteDuree] = useState<"heures" | "jours">("heures");

  useEffect(() => {
    loadModules();
    loadCatalogueModules();
  }, [programmeId]);

  const loadModules = async () => {
    const { data, error } = await supabase
      .from("programme_modules")
      .select(`
        *,
        module_catalogue (
          id,
          titre,
          descriptif
        )
      `)
      .eq("programme_id", programmeId)
      .order("ordre");

    if (error) {
      console.error("Erreur lors du chargement des modules:", error);
      return;
    }

    setModules(data || []);
  };

  const loadCatalogueModules = async () => {
    const { data, error } = await supabase
      .from("module_catalogue")
      .select("*")
      .order("titre");

    if (error) {
      console.error("Erreur lors du chargement du catalogue:", error);
      return;
    }

    setCatalogueModules(data || []);
  };

  const handleAddModule = async () => {
    if (!selectedModuleId || !duree) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const maxOrdre = modules.length > 0 ? Math.max(...modules.map(m => m.ordre || 0)) : 0;

    const { error } = await supabase.from("programme_modules").insert({
      programme_id: programmeId,
      module_catalogue_id: selectedModuleId,
      duree: parseFloat(duree),
      unite_duree: uniteDuree,
      ordre: maxOrdre + 1,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout du module");
      console.error(error);
      return;
    }

    toast.success("Module ajouté avec succès");
    setDialogOpen(false);
    setSelectedModuleId("");
    setDuree("");
    loadModules();
    onModulesChange?.();
  };

  const handleDeleteModule = async (moduleId: string) => {
    const { error } = await supabase
      .from("programme_modules")
      .delete()
      .eq("id", moduleId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      return;
    }

    toast.success("Module supprimé");
    loadModules();
    onModulesChange?.();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const items = Array.from(modules);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];

    // Update ordre for affected modules
    const updates = items.map((item, idx) => ({
      id: item.id,
      ordre: idx + 1,
    }));

    setModules(items);

    // Update in database
    for (const update of updates) {
      await supabase
        .from("programme_modules")
        .update({ ordre: update.ordre })
        .eq("id", update.id);
    }

    toast.success("Ordre des modules mis à jour");
    onModulesChange?.();
  };

  const handleMoveDown = async (index: number) => {
    if (index === modules.length - 1) return;

    const items = Array.from(modules);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];

    // Update ordre for affected modules
    const updates = items.map((item, idx) => ({
      id: item.id,
      ordre: idx + 1,
    }));

    setModules(items);

    // Update in database
    for (const update of updates) {
      await supabase
        .from("programme_modules")
        .update({ ordre: update.ordre })
        .eq("id", update.id);
    }

    toast.success("Ordre des modules mis à jour");
    onModulesChange?.();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modules du programme</CardTitle>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un module au programme</DialogTitle>
                <DialogDescription>
                  Sélectionnez un module du catalogue
                </DialogDescription>
              </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Module *</Label>
                <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un module" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Durée *</Label>
                  <Input
                    type="number"
                    value={duree}
                    onChange={(e) => setDuree(e.target.value)}
                    placeholder="Ex: 8"
                  />
                </div>
                <div>
                  <Label>Unité *</Label>
                  <Select value={uniteDuree} onValueChange={(v: "heures" | "jours") => setUniteDuree(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heures">Heures</SelectItem>
                      <SelectItem value="jours">Jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddModule} className="w-full">
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun module ajouté. Ajoutez au moins un module pour activer le programme.
          </p>
        ) : (
          <div className="space-y-2">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {canEdit && (
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === modules.length - 1}
                      className="h-6 w-6"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{module.module_catalogue?.titre}</p>
                  <p className="text-sm text-muted-foreground">
                    {module.duree} {module.unite_duree}
                  </p>
                </div>
                <Badge variant="outline">#{module.ordre}</Badge>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteModule(module.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
