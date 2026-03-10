import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Eye, Trash2, BarChart3, FileSpreadsheet, Flame, Snowflake, Users, CheckCircle, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DeployerEnqueteDialog } from "./DeployerEnqueteDialog";
import { EnqueteResultatsDialog } from "./EnqueteResultatsDialog";
import { Enquete, TYPE_ENQUETE_LABELS } from "./types";
import { useExcelExport } from "@/hooks/useExcelExport";

interface EnquetesManagerProps {
  programmeId?: string;
  classeId?: string;
}

interface EnqueteWithStats extends Enquete {
  totalInscrits: number;
  totalRepondants: number;
  classe?: { nom: string; sous_code: string };
  module?: { code: string; titre: string };
}

export function EnquetesManager({ programmeId, classeId }: EnquetesManagerProps) {
  const { exportToExcel } = useExcelExport();
  const [enquetes, setEnquetes] = useState<EnqueteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enqueteToDelete, setEnqueteToDelete] = useState<EnqueteWithStats | null>(null);
  const [selectedEnquete, setSelectedEnquete] = useState<EnqueteWithStats | null>(null);
  const [resultatsDialogOpen, setResultatsDialogOpen] = useState(false);

  useEffect(() => {
    loadEnquetes();
  }, [programmeId, classeId]);

  const loadEnquetes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("enquetes")
        .select(`
          *,
          classes(nom, sous_code),
          modules(code, titre)
        `)
        .order("created_at", { ascending: false });

      if (programmeId) {
        query = query.eq("programme_id", programmeId);
      }
      if (classeId) {
        query = query.eq("classe_id", classeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get response counts for each enquete
      const enquetesWithStats = await Promise.all((data || []).map(async (enquete) => {
        // Get total inscrits for the classe
        let totalInscrits = 0;
        if (enquete.classe_id) {
          const { count } = await supabase
            .from("inscriptions")
            .select("*", { count: "exact", head: true })
            .eq("classe_id", enquete.classe_id);
          totalInscrits = count || 0;
        }

        // Get completed responses
        const { count: totalRepondants } = await supabase
          .from("enquetes_reponses")
          .select("*", { count: "exact", head: true })
          .eq("enquete_id", enquete.id)
          .not("completed_at", "is", null);

        return {
          ...enquete,
          totalInscrits,
          totalRepondants: totalRepondants || 0,
          classe: enquete.classes,
          module: enquete.modules
        } as EnqueteWithStats;
      }));

      setEnquetes(enquetesWithStats);
    } catch (error) {
      console.error("Error loading enquetes:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (enquete: EnqueteWithStats) => {
    try {
      const { error } = await supabase
        .from("enquetes")
        .update({ est_active: !enquete.est_active })
        .eq("id", enquete.id);

      if (error) throw error;
      toast.success(enquete.est_active ? "Enquête désactivée" : "Enquête activée");
      loadEnquetes();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteEnquete = async () => {
    if (!enqueteToDelete) return;

    try {
      const { error } = await supabase
        .from("enquetes")
        .delete()
        .eq("id", enqueteToDelete.id);

      if (error) throw error;

      toast.success("Enquête supprimée");
      setDeleteDialogOpen(false);
      setEnqueteToDelete(null);
      loadEnquetes();
    } catch (error) {
      console.error("Error deleting enquete:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const exportResultats = async (enquete: EnqueteWithStats) => {
    try {
      // Get questions
      const { data: questions } = await supabase
        .from("enquetes_questions")
        .select("*")
        .eq("enquete_id", enquete.id)
        .order("ordre");

      if (!questions) return;

      // Get responses with details
      const { data: reponses } = await supabase
        .from("enquetes_reponses")
        .select(`
          *,
          stagiaires(nom, prenom, email),
          enquetes_reponses_details(*)
        `)
        .eq("enquete_id", enquete.id)
        .not("completed_at", "is", null);

      if (!reponses || reponses.length === 0) {
        toast.error("Aucune réponse à exporter");
        return;
      }

      // Build export data
      const exportData = reponses.map((reponse: any) => {
        const row: any = {
          "Nom": reponse.stagiaires?.nom || "",
          "Prénom": reponse.stagiaires?.prenom || "",
          "Email": reponse.stagiaires?.email || "",
          "Date réponse": format(new Date(reponse.completed_at), "dd/MM/yyyy HH:mm")
        };

        questions.forEach((q, idx) => {
          const detail = reponse.enquetes_reponses_details?.find(
            (d: any) => d.question_id === q.id
          );
          
          if (detail) {
            if (detail.valeur_numerique !== null) {
              row[`Q${idx + 1}: ${q.question.slice(0, 50)}`] = detail.valeur_numerique;
            } else if (detail.valeur_json) {
              row[`Q${idx + 1}: ${q.question.slice(0, 50)}`] = JSON.stringify(detail.valeur_json);
            } else {
              row[`Q${idx + 1}: ${q.question.slice(0, 50)}`] = detail.valeur_texte || "";
            }
          } else {
            row[`Q${idx + 1}: ${q.question.slice(0, 50)}`] = "";
          }
        });

        return row;
      });

      exportToExcel(exportData, `Resultats_${enquete.titre.replace(/\s+/g, '_')}`);
      toast.success("Export réussi");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Erreur lors de l'export");
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Enquêtes déployées</h3>
          <p className="text-sm text-muted-foreground">
            {enquetes.length} enquête(s) configurée(s)
          </p>
        </div>
        <DeployerEnqueteDialog
          programmeId={programmeId}
          classeId={classeId}
          onDeploy={loadEnquetes}
        />
      </div>

      {enquetes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune enquête déployée</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquête</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Participation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquetes.map((enquete) => {
                const tauxParticipation = enquete.totalInscrits > 0
                  ? Math.round((enquete.totalRepondants / enquete.totalInscrits) * 100)
                  : 0;

                return (
                  <TableRow key={enquete.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{enquete.titre}</p>
                        <p className="text-sm text-muted-foreground">
                          Créée le {format(new Date(enquete.created_at), "dd/MM/yyyy", { locale: fr })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={enquete.type_enquete === 'a_chaud' ? 'default' : 'secondary'}>
                        {enquete.type_enquete === 'a_chaud' ? (
                          <Flame className="h-3 w-3 mr-1" />
                        ) : (
                          <Snowflake className="h-3 w-3 mr-1" />
                        )}
                        {TYPE_ENQUETE_LABELS[enquete.type_enquete]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enquete.module ? (
                        <span className="text-sm">{enquete.module.code}</span>
                      ) : enquete.classe ? (
                        <span className="text-sm">{enquete.classe.nom}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Programme</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{enquete.totalRepondants}/{enquete.totalInscrits}</span>
                          <span className="text-muted-foreground">({tauxParticipation}%)</span>
                        </div>
                        <Progress value={tauxParticipation} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {enquete.est_active ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedEnquete(enquete);
                            setResultatsDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir les résultats
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportResultats(enquete)}>
                            <Download className="h-4 w-4 mr-2" />
                            Exporter Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(enquete)}>
                            {enquete.est_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activer
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setEnqueteToDelete(enquete);
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
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedEnquete && (
        <EnqueteResultatsDialog
          enquete={selectedEnquete}
          open={resultatsDialogOpen}
          onOpenChange={setResultatsDialogOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette enquête ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'enquête et toutes les réponses associées seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEnquete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
