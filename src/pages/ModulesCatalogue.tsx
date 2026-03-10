import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Edit, Trash2, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ModulesCatalogue = () => {
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("modules_catalogue");
  
  const [modules, setModules] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    titre: "",
    descriptif: "",
    enseignantsIds: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les modules du catalogue
      const { data: modulesData, error: modulesError } = await supabase
        .from("module_catalogue")
        .select(`
          *,
          module_enseignants (
            enseignant_id,
            enseignants (
              id,
              nom,
              prenom
            )
          )
        `)
        .order("titre");

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Charger tous les enseignants
      const { data: enseignantsData, error: enseignantsError } = await supabase
        .from("enseignants")
        .select("id, nom, prenom")
        .order("nom");

      if (enseignantsError) throw enseignantsError;
      setEnseignants(enseignantsData || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingModule) {
        // Modifier le module
        const { error: updateError } = await supabase
          .from("module_catalogue")
          .update({
            titre: formData.titre,
            descriptif: formData.descriptif
          })
          .eq("id", editingModule.id);

        if (updateError) throw updateError;

        // Supprimer les anciennes associations
        await supabase
          .from("module_enseignants")
          .delete()
          .eq("module_catalogue_id", editingModule.id);

        // Ajouter les nouvelles associations
        if (formData.enseignantsIds.length > 0) {
          const associations = formData.enseignantsIds.map(enseignantId => ({
            module_catalogue_id: editingModule.id,
            enseignant_id: enseignantId
          }));

          const { error: assocError } = await supabase
            .from("module_enseignants")
            .insert(associations);

          if (assocError) throw assocError;
        }

        toast.success("Module modifié avec succès");
      } else {
        // Créer le module
        const { data: newModule, error: insertError } = await supabase
          .from("module_catalogue")
          .insert({
            titre: formData.titre,
            descriptif: formData.descriptif,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Ajouter les associations enseignants
        if (formData.enseignantsIds.length > 0 && newModule) {
          const associations = formData.enseignantsIds.map(enseignantId => ({
            module_catalogue_id: newModule.id,
            enseignant_id: enseignantId
          }));

          const { error: assocError } = await supabase
            .from("module_enseignants")
            .insert(associations);

          if (assocError) throw assocError;
        }

        toast.success("Module créé avec succès");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement du module");
      console.error(error);
    }
  };

  const handleEdit = (module: any) => {
    setEditingModule(module);
    setFormData({
      titre: module.titre,
      descriptif: module.descriptif || "",
      enseignantsIds: module.module_enseignants?.map((me: any) => me.enseignant_id) || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce module ? Cette action est irréversible.")) return;

    try {
      const { error } = await supabase
        .from("module_catalogue")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
      toast.success("Module supprimé avec succès");
      loadData();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression du module");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      titre: "",
      descriptif: "",
      enseignantsIds: []
    });
    setEditingModule(null);
  };

  const handleRemoveEnseignant = async (moduleId: string, enseignantId: string, enseignantName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${enseignantName} de ce module ?`)) return;

    try {
      const { error } = await supabase
        .from("module_enseignants")
        .delete()
        .eq("module_catalogue_id", moduleId)
        .eq("enseignant_id", enseignantId);

      if (error) throw error;
      toast.success(`${enseignantName} retiré du module`);
      loadData();
    } catch (error: any) {
      toast.error("Erreur lors du retrait du formateur");
      console.error(error);
    }
  };

  const toggleEnseignant = (enseignantId: string) => {
    setFormData(prev => ({
      ...prev,
      enseignantsIds: prev.enseignantsIds.includes(enseignantId)
        ? prev.enseignantsIds.filter(id => id !== enseignantId)
        : [...prev.enseignantsIds, enseignantId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalogue de modules</h1>
          <p className="text-muted-foreground">
            Gérez votre bibliothèque de modules de formation
          </p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau module
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModule ? "Modifier le module" : "Créer un module"}
                </DialogTitle>
                <DialogDescription>
                  Définissez les informations du module et les enseignants associés
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titre">Titre du module *</Label>
                  <Input
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptif">Descriptif</Label>
                  <Textarea
                    id="descriptif"
                    value={formData.descriptif}
                    onChange={(e) => setFormData({ ...formData, descriptif: e.target.value })}
                    rows={4}
                    placeholder="Description du module, objectifs, prérequis..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enseignants associés</Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                    {enseignants.map((enseignant) => (
                      <div key={enseignant.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`ens-${enseignant.id}`}
                          checked={formData.enseignantsIds.includes(enseignant.id)}
                          onChange={() => toggleEnseignant(enseignant.id)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`ens-${enseignant.id}`} className="cursor-pointer font-normal">
                          {enseignant.prenom} {enseignant.nom}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingModule ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Aucun module</h3>
            <p className="text-muted-foreground">
              Commencez par créer votre premier module de formation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card 
              key={module.id} 
              className="transition-shadow hover:shadow-md cursor-pointer group"
              onClick={() => navigate(`/modules-catalogue/${module.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{module.titre}</CardTitle>
                    {module.descriptif && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {module.descriptif}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/modules-catalogue/${module.id}`)}
                      title="Voir le détail"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(module)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(module.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              {module.module_enseignants && module.module_enseignants.filter((me: any) => me.enseignants).length > 0 && (
                <CardContent>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {module.module_enseignants
                        .filter((me: any) => me.enseignants)
                        .map((me: any) => (
                        <Badge 
                          key={me.enseignant_id} 
                          variant="secondary"
                          className="group cursor-pointer hover:bg-destructive/10"
                        >
                          {me.enseignants?.prenom} {me.enseignants?.nom}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveEnseignant(module.id, me.enseignant_id, `${me.enseignants?.prenom || ''} ${me.enseignants?.nom || ''}`);
                              }}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                              title="Retirer ce formateur"
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModulesCatalogue;
