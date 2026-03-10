import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  GripVertical, 
  Clock, 
  Trash2, 
  Edit, 
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Users,
  AlertTriangle,
  History
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ModuleResourcesHistory } from "@/components/modules/ModuleResourcesHistory";

interface ModuleEnseignant {
  enseignant_id: string;
  enseignants: {
    nom: string;
    prenom: string;
  };
}

interface ProgrammeModule {
  id: string;
  duree: number;
  unite_duree: "heures" | "jours";
  ordre: number;
  module_catalogue: {
    id: string;
    titre: string;
    descriptif: string | null;
  } | null;
  enseignants?: ModuleEnseignant[];
}

interface ScheduledModule {
  id: string;
  titre: string;
  code: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_heures: number | null;
  programme_module_id: string | null;
  affectations?: {
    enseignant_id: string;
    enseignants: {
      nom: string;
      prenom: string;
    };
  }[];
}

interface ClasseModulesSchedulerProps {
  classeId: string;
  programmeId: string;
  onModulesChange?: () => void;
}

export const ClasseModulesScheduler = ({ 
  classeId, 
  programmeId, 
  onModulesChange 
}: ClasseModulesSchedulerProps) => {
  const [programmeModules, setProgrammeModules] = useState<ProgrammeModule[]>([]);
  const [scheduledModules, setScheduledModules] = useState<ScheduledModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedModuleForHistory, setSelectedModuleForHistory] = useState<ScheduledModule | null>(null);
  const [editingModule, setEditingModule] = useState<ScheduledModule | null>(null);
  const [formData, setFormData] = useState({
    date_debut: "",
    date_fin: "",
    duree_heures: ""
  });

  useEffect(() => {
    loadData();
  }, [classeId, programmeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load programme modules (source of truth)
      const { data: progModules, error: progError } = await supabase
        .from("programme_modules")
        .select(`
          id,
          duree,
          unite_duree,
          ordre,
          module_catalogue (
            id,
            titre,
            descriptif
          )
        `)
        .eq("programme_id", programmeId)
        .order("ordre");

      if (progError) throw progError;

      // Load enseignants for each module catalogue
      const modulesWithEnseignants = await Promise.all(
        (progModules || []).map(async (pm) => {
          if (!pm.module_catalogue) return { ...pm, enseignants: [] };
          
          const { data: enseignantsData } = await supabase
            .from("module_enseignants")
            .select("enseignant_id, enseignants(nom, prenom)")
            .eq("module_catalogue_id", pm.module_catalogue.id);
          
          return {
            ...pm,
            enseignants: (enseignantsData || []).map(e => ({
              enseignant_id: e.enseignant_id,
              enseignants: e.enseignants as { nom: string; prenom: string }
            }))
          };
        })
      );

      setProgrammeModules(modulesWithEnseignants);

      // Load already scheduled modules for this class with affectations
      const { data: scheduled, error: schedError } = await supabase
        .from("modules")
        .select(`
          id, titre, code, date_debut, date_fin, duree_heures, programme_module_id,
          affectations(enseignant_id, enseignants(nom, prenom))
        `)
        .eq("classe_id", classeId)
        .order("date_debut", { ascending: true });

      if (schedError) throw schedError;
      setScheduledModules(scheduled || []);

    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Get unscheduled programme modules (those not yet added to the class)
  const unscheduledModules = programmeModules.filter(
    pm => !scheduledModules.some(sm => sm.programme_module_id === pm.id)
  );

  // Handle drag from available list to scheduled list
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Dropping from available to scheduled
    if (source.droppableId === "available" && destination.droppableId === "scheduled") {
      const programmeModule = programmeModules.find(pm => pm.id === draggableId);
      if (!programmeModule || !programmeModule.module_catalogue) return;

      // Check if module has at least one teacher associated
      const enseignants = programmeModule.enseignants || [];
      if (enseignants.length === 0) {
        toast.error(
          `Impossible de planifier "${programmeModule.module_catalogue.titre}": aucun formateur associé. Veuillez d'abord associer un formateur dans le catalogue des modules.`
        );
        return;
      }

      const dureeHeures = programmeModule.unite_duree === "jours" 
        ? programmeModule.duree * 8 
        : programmeModule.duree;

      // Create the module for this class
      const moduleData = {
        classe_id: classeId,
        titre: programmeModule.module_catalogue.titre,
        code: `MOD-${Date.now().toString(36).toUpperCase()}`,
        programme_module_id: programmeModule.id,
        duree_heures: dureeHeures
      };

      try {
        const { data, error } = await supabase
          .from("modules")
          .insert(moduleData)
          .select()
          .single();

        if (error) throw error;

        // Auto-assign the first teacher (or only teacher) to this scheduled module
        if (enseignants.length >= 1 && data) {
          const { error: affError } = await supabase
            .from("affectations")
            .insert({
              module_id: data.id,
              enseignant_id: enseignants[0].enseignant_id,
              confirmee: false
            });

          if (!affError) {
            const enseignant = enseignants[0].enseignants;
            if (enseignants.length === 1) {
              toast.success(`Module "${programmeModule.module_catalogue.titre}" ajouté avec ${enseignant.prenom} ${enseignant.nom}`);
            } else {
              toast.success(`Module "${programmeModule.module_catalogue.titre}" ajouté avec ${enseignant.prenom} ${enseignant.nom} (${enseignants.length} formateurs disponibles)`);
            }
          } else {
            toast.success(`Module "${programmeModule.module_catalogue.titre}" ajouté`);
          }
        }

        loadData();
        onModulesChange?.();
      } catch (error) {
        console.error("Erreur lors de l'ajout:", error);
        toast.error("Erreur lors de l'ajout du module");
      }
    }

    // Reordering within scheduled
    if (source.droppableId === "scheduled" && destination.droppableId === "scheduled") {
      const items = Array.from(scheduledModules);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setScheduledModules(items);
    }
  };

  const handleEditModule = (module: ScheduledModule) => {
    setEditingModule(module);
    setFormData({
      date_debut: module.date_debut 
        ? format(new Date(module.date_debut), "yyyy-MM-dd'T'HH:mm") 
        : "",
      date_fin: module.date_fin 
        ? format(new Date(module.date_fin), "yyyy-MM-dd'T'HH:mm") 
        : "",
      duree_heures: module.duree_heures?.toString() || ""
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingModule) return;

    try {
      const { error } = await supabase
        .from("modules")
        .update({
          date_debut: formData.date_debut ? new Date(formData.date_debut).toISOString() : null,
          date_fin: formData.date_fin ? new Date(formData.date_fin).toISOString() : null,
          duree_heures: formData.duree_heures ? parseFloat(formData.duree_heures) : null
        })
        .eq("id", editingModule.id);

      if (error) throw error;

      toast.success("Module mis à jour");
      setEditDialogOpen(false);
      loadData();
      onModulesChange?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce module de la planification ?")) return;

    try {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      toast.success("Module retiré de la planification");
      loadData();
      onModulesChange?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const isModuleScheduled = (module: ScheduledModule) => {
    return module.date_debut && module.date_fin;
  };

  const handleViewHistory = (module: ScheduledModule) => {
    setSelectedModuleForHistory(module);
    setHistoryDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Available Modules (from programme) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Modules du programme
              </CardTitle>
              <CardDescription>
                Glissez les modules vers la zone de planification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="available" isDropDisabled={true}>
                {(provided, snapshot) => (
                  <ScrollArea className="h-[400px]">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 pr-4"
                    >
                      {unscheduledModules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>Tous les modules ont été planifiés</p>
                        </div>
                      ) : (
                        unscheduledModules.map((pm, index) => {
                          const hasEnseignant = (pm.enseignants?.length || 0) > 0;
                          return (
                          <Draggable key={pm.id} draggableId={pm.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                  p-3 rounded-lg border bg-card transition-all duration-200
                                  ${!hasEnseignant ? "border-destructive/50 opacity-70 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
                                  ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : hasEnseignant ? "hover:border-primary/50" : ""}
                                `}
                              >
                                <div className="flex items-start gap-3">
                                  <GripVertical className={`h-5 w-5 shrink-0 mt-0.5 ${hasEnseignant ? "text-muted-foreground" : "text-destructive/50"}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {pm.module_catalogue?.titre}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {pm.duree} {pm.unite_duree}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        #{pm.ordre}
                                      </Badge>
                                    </div>
                                    {/* Show teacher info */}
                                    {hasEnseignant ? (
                                      <div className="flex items-center gap-1 mt-2">
                                        <Users className="h-3 w-3 text-green-600" />
                                        <span className="text-xs text-green-600">
                                          {pm.enseignants!.map(e => `${e.enseignants.prenom} ${e.enseignants.nom}`).join(", ")}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 mt-2">
                                        <AlertTriangle className="h-3 w-3 text-destructive" />
                                        <span className="text-xs text-destructive">
                                          Aucun formateur associé
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );})
                      )}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Scheduled Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Modules planifiés
              </CardTitle>
              <CardDescription>
                Modules programmés pour cette classe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="scheduled">
                {(provided, snapshot) => (
                  <ScrollArea className="h-[400px]">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        space-y-2 pr-4 min-h-[100px] rounded-lg transition-colors
                        ${snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-primary ring-dashed" : ""}
                      `}
                    >
                      {scheduledModules.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Déposez les modules ici</p>
                          <p className="text-sm">pour les ajouter à la planification</p>
                        </div>
                      ) : (
                        scheduledModules.map((module, index) => (
                          <Draggable key={module.id} draggableId={module.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`
                                  p-3 rounded-lg border bg-card
                                  transition-all duration-200
                                  ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : ""}
                                  ${isModuleScheduled(module) ? "border-green-500/50" : "border-amber-500/50"}
                                `}
                              >
                                <div className="flex items-start gap-3">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium">{module.titre}</p>
                                        <p className="text-xs text-muted-foreground">{module.code}</p>
                                      </div>
                                      {isModuleScheduled(module) ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                      )}
                                    </div>
                                    
                                    {module.date_debut && module.date_fin ? (
                                      <div className="mt-2 text-sm text-muted-foreground">
                                        <p>
                                          Du {format(new Date(module.date_debut), "d MMM yyyy HH:mm", { locale: fr })}
                                        </p>
                                        <p>
                                          Au {format(new Date(module.date_fin), "d MMM yyyy HH:mm", { locale: fr })}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="mt-2 text-sm text-amber-600">
                                        Dates non définies
                                      </p>
                                    )}

                                    {module.duree_heures && (
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {module.duree_heures}h
                                      </Badge>
                                    )}

                                    {/* Display assigned teacher */}
                                    {module.affectations && module.affectations.filter((a: any) => a.enseignants).length > 0 && (
                                      <div className="flex items-center gap-1 mt-2">
                                        <Users className="h-3 w-3 text-primary" />
                                        <span className="text-xs text-primary font-medium">
                                          {module.affectations
                                            .filter((a: any) => a.enseignants)
                                            .map((a: any) => `${a.enseignants.prenom} ${a.enseignants.nom}`)
                                            .join(", ")}
                                        </span>
                                      </div>
                                    )}

                                    <Separator className="my-2" />
                                    
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditModule(module)}
                                        className="h-7 px-2"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Planifier
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewHistory(module)}
                                        className="h-7 px-2"
                                      >
                                        <History className="h-3 w-3 mr-1" />
                                        Historique
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteModule(module.id)}
                                        className="h-7 px-2 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Retirer
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </DragDropContext>

      {/* Progress indicator */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression de la planification</span>
            <span className="text-sm text-muted-foreground">
              {scheduledModules.filter(isModuleScheduled).length} / {programmeModules.length} modules planifiés
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ 
                width: `${programmeModules.length > 0 
                  ? (scheduledModules.filter(isModuleScheduled).length / programmeModules.length) * 100 
                  : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier le module</DialogTitle>
            <DialogDescription>
              {editingModule?.titre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date et heure de début</Label>
              <Input
                id="date_debut"
                type="datetime-local"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_fin">Date et heure de fin</Label>
              <Input
                id="date_fin"
                type="datetime-local"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duree_heures">Durée (heures)</Label>
              <Input
                id="duree_heures"
                type="number"
                step="0.5"
                value={formData.duree_heures}
                onChange={(e) => setFormData({ ...formData, duree_heures: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique du module</DialogTitle>
            <DialogDescription>
              {selectedModuleForHistory?.titre} ({selectedModuleForHistory?.code})
            </DialogDescription>
          </DialogHeader>
          {selectedModuleForHistory && (
            <ModuleResourcesHistory moduleId={selectedModuleForHistory.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
