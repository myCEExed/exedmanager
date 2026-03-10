import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Filter, X, Plus, Save, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Programme {
  id: string;
  titre: string;
  code: string;
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

interface Evaluation {
  id: string;
  titre: string;
  type_evaluation: string;
  date_evaluation: string | null;
  note_max: number | null;
  coefficient: number | null;
  module_id: string;
  classe_id: string;
  module?: { titre: string; code: string };
  classe?: { nom: string; sous_code: string };
}

interface Note {
  id: string;
  evaluation_id: string;
  stagiaire_id: string;
  note: number | null;
  commentaire: string | null;
}

export function EnseignantNotesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [enseignantId, setEnseignantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  
  // Filters
  const [filterProgramme, setFilterProgramme] = useState<string>("all");
  const [filterClasse, setFilterClasse] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterStagiaire, setFilterStagiaire] = useState<string>("all");
  
  // Active evaluation for grading
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [editedNotes, setEditedNotes] = useState<Record<string, { valeur: string; commentaire: string }>>({});
  const [saving, setSaving] = useState(false);
  
  // New evaluation dialog
  const [showNewEvalDialog, setShowNewEvalDialog] = useState(false);
  const [newEvalData, setNewEvalData] = useState({
    titre: "",
    type_evaluation: "examen",
    date_evaluation: "",
    note_max: "20",
    coefficient: "1",
    module_id: "",
    classe_id: "",
  });

  // Load enseignant profile
  useEffect(() => {
    const loadEnseignant = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setEnseignantId(data.id);
      }
    };
    
    loadEnseignant();
  }, [user]);

  // Load assigned modules and their classes/programmes
  useEffect(() => {
    const loadAssignedData = async () => {
      if (!enseignantId) return;
      setLoading(true);
      
      try {
        // Get all confirmed affectations for this teacher
        const { data: affectations } = await supabase
          .from("affectations")
          .select(`
            module_id,
            modules (
              id,
              code,
              titre,
              classe_id,
              classes (
                id,
                nom,
                sous_code,
                programme_id,
                programmes (
                  id,
                  titre,
                  code
                )
              )
            )
          `)
          .eq("enseignant_id", enseignantId)
          .eq("confirmee", true);
        
        if (affectations) {
          // Extract unique modules, classes, and programmes
          const modulesMap = new Map<string, Module>();
          const classesMap = new Map<string, Classe>();
          const programmesMap = new Map<string, Programme>();
          
          affectations.forEach((a: any) => {
            if (a.modules && a.modules.classes && a.modules.classes.programmes) {
              const mod = a.modules;
              const cls = mod.classes;
              const prog = cls.programmes;
              
              modulesMap.set(mod.id, {
                id: mod.id,
                code: mod.code,
                titre: mod.titre,
                classe_id: mod.classe_id,
              });
              
              classesMap.set(cls.id, {
                id: cls.id,
                nom: cls.nom,
                sous_code: cls.sous_code,
                programme_id: cls.programme_id,
              });
              
              programmesMap.set(prog.id, {
                id: prog.id,
                titre: prog.titre,
                code: prog.code,
              });
            }
          });
          
          setModules(Array.from(modulesMap.values()));
          setClasses(Array.from(classesMap.values()));
          setProgrammes(Array.from(programmesMap.values()));
        }
      } catch (error) {
        console.error("Error loading assigned data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAssignedData();
  }, [enseignantId]);

  // Load evaluations for assigned modules
  useEffect(() => {
    const loadEvaluations = async () => {
      if (modules.length === 0) return;
      
      const moduleIds = modules.map(m => m.id);
      
      const { data } = await supabase
        .from("evaluations")
        .select(`
          *,
          modules:module_id (titre, code),
          classes:classe_id (nom, sous_code)
        `)
        .in("module_id", moduleIds)
        .order("date_evaluation", { ascending: false });
      
      if (data) {
        setEvaluations(data.map((e: any) => ({
          ...e,
          module: e.modules,
          classe: e.classes,
        })));
      }
    };
    
    loadEvaluations();
  }, [modules]);

  // Load stagiaires based on selected class
  useEffect(() => {
    const loadStagiaires = async () => {
      if (!filterClasse || filterClasse === "all") {
        setStagiaires([]);
        return;
      }
      
      const { data } = await supabase
        .from("inscriptions")
        .select(`
          stagiaires!inner (id, nom, prenom)
        `)
        .eq("classe_id", filterClasse);
      
      if (data) {
        const uniqueStagiaires = new Map<string, Stagiaire>();
        data.forEach((insc: any) => {
          if (insc.stagiaires && !uniqueStagiaires.has(insc.stagiaires.id)) {
            uniqueStagiaires.set(insc.stagiaires.id, insc.stagiaires);
          }
        });
        setStagiaires(Array.from(uniqueStagiaires.values()).sort((a, b) => 
          `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
        ));
      }
    };
    
    loadStagiaires();
  }, [filterClasse]);

  // Load notes when evaluation selected
  useEffect(() => {
    const loadNotes = async () => {
      if (!selectedEvaluation) return;
      
      const { data } = await supabase
        .from("notes_stagiaires")
        .select("id, evaluation_id, stagiaire_id, note, commentaire")
        .eq("evaluation_id", selectedEvaluation.id);
      
      const typedData: Note[] = (data || []).map((n: any) => ({
        id: n.id,
        evaluation_id: n.evaluation_id,
        stagiaire_id: n.stagiaire_id,
        note: n.note,
        commentaire: n.commentaire,
      }));
      
      setNotes(typedData);
      
      // Initialize edited notes
      const edited: Record<string, { valeur: string; commentaire: string }> = {};
      typedData.forEach((n) => {
        edited[n.stagiaire_id] = {
          valeur: n.note?.toString() || "",
          commentaire: n.commentaire || "",
        };
      });
      setEditedNotes(edited);
    };
    
    loadNotes();
  }, [selectedEvaluation]);

  // Filtered data
  const filteredClasses = useMemo(() => {
    if (filterProgramme === "all") return classes;
    return classes.filter(c => c.programme_id === filterProgramme);
  }, [classes, filterProgramme]);

  const filteredModules = useMemo(() => {
    if (filterClasse === "all") return modules;
    return modules.filter(m => m.classe_id === filterClasse);
  }, [modules, filterClasse]);

  const filteredEvaluations = useMemo(() => {
    let result = evaluations;
    
    if (filterProgramme !== "all") {
      const classeIds = filteredClasses.map(c => c.id);
      result = result.filter(e => classeIds.includes(e.classe_id));
    }
    if (filterClasse !== "all") {
      result = result.filter(e => e.classe_id === filterClasse);
    }
    if (filterModule !== "all") {
      result = result.filter(e => e.module_id === filterModule);
    }
    
    return result;
  }, [evaluations, filterProgramme, filterClasse, filterModule, filteredClasses]);

  const filteredStagiaires = useMemo(() => {
    if (filterStagiaire === "all") return stagiaires;
    return stagiaires.filter(s => s.id === filterStagiaire);
  }, [stagiaires, filterStagiaire]);

  const hasActiveFilters = filterProgramme !== "all" || filterClasse !== "all" || 
    filterModule !== "all" || filterStagiaire !== "all";

  const clearFilters = () => {
    setFilterProgramme("all");
    setFilterClasse("all");
    setFilterModule("all");
    setFilterStagiaire("all");
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedEvaluation) return;
    setSaving(true);
    
    try {
      const stagiaireIds = filteredStagiaires.map(s => s.id);
      
      for (const stagiaireId of stagiaireIds) {
        const edited = editedNotes[stagiaireId];
        if (!edited) continue;
        
        const noteValue = edited.valeur ? parseFloat(edited.valeur) : null;
        const existingNote = notes.find(n => n.stagiaire_id === stagiaireId);
        
        if (existingNote) {
          await supabase
            .from("notes_stagiaires")
            .update({
              note: noteValue,
              commentaire: edited.commentaire || null,
            })
            .eq("id", existingNote.id);
        } else if (noteValue !== null) {
          await supabase
            .from("notes_stagiaires")
            .insert({
              evaluation_id: selectedEvaluation.id,
              stagiaire_id: stagiaireId,
              note: noteValue,
              commentaire: edited.commentaire || null,
              type_source: "evaluation",
            });
        }
      }
      
      toast({
        title: "Notes enregistrées",
        description: "Les notes ont été sauvegardées avec succès.",
      });
      
      // Reload notes
      const { data } = await supabase
        .from("notes_stagiaires")
        .select("id, evaluation_id, stagiaire_id, note, commentaire")
        .eq("evaluation_id", selectedEvaluation.id);
      
      const typedData: Note[] = (data || []).map((n: any) => ({
        id: n.id,
        evaluation_id: n.evaluation_id,
        stagiaire_id: n.stagiaire_id,
        note: n.note,
        commentaire: n.commentaire,
      }));
      setNotes(typedData);
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Create new evaluation
  const handleCreateEvaluation = async () => {
    if (!newEvalData.titre || !newEvalData.module_id || !newEvalData.classe_id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("evaluations")
        .insert({
          titre: newEvalData.titre,
          type_evaluation: newEvalData.type_evaluation,
          date_evaluation: newEvalData.date_evaluation || null,
          note_max: parseFloat(newEvalData.note_max) || 20,
          coefficient: parseFloat(newEvalData.coefficient) || 1,
          module_id: newEvalData.module_id,
          classe_id: newEvalData.classe_id,
        });
      
      if (error) throw error;
      
      toast({
        title: "Évaluation créée",
        description: "L'évaluation a été créée avec succès.",
      });
      
      setShowNewEvalDialog(false);
      setNewEvalData({
        titre: "",
        type_evaluation: "examen",
        date_evaluation: "",
        note_max: "20",
        coefficient: "1",
        module_id: "",
        classe_id: "",
      });
      
      // Reload evaluations
      const moduleIds = modules.map(m => m.id);
      const { data } = await supabase
        .from("evaluations")
        .select(`
          *,
          modules:module_id (titre, code),
          classes:classe_id (nom, sous_code)
        `)
        .in("module_id", moduleIds)
        .order("date_evaluation", { ascending: false });
      
      if (data) {
        setEvaluations(data.map((e: any) => ({
          ...e,
          module: e.modules,
          classe: e.classes,
        })));
      }
    } catch (error) {
      console.error("Error creating evaluation:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>Aucun module ne vous est affecté.</p>
          <p className="text-sm mt-2">
            Contactez l'administration pour être affecté à des modules.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/30 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select value={filterProgramme} onValueChange={(v) => {
          setFilterProgramme(v);
          setFilterClasse("all");
          setFilterModule("all");
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Programme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les programmes</SelectItem>
            {programmes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} - {p.titre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterClasse} onValueChange={(v) => {
          setFilterClasse(v);
          setFilterModule("all");
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {filteredClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.sous_code} - {c.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modules</SelectItem>
            {filteredModules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.code} - {m.titre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedEvaluation && (
          <Select value={filterStagiaire} onValueChange={setFilterStagiaire}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Stagiaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les stagiaires</SelectItem>
              {stagiaires.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.prenom} {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      <Tabs defaultValue="evaluations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evaluations">
            <ClipboardList className="h-4 w-4 mr-2" />
            Évaluations
          </TabsTrigger>
          <TabsTrigger value="saisie" disabled={!selectedEvaluation}>
            <FileText className="h-4 w-4 mr-2" />
            Saisie des Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Liste des évaluations</h3>
            <Dialog open={showNewEvalDialog} onOpenChange={setShowNewEvalDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle évaluation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une évaluation</DialogTitle>
                  <DialogDescription>
                    Créez une nouvelle évaluation pour un de vos modules.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Titre *</Label>
                    <Input
                      value={newEvalData.titre}
                      onChange={(e) => setNewEvalData({ ...newEvalData, titre: e.target.value })}
                      placeholder="Ex: Examen final"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newEvalData.type_evaluation}
                        onValueChange={(v) => setNewEvalData({ ...newEvalData, type_evaluation: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="examen">Examen</SelectItem>
                          <SelectItem value="controle">Contrôle continu</SelectItem>
                          <SelectItem value="projet">Projet</SelectItem>
                          <SelectItem value="oral">Oral</SelectItem>
                          <SelectItem value="tp">TP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newEvalData.date_evaluation}
                        onChange={(e) => setNewEvalData({ ...newEvalData, date_evaluation: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Module *</Label>
                      <Select
                        value={newEvalData.module_id}
                        onValueChange={(v) => {
                          const mod = modules.find(m => m.id === v);
                          setNewEvalData({ 
                            ...newEvalData, 
                            module_id: v,
                            classe_id: mod?.classe_id || "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.code} - {m.titre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Classe *</Label>
                      <Select
                        value={newEvalData.classe_id}
                        onValueChange={(v) => setNewEvalData({ ...newEvalData, classe_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Note max</Label>
                      <Input
                        type="number"
                        value={newEvalData.note_max}
                        onChange={(e) => setNewEvalData({ ...newEvalData, note_max: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Coefficient</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newEvalData.coefficient}
                        onChange={(e) => setNewEvalData({ ...newEvalData, coefficient: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewEvalDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateEvaluation}>
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {filteredEvaluations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune évaluation trouvée
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note max</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.titre}</TableCell>
                      <TableCell className="capitalize">{evaluation.type_evaluation}</TableCell>
                      <TableCell>{evaluation.module?.code} - {evaluation.module?.titre}</TableCell>
                      <TableCell>{evaluation.classe?.sous_code} - {evaluation.classe?.nom}</TableCell>
                      <TableCell>
                        {evaluation.date_evaluation 
                          ? format(new Date(evaluation.date_evaluation), "d MMM yyyy", { locale: fr })
                          : "-"}
                      </TableCell>
                      <TableCell>{evaluation.note_max || 20}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEvaluation(evaluation);
                            setFilterClasse(evaluation.classe_id);
                          }}
                        >
                          Saisir les notes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saisie" className="space-y-4">
          {selectedEvaluation && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedEvaluation.titre}</CardTitle>
                  <CardDescription>
                    {selectedEvaluation.module?.code} - {selectedEvaluation.module?.titre} | 
                    {selectedEvaluation.classe?.sous_code} - {selectedEvaluation.classe?.nom}
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotes} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Enregistrer les notes"}
                </Button>
              </div>

              {filteredStagiaires.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Aucun stagiaire inscrit dans cette classe
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stagiaire</TableHead>
                        <TableHead className="w-[150px]">Note / {selectedEvaluation.note_max || 20}</TableHead>
                        <TableHead>Commentaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStagiaires.map((stagiaire) => (
                        <TableRow key={stagiaire.id}>
                          <TableCell className="font-medium">
                            {stagiaire.prenom} {stagiaire.nom}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={selectedEvaluation.note_max || 20}
                              step="0.5"
                              value={editedNotes[stagiaire.id]?.valeur || ""}
                              onChange={(e) => setEditedNotes({
                                ...editedNotes,
                                [stagiaire.id]: {
                                  ...editedNotes[stagiaire.id],
                                  valeur: e.target.value,
                                  commentaire: editedNotes[stagiaire.id]?.commentaire || "",
                                },
                              })}
                              className="w-[100px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={editedNotes[stagiaire.id]?.commentaire || ""}
                              onChange={(e) => setEditedNotes({
                                ...editedNotes,
                                [stagiaire.id]: {
                                  ...editedNotes[stagiaire.id],
                                  valeur: editedNotes[stagiaire.id]?.valeur || "",
                                  commentaire: e.target.value,
                                },
                              })}
                              rows={1}
                              placeholder="Commentaire optionnel"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
