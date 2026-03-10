import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useExcelImport } from "@/hooks/useExcelImport";
import { useExcelTemplate } from "@/hooks/useExcelTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, UserPlus, Download, Upload, Calendar, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import InscriptionForm from "@/components/InscriptionForm";

// Schema de validation
const classeSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  sous_code: z.string().min(1, "Le sous-code est obligatoire"),
  programme_id: z.string().min(1, "Le programme est obligatoire"),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
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

const Classes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit, isAdmin, isResponsableScolarite } = useUserRole();
  const { exportToExcel } = useExcelExport();
  const { importFromExcel } = useExcelImport();
  const { downloadTemplate } = useExcelTemplate();
  const [classes, setClasses] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [newClass, setNewClass] = useState({
    nom: "",
    sous_code: "",
    programme_id: "",
    date_debut: "",
    date_fin: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClasses();
    loadProgrammes();
  }, []);

  const loadProgrammes = async () => {
    try {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, titre, code")
        .order("titre");

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des programmes:", error);
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          programmes (
            titre,
            code,
            type
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des classes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = classes.map((c) => ({
      Nom: c.nom,
      "Sous-code": c.sous_code,
      Programme: c.programmes?.titre || "",
      "Code programme": c.programmes?.code || "",
      Type: c.programmes?.type || "",
      "Date début": c.date_debut || "",
      "Date fin": c.date_fin || "",
    }));
    exportToExcel(exportData, "classes", "Classes");
    toast.success("Export Excel réussi");
  };

  const handleDownloadTemplate = () => {
    const columns = ['Nom', 'Sous-code', 'Code Programme', 'Date début', 'Date fin'];
    const sampleData = [{
      'Nom': 'Classe Exemple',
      'Sous-code': 'CL001',
      'Code Programme': 'PROG001',
      'Date début': '2024-01-01',
      'Date fin': '2024-12-31'
    }];
    downloadTemplate(columns, 'classes', sampleData);
    toast.success("Canevas téléchargé avec succès");
  };

  const handleImport = async (file: File) => {
    const expectedColumns = ['Nom', 'Sous-code', 'Code Programme', 'Date début', 'Date fin'];
    
    await importFromExcel(file, expectedColumns, async (data) => {
      for (const row of data) {
        const { data: programme } = await supabase
          .from('programmes')
          .select('id')
          .eq('code', row['Code Programme'])
          .single();

        if (!programme) {
          toast.error(`Programme ${row['Code Programme']} introuvable`);
          continue;
        }

        const { error } = await supabase.from('classes').insert({
          nom: row['Nom'],
          sous_code: row['Sous-code'],
          programme_id: programme.id,
          date_debut: row['Date début'] || null,
          date_fin: row['Date fin'] || null
        });

        if (error) {
          toast.error(`Erreur lors de l'import de ${row['Nom']}: ${error.message}`);
          return;
        }
      }
      
      toast.success(`${data.length} classe(s) importée(s) avec succès`);
      loadClasses();
    });
  };

  const canManageClass = (classe: any) => {
    if (!user) return false;
    return (
      isAdmin() || 
      isResponsableScolarite() || 
      (canEdit() && classe.created_by === user.id)
    );
  };

  // Fonction pour interpréter les messages d'erreur Supabase
  const getReadableErrorMessage = (error: any): string => {
    const code = error.code;
    const message = error.message || "";
    const details = error.details || "";
    
    // Erreurs de contrainte de clé étrangère
    if (code === "23503") {
      if (message.includes("programme_id")) {
        return "Le programme sélectionné n'existe pas ou a été supprimé.";
      }
      return `Référence invalide: ${message}`;
    }
    
    // Erreurs de contrainte unique
    if (code === "23505") {
      if (message.includes("sous_code")) {
        return "Ce sous-code existe déjà. Veuillez en choisir un autre.";
      }
      return `Cette valeur existe déjà: ${message}`;
    }
    
    // Erreurs de contrainte check
    if (code === "23514") {
      if (message.includes("date")) {
        return "La date de début ne peut pas être après la date de fin.";
      }
      return `Contrainte de validation non respectée: ${message}`;
    }
    
    // Erreurs de valeur null
    if (code === "23502") {
      return `Un champ obligatoire n'a pas été renseigné: ${message}`;
    }
    
    // Erreurs de type de données
    if (code === "22P02") {
      return `Format de données invalide: ${message}`;
    }
    
    // Erreurs de permission RLS
    if (code === "42501") {
      return "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
    }
    
    // Message par défaut avec détails
    return `Erreur technique (${code || 'inconnue'}): ${message}${details ? ` - Détails: ${details}` : ''}`;
  };

  const handleCreateClass = async () => {
    try {
      setErrors({});
      const validation = classeSchema.safeParse(newClass);
      
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

      const { error } = await supabase.from("classes").insert({
        nom: newClass.nom,
        sous_code: newClass.sous_code,
        programme_id: newClass.programme_id,
        date_debut: newClass.date_debut || null,
        date_fin: newClass.date_fin || null,
        created_by: user?.id
      });

      if (error) {
        const readableMessage = getReadableErrorMessage(error);
        toast.error(readableMessage);
        console.error("Erreur détaillée:", error);
        return;
      }

      toast.success("Classe créée avec succès");
      setCreateDialogOpen(false);
      setNewClass({
        nom: "",
        sous_code: "",
        programme_id: "",
        date_debut: "",
        date_fin: ""
      });
      setErrors({});
      loadClasses();
    } catch (error: any) {
      const readableMessage = getReadableErrorMessage(error);
      toast.error(readableMessage);
      console.error("Erreur lors de la création de la classe:", error);
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    
    try {
      setErrors({});
      const validation = classeSchema.safeParse(selectedClass);
      
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

      const { error } = await supabase
        .from("classes")
        .update({
          nom: selectedClass.nom,
          sous_code: selectedClass.sous_code,
          programme_id: selectedClass.programme_id,
          date_debut: selectedClass.date_debut || null,
          date_fin: selectedClass.date_fin || null,
        })
        .eq("id", selectedClass.id);

      if (error) {
        const readableMessage = getReadableErrorMessage(error);
        toast.error(readableMessage);
        console.error("Erreur détaillée:", error);
        return;
      }

      toast.success("Classe modifiée avec succès");
      setEditDialogOpen(false);
      setSelectedClass(null);
      setErrors({});
      loadClasses();
    } catch (error: any) {
      const readableMessage = getReadableErrorMessage(error);
      toast.error(readableMessage);
      console.error("Erreur lors de la modification de la classe:", error);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", selectedClass.id);

      if (error) {
        const readableMessage = getReadableErrorMessage(error);
        toast.error(readableMessage);
        console.error("Erreur détaillée:", error);
        return;
      }

      toast.success("Classe supprimée avec succès");
      setDeleteDialogOpen(false);
      setSelectedClass(null);
      loadClasses();
    } catch (error: any) {
      const readableMessage = getReadableErrorMessage(error);
      toast.error(readableMessage);
      console.error("Erreur lors de la suppression de la classe:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Gestion des classes et modules de formation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger Canevas
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          {canEdit() && (
            <>
              <label htmlFor="import-classes">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer
                  </span>
                </Button>
              </label>
              <input
                id="import-classes"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
          {canEdit() && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle classe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle classe</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations de la classe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nom">Nom de la classe *</Label>
                    <Input
                      id="nom"
                      value={newClass.nom}
                      onChange={(e) => {
                        setNewClass({ ...newClass, nom: e.target.value });
                        setErrors({ ...errors, nom: "" });
                      }}
                      placeholder="Ex: Classe Executive 2024"
                      className={errors.nom ? "border-destructive" : ""}
                    />
                    {errors.nom && <p className="text-sm text-destructive mt-1">{errors.nom}</p>}
                  </div>
                  <div>
                    <Label htmlFor="sous_code">Sous-code *</Label>
                    <Input
                      id="sous_code"
                      value={newClass.sous_code}
                      onChange={(e) => {
                        setNewClass({ ...newClass, sous_code: e.target.value });
                        setErrors({ ...errors, sous_code: "" });
                      }}
                      placeholder="Ex: CL001"
                      className={errors.sous_code ? "border-destructive" : ""}
                    />
                    {errors.sous_code && <p className="text-sm text-destructive mt-1">{errors.sous_code}</p>}
                  </div>
                  <div>
                    <Label htmlFor="programme">Programme *</Label>
                    <Select
                      value={newClass.programme_id}
                      onValueChange={(value) => {
                        setNewClass({ ...newClass, programme_id: value });
                        setErrors({ ...errors, programme_id: "" });
                      }}
                    >
                      <SelectTrigger className={errors.programme_id ? "border-destructive" : ""}>
                        <SelectValue placeholder="Sélectionner un programme" />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.code} - {prog.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.programme_id && <p className="text-sm text-destructive mt-1">{errors.programme_id}</p>}
                  </div>
                  <div>
                    <Label htmlFor="date_debut">Date de début</Label>
                    <Input
                      id="date_debut"
                      type="date"
                      value={newClass.date_debut}
                      onChange={(e) => {
                        setNewClass({ ...newClass, date_debut: e.target.value });
                        setErrors({ ...errors, date_debut: "" });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_fin">Date de fin</Label>
                    <Input
                      id="date_fin"
                      type="date"
                      value={newClass.date_fin}
                      onChange={(e) => {
                        setNewClass({ ...newClass, date_fin: e.target.value });
                        setErrors({ ...errors, date_fin: "" });
                      }}
                      className={errors.date_fin ? "border-destructive" : ""}
                    />
                    {errors.date_fin && <p className="text-sm text-destructive mt-1">{errors.date_fin}</p>}
                  </div>
                  <Button onClick={handleCreateClass} className="w-full">
                    Créer la classe
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Inscrire des stagiaires
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inscrire des stagiaires</DialogTitle>
                <DialogDescription>
                  Sélectionnez une classe et ajoutez des stagiaires
                </DialogDescription>
              </DialogHeader>
              <InscriptionForm classeId={""} onSuccess={loadClasses} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Aucune classe</h3>
            <p className="text-muted-foreground">
              Commencez par créer un programme, puis ajoutez des classes.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/programmes')}>
              Voir les programmes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classe) => (
            <Card 
              key={classe.id} 
              className="transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => navigate(`/classes/${classe.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{classe.nom}</CardTitle>
                <CardDescription>
                  {classe.programmes?.titre || "Programme non défini"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="outline">{classe.sous_code}</Badge>
                  {classe.date_debut && (
                    <div className="text-sm">
                      <span className="font-medium">Période:</span>{" "}
                      {new Date(classe.date_debut).toLocaleDateString("fr-FR")}
                      {classe.date_fin &&
                        ` - ${new Date(classe.date_fin).toLocaleDateString(
                          "fr-FR"
                        )}`}
                    </div>
                  )}
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/modules?classe=${classe.id}`);
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Gérer les modules
                    </Button>
                    {canManageClass(classe) && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClass(classe);
                            setEditDialogOpen(true);
                          }}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClass(classe);
                            setDeleteDialogOpen(true);
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la classe</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la classe
            </DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_nom">Nom de la classe *</Label>
                <Input
                  id="edit_nom"
                  value={selectedClass.nom}
                  onChange={(e) => {
                    setSelectedClass({ ...selectedClass, nom: e.target.value });
                    setErrors({ ...errors, nom: "" });
                  }}
                  className={errors.nom ? "border-destructive" : ""}
                />
                {errors.nom && <p className="text-sm text-destructive mt-1">{errors.nom}</p>}
              </div>
              <div>
                <Label htmlFor="edit_sous_code">Sous-code *</Label>
                <Input
                  id="edit_sous_code"
                  value={selectedClass.sous_code}
                  onChange={(e) => {
                    setSelectedClass({ ...selectedClass, sous_code: e.target.value });
                    setErrors({ ...errors, sous_code: "" });
                  }}
                  className={errors.sous_code ? "border-destructive" : ""}
                />
                {errors.sous_code && <p className="text-sm text-destructive mt-1">{errors.sous_code}</p>}
              </div>
              <div>
                <Label htmlFor="edit_programme">Programme *</Label>
                <Select
                  value={selectedClass.programme_id}
                  onValueChange={(value) => {
                    setSelectedClass({ ...selectedClass, programme_id: value });
                    setErrors({ ...errors, programme_id: "" });
                  }}
                >
                  <SelectTrigger className={errors.programme_id ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.code} - {prog.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.programme_id && <p className="text-sm text-destructive mt-1">{errors.programme_id}</p>}
              </div>
              <div>
                <Label htmlFor="edit_date_debut">Date de début</Label>
                <Input
                  id="edit_date_debut"
                  type="date"
                  value={selectedClass.date_debut || ""}
                  onChange={(e) => {
                    setSelectedClass({ ...selectedClass, date_debut: e.target.value });
                    setErrors({ ...errors, date_debut: "" });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="edit_date_fin">Date de fin</Label>
                <Input
                  id="edit_date_fin"
                  type="date"
                  value={selectedClass.date_fin || ""}
                  onChange={(e) => {
                    setSelectedClass({ ...selectedClass, date_fin: e.target.value });
                    setErrors({ ...errors, date_fin: "" });
                  }}
                  className={errors.date_fin ? "border-destructive" : ""}
                />
                {errors.date_fin && <p className="text-sm text-destructive mt-1">{errors.date_fin}</p>}
              </div>
              <Button onClick={handleEditClass} className="w-full">
                Enregistrer les modifications
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la classe "{selectedClass?.nom}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Classes;