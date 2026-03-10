import { useEffect, useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, Trash2, FileText } from "lucide-react";
import { useExcelExport } from "@/hooks/useExcelExport";
import { Badge } from "@/components/ui/badge";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { ReleveNotesDialog } from "@/components/notes/ReleveNotesDialog";
import { EnseignantNotesTab } from "@/components/enseignants/EnseignantNotesTab";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Evaluation {
  id: string;
  module_id: string;
  classe_id: string;
  type_evaluation: string;
  titre: string;
  coefficient: number;
  note_max: number;
  date_evaluation: string | null;
  modules: { code: string; titre: string };
  classes: { nom: string; programme_id: string };
}

interface Note {
  id: string;
  evaluation_id: string;
  stagiaire_id: string;
  note: number | null;
  commentaire: string | null;
  stagiaires: { nom: string; prenom: string; email: string };
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

interface Module {
  id: string;
  code: string;
  titre: string;
  classe_id: string;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
}

export default function Notes() {
  const { user } = useAuth();
  const { role, canManageScolarite, canEditSection } = useUserRole();
  const canManage = canManageScolarite();
  const isEnseignant = role === "enseignant";
  const canEdit = canEditSection("notes");
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();
  
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editedNotes, setEditedNotes] = useState<Record<string, { note: string; commentaire: string }>>({});
  const [classes, setClasses] = useState<Classe[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"evaluations" | "notes">("evaluations");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Filters
  const [filterProgramme, setFilterProgramme] = useState<string>("all");
  const [filterClasse, setFilterClasse] = useState<string>("all");
  const [filterStagiaire, setFilterStagiaire] = useState<string>("all");
  
  // Relevé de notes dialog
  const [releveDialogOpen, setReleveDialogOpen] = useState(false);
  const [selectedStagiaireForReleve, setSelectedStagiaireForReleve] = useState<Stagiaire | null>(null);
  
  const [formData, setFormData] = useState({
    classe_id: "",
    module_id: "",
    type_evaluation: "intermediaire",
    titre: "",
    coefficient: "1",
    note_max: "20",
    date_evaluation: "",
  });

  useEffect(() => {
    if (user && canManage) {
      loadData();
    }
  }, [user, canManage]);

  // Update stagiaires list when filters change
  useEffect(() => {
    if (!canManage) return;
    loadStagiaires();
  }, [filterProgramme, filterClasse, canManage]);

  const loadData = async () => {
    await Promise.all([loadProgrammes(), loadEvaluations(), loadClasses(), loadModules(), loadStagiaires()]);
  };

  const loadProgrammes = async () => {
    const { data } = await supabase.from("programmes").select("id, titre, code").order("titre");
    setProgrammes(data || []);
  };

  const loadEvaluations = async () => {
    const { data, error } = await supabase
      .from("evaluations")
      .select(`
        *,
        modules (code, titre),
        classes (nom, programme_id)
      `)
      .order("date_evaluation", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEvaluations(data || []);
    }
  };

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("id, nom, sous_code, programme_id").order("nom");
    setClasses(data || []);
  };

  const loadModules = async () => {
    const { data } = await supabase.from("modules").select("*").order("code");
    setModules(data || []);
  };

  const loadStagiaires = async () => {
    let query = supabase
      .from("inscriptions")
      .select(`
        stagiaire_id,
        classe_id,
        classes!inner (programme_id),
        stagiaires!inner (id, nom, prenom)
      `);
    
    if (filterClasse && filterClasse !== "all") {
      query = query.eq("classe_id", filterClasse);
    } else if (filterProgramme && filterProgramme !== "all") {
      query = query.eq("classes.programme_id", filterProgramme);
    }

    const { data } = await query;
    
    // Deduplicate stagiaires
    const uniqueStagiaires = new Map<string, Stagiaire>();
    (data || []).forEach((insc: any) => {
      if (insc.stagiaires && !uniqueStagiaires.has(insc.stagiaires.id)) {
        uniqueStagiaires.set(insc.stagiaires.id, {
          id: insc.stagiaires.id,
          nom: insc.stagiaires.nom,
          prenom: insc.stagiaires.prenom,
        });
      }
    });
    
    setStagiaires(Array.from(uniqueStagiaires.values()).sort((a, b) => 
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
    ));
  };

  // Filter evaluations based on selected filters
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      if (filterProgramme && filterProgramme !== "all" && e.classes.programme_id !== filterProgramme) {
        return false;
      }
      if (filterClasse && filterClasse !== "all" && e.classe_id !== filterClasse) {
        return false;
      }
      return true;
    });
  }, [evaluations, filterProgramme, filterClasse]);

  const loadNotes = async (evaluationId: string) => {
    const evaluation = evaluations.find(e => e.id === evaluationId);
    if (!evaluation) return;

    const { data: inscriptions, error: inscError } = await supabase
      .from("inscriptions")
      .select("stagiaire_id")
      .eq("classe_id", evaluation.classe_id);

    if (inscError) {
      toast({ title: "Erreur", description: inscError.message, variant: "destructive" });
      return;
    }

    const { data: existingNotes, error: notesError } = await supabase
      .from("notes_stagiaires")
      .select("stagiaire_id")
      .eq("evaluation_id", evaluationId);

    if (notesError) {
      toast({ title: "Erreur", description: notesError.message, variant: "destructive" });
      return;
    }

    const existingStagiaireIds = new Set((existingNotes || []).map((n) => n.stagiaire_id));

    const uniqueStagiaireIds = Array.from(
      new Set((inscriptions || []).map((i) => i.stagiaire_id))
    ).filter((stagiaireId) => !existingStagiaireIds.has(stagiaireId));

    const stagiairesToAdd = uniqueStagiaireIds.map((stagiaireId) => ({
      evaluation_id: evaluationId,
      stagiaire_id: stagiaireId,
      note: null,
      commentaire: null,
      type_source: "evaluation",
    }));

    if (stagiairesToAdd.length > 0) {
      const { error: insertError } = await supabase.from("notes_stagiaires").insert(stagiairesToAdd);

      if (insertError && !String(insertError.message || "").includes("duplicate key")) {
        toast({ title: "Erreur", description: insertError.message, variant: "destructive" });
        return;
      }
    }

    const { data, error } = await supabase
      .from("notes_stagiaires")
      .select(`
        *,
        stagiaires (nom, prenom, email)
      `)
      .eq("evaluation_id", evaluationId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      let filteredData = data || [];
      
      // Filter by stagiaire if selected
      if (filterStagiaire && filterStagiaire !== "all") {
        filteredData = filteredData.filter((n) => n.stagiaire_id === filterStagiaire);
      }
      
      setNotes(filteredData);
      const initialEdited: Record<string, { note: string; commentaire: string }> = {};
      filteredData.forEach((note) => {
        initialEdited[note.id] = {
          note: note.note !== null ? String(note.note) : "",
          commentaire: note.commentaire || "",
        };
      });
      setEditedNotes(initialEdited);
    }
  };

  const handleNoteChange = (noteId: string, field: "note" | "commentaire", value: string) => {
    setEditedNotes((prev) => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        [field]: value,
      },
    }));
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    let hasError = false;

    for (const note of notes) {
      const edited = editedNotes[note.id];
      if (!edited) continue;

      const noteValue = edited.note.trim() === "" ? null : parseFloat(edited.note);
      
      const { error } = await supabase
        .from("notes_stagiaires")
        .update({
          note: noteValue,
          commentaire: edited.commentaire || null,
        })
        .eq("id", note.id);

      if (error) {
        hasError = true;
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        break;
      }
    }

    setSavingNotes(false);

    if (!hasError) {
      toast({ title: "Succès", description: "Notes enregistrées avec succès" });
      if (selectedEvaluation) {
        loadNotes(selectedEvaluation);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("evaluations").insert({
      classe_id: formData.classe_id,
      module_id: formData.module_id,
      type_evaluation: formData.type_evaluation,
      titre: formData.titre,
      coefficient: parseFloat(formData.coefficient),
      note_max: parseFloat(formData.note_max),
      date_evaluation: formData.date_evaluation || null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Évaluation créée avec succès" });
      setDialogOpen(false);
      loadEvaluations();
      resetForm();
    }
  };

  const handleExportNotes = () => {
    if (!selectedEvaluation) return;
    
    const evaluation = evaluations.find(e => e.id === selectedEvaluation);
    if (!evaluation) return;

    const exportData = notes.map(note => ({
      Nom: note.stagiaires.nom,
      Prénom: note.stagiaires.prenom,
      Email: note.stagiaires.email,
      Note: note.note !== null ? note.note : "Non saisie",
      "Note Max": evaluation.note_max,
      Commentaire: note.commentaire || "",
    }));

    exportToExcel(exportData, `notes_${evaluation.titre}`, "Notes");
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    const evaluation = evaluations.find((e) => e.id === evaluationId);
    if (!evaluation) return;

    if (evaluation.date_evaluation && new Date(evaluation.date_evaluation) < new Date()) {
      toast({
        title: "Suppression impossible",
        description: "Vous ne pouvez pas supprimer une évaluation passée.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Évaluation supprimée avec succès" });
      loadEvaluations();
    }
  };

  const resetForm = () => {
    setFormData({
      classe_id: "",
      module_id: "",
      type_evaluation: "intermediaire",
      titre: "",
      coefficient: "1",
      note_max: "20",
      date_evaluation: "",
    });
  };

  const handleClearFilters = () => {
    setFilterProgramme("all");
    setFilterClasse("all");
    setFilterStagiaire("all");
  };

  const handleProgrammeChange = (value: string) => {
    setFilterProgramme(value);
    // Reset classe and stagiaire filters when programme changes
    if (value !== filterProgramme) {
      setFilterClasse("all");
      setFilterStagiaire("all");
    }
  };

  const handleClasseChange = (value: string) => {
    setFilterClasse(value);
    // Reset stagiaire filter when classe changes
    if (value !== filterClasse) {
      setFilterStagiaire("all");
    }
  };

  const handleOpenReleve = (stagiaire: Stagiaire) => {
    setSelectedStagiaireForReleve(stagiaire);
    setReleveDialogOpen(true);
  };

  if (!canManage && !isEnseignant) {
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

  if (isEnseignant) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground">
            Saisie des notes pour vos modules et classes affectés
          </p>
        </div>

        <EnseignantNotesTab />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Notes et Évaluations</h1>
          <p className="text-muted-foreground">
            Créez des évaluations et saisissez les notes des stagiaires
          </p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Évaluation
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une évaluation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Classe *</Label>
                  <Select
                    value={formData.classe_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        classe_id: value,
                        module_id: "",
                      })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.sous_code} - {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Module *</Label>
                  <Select
                    value={formData.module_id}
                    onValueChange={(value) => setFormData({ ...formData, module_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.filter(m => m.classe_id === formData.classe_id).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} - {m.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type_evaluation}
                    onValueChange={(value) => setFormData({ ...formData, type_evaluation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                      <SelectItem value="finale">Finale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Coefficient</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.coefficient}
                    onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note Max</Label>
                  <Input
                    type="number"
                    value={formData.note_max}
                    onChange={(e) => setFormData({ ...formData, note_max: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date d'évaluation</Label>
                <Input
                  type="datetime-local"
                  value={formData.date_evaluation}
                  onChange={(e) => setFormData({ ...formData, date_evaluation: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filtres */}
      <NotesFilters
        programmes={programmes}
        classes={classes}
        stagiaires={stagiaires}
        selectedProgramme={filterProgramme}
        selectedClasse={filterClasse}
        selectedStagiaire={filterStagiaire}
        onProgrammeChange={handleProgrammeChange}
        onClasseChange={handleClasseChange}
        onStagiaireChange={setFilterStagiaire}
        onClearFilters={handleClearFilters}
      />

      {/* Bouton relevé de notes si un stagiaire est sélectionné */}
      {filterStagiaire && filterStagiaire !== "all" && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    Stagiaire sélectionné : {stagiaires.find(s => s.id === filterStagiaire)?.prenom} {stagiaires.find(s => s.id === filterStagiaire)?.nom}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vous pouvez générer un relevé de notes consolidé ou détaillé
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  const stagiaire = stagiaires.find(s => s.id === filterStagiaire);
                  if (stagiaire) handleOpenReleve(stagiaire);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Générer un relevé
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "evaluations" | "notes")}>
        <TabsList>
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
          <TabsTrigger value="notes">Saisie des Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle>Liste des évaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coeff.</TableHead>
                    <TableHead>Note Max</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.titre}</TableCell>
                      <TableCell>{evaluation.classes.nom}</TableCell>
                      <TableCell>
                        {evaluation.modules.code} - {evaluation.modules.titre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={evaluation.type_evaluation === "finale" ? "default" : "secondary"}>
                          {evaluation.type_evaluation === "finale" ? "Finale" : "Intermédiaire"}
                        </Badge>
                      </TableCell>
                      <TableCell>{evaluation.coefficient}</TableCell>
                      <TableCell>{evaluation.note_max}</TableCell>
                      <TableCell>
                        {evaluation.date_evaluation
                          ? new Date(evaluation.date_evaluation).toLocaleDateString("fr-FR")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveTab("notes");
                              setSelectedEvaluation(evaluation.id);
                              loadNotes(evaluation.id);
                            }}
                          >
                            Voir les notes
                          </Button>
                          {(!evaluation.date_evaluation ||
                            new Date(evaluation.date_evaluation) > new Date()) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteEvaluation(evaluation.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEvaluations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucune évaluation trouvée
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Saisie des notes</CardTitle>
                  <CardDescription>
                    Sélectionnez une évaluation pour saisir les notes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedEvaluation && notes.length > 0 && (
                    <Button onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? "Enregistrement..." : "Enregistrer les notes"}
                    </Button>
                  )}
                  {selectedEvaluation && (
                    <Button onClick={handleExportNotes} variant="outline">
                      <FileDown className="mr-2 h-4 w-4" />
                      Exporter
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  value={selectedEvaluation || ""}
                  onValueChange={(value) => {
                    setSelectedEvaluation(value);
                    loadNotes(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une évaluation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEvaluations.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.titre} - {e.classes.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedEvaluation && notes.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucun stagiaire inscrit pour cette évaluation.
                  </p>
                )}

                {selectedEvaluation && notes.length > 0 && (
                  <ResponsiveTable>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stagiaire</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-32">Note</TableHead>
                        <TableHead>Commentaire</TableHead>
                        {filterStagiaire === "all" && <TableHead className="w-24">Relevé</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notes.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell>
                            {note.stagiaires.prenom} {note.stagiaires.nom}
                          </TableCell>
                          <TableCell>{note.stagiaires.email}</TableCell>
                          <TableCell>
                            {(() => {
                              const evaluation = evaluations.find((e) => e.id === selectedEvaluation);
                              const noteValue = editedNotes[note.id]?.note || "";

                              return (
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={evaluation?.note_max || 20}
                                    step="0.5"
                                    placeholder={`/ ${evaluation?.note_max || 20}`}
                                    value={noteValue}
                                    onChange={(e) => handleNoteChange(note.id, "note", e.target.value)}
                                    className="w-24"
                                  />
                                  {noteValue.trim() === "" && (
                                    <div className="text-xs text-muted-foreground">Non saisie</div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Commentaire..."
                              value={editedNotes[note.id]?.commentaire || ""}
                              onChange={(e) => handleNoteChange(note.id, "commentaire", e.target.value)}
                            />
                          </TableCell>
                          {filterStagiaire === "all" && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenReleve({
                                  id: note.stagiaire_id,
                                  nom: note.stagiaires.nom,
                                  prenom: note.stagiaires.prenom,
                                })}
                                title="Générer un relevé de notes"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </ResponsiveTable>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour relevé de notes */}
      {selectedStagiaireForReleve && (
        <ReleveNotesDialog
          open={releveDialogOpen}
          onOpenChange={setReleveDialogOpen}
          stagiaireId={selectedStagiaireForReleve.id}
          stagiaireNom={`${selectedStagiaireForReleve.prenom} ${selectedStagiaireForReleve.nom}`}
          programmeId={filterProgramme}
          classeId={filterClasse}
        />
      )}
    </div>
  );
}
