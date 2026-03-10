import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Edit, Trash2, Copy, Search, FileText, CheckCircle, XCircle, Flame, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ModeleEnqueteEditor } from "./ModeleEnqueteEditor";
import { ModeleEnquete, TypeEnquete, TYPE_ENQUETE_LABELS } from "./types";

export function ModelesEnqueteList() {
  const [modeles, setModeles] = useState<ModeleEnquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modeleToDelete, setModeleToDelete] = useState<ModeleEnquete | null>(null);

  useEffect(() => {
    loadModeles();
  }, []);

  const loadModeles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("modeles_enquete")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModeles((data || []) as ModeleEnquete[]);
    } catch (error) {
      console.error("Error loading modeles:", error);
      toast.error("Erreur lors du chargement des modèles");
    } finally {
      setLoading(false);
    }
  };

  const duplicateModele = async (modele: ModeleEnquete) => {
    try {
      // Create new modele
      const { data: newModele, error: modeleError } = await supabase
        .from("modeles_enquete")
        .insert({
          nom: `${modele.nom} (copie)`,
          description: modele.description,
          type_enquete: modele.type_enquete,
          est_actif: true
        })
        .select()
        .single();

      if (modeleError) throw modeleError;

      // Copy questions
      const { data: questions, error: questionsError } = await supabase
        .from("modeles_enquete_questions")
        .select("*")
        .eq("modele_id", modele.id);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          modele_id: newModele.id,
          question: q.question,
          type_question: q.type_question,
          options: q.options,
          obligatoire: q.obligatoire,
          ordre: q.ordre,
          condition_question_id: null, // Reset conditions for simplicity
          condition_valeur: null
        }));

        await supabase.from("modeles_enquete_questions").insert(newQuestions);
      }

      toast.success("Modèle dupliqué");
      loadModeles();
    } catch (error) {
      console.error("Error duplicating modele:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const deleteModele = async () => {
    if (!modeleToDelete) return;

    try {
      const { error } = await supabase
        .from("modeles_enquete")
        .delete()
        .eq("id", modeleToDelete.id);

      if (error) throw error;

      toast.success("Modèle supprimé");
      setDeleteDialogOpen(false);
      setModeleToDelete(null);
      loadModeles();
    } catch (error) {
      console.error("Error deleting modele:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredModeles = modeles.filter(m => {
    const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || m.type_enquete === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type d'enquête" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="a_chaud">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  À chaud
                </div>
              </SelectItem>
              <SelectItem value="a_froid">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-500" />
                  À froid
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ModeleEnqueteEditor onSave={loadModeles} />
      </div>

      {filteredModeles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun modèle d'enquête</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modèle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModeles.map((modele) => (
                <TableRow key={modele.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{modele.nom}</p>
                      {modele.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {modele.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={modele.type_enquete === 'a_chaud' ? 'default' : 'secondary'}>
                      {modele.type_enquete === 'a_chaud' ? (
                        <Flame className="h-3 w-3 mr-1" />
                      ) : (
                        <Snowflake className="h-3 w-3 mr-1" />
                      )}
                      {TYPE_ENQUETE_LABELS[modele.type_enquete]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {modele.est_actif ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(modele.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ModeleEnqueteEditor
                          modele={modele}
                          onSave={loadModeles}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem onClick={() => duplicateModele(modele)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setModeleToDelete(modele);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le modèle "{modeleToDelete?.nom}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteModele} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
