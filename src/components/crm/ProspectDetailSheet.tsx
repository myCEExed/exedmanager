import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar, 
  MessageSquare, Activity, XCircle, TrendingUp, Plus
} from "lucide-react";
import { getSourceLabel } from "./ProspectSourcesSelect";
import { SuggestiveInput } from "./SuggestiveInput";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface ModuleCatalogue {
  id: string;
  titre: string;
}

interface ProspectAction {
  id: string;
  type_action: string;
  date_action: string;
  responsable: string | null;
  commentaire: string | null;
  resultat: string | null;
  created_at: string;
}

interface ProspectCommentaire {
  id: string;
  contenu: string;
  cible_formation: string | null;
  created_at: string;
}

interface ProspectDetailSheetProps {
  prospect: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  programmes: Programme[];
  modules: ModuleCatalogue[];
}

const NIVEAU_INTERET_OPTIONS = [
  { value: "non_defini", label: "Non défini", color: "bg-gray-100 text-gray-800" },
  { value: "peu_interesse", label: "Peu intéressé", color: "bg-red-100 text-red-800" },
  { value: "moyennement_interesse", label: "Moyennement intéressé", color: "bg-amber-100 text-amber-800" },
  { value: "tres_interesse", label: "Très intéressé", color: "bg-green-100 text-green-800" },
];

const ACTION_TYPES = [
  { value: "appel_telephonique", label: "Appel Téléphonique" },
  { value: "mailing", label: "Mailing" },
  { value: "rdv_visioconference", label: "Rendez-vous en visioconférence" },
  { value: "rdv_physique", label: "Rendez-vous physique" },
];

const getActionLabel = (value: string): string => {
  const action = ACTION_TYPES.find(a => a.value === value);
  return action ? action.label : value;
};

export const ProspectDetailSheet = ({
  prospect,
  open,
  onOpenChange,
  onUpdate,
  programmes,
  modules,
}: ProspectDetailSheetProps) => {
  const { user } = useAuth();
  const [niveauInteret, setNiveauInteret] = useState(prospect?.niveau_interet || "non_defini");
  const [showDownDialog, setShowDownDialog] = useState(false);
  const [downRaison, setDownRaison] = useState("");
  const [comments, setComments] = useState<ProspectCommentaire[]>([]);
  const [actions, setActions] = useState<ProspectAction[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newCommentCible, setNewCommentCible] = useState("");
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({
    type_action: "",
    responsable: "",
    commentaire: "",
    resultat: "",
  });
  const [existingResponsables, setExistingResponsables] = useState<string[]>([]);
  const [existingCibles, setExistingCibles] = useState<string[]>([]);

  useEffect(() => {
    if (prospect && open) {
      setNiveauInteret(prospect.niveau_interet || "non_defini");
      fetchCommentsAndActions();
    }
  }, [prospect, open]);

  const fetchCommentsAndActions = async () => {
    if (!prospect) return;

    const [commentsRes, actionsRes, responsablesRes, ciblesRes] = await Promise.all([
      supabase
        .from("prospect_commentaires")
        .select("*")
        .eq("prospect_id", prospect.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("prospect_actions")
        .select("*")
        .eq("prospect_id", prospect.id)
        .order("date_action", { ascending: false }),
      supabase
        .from("prospect_actions")
        .select("responsable")
        .not("responsable", "is", null),
      supabase
        .from("prospect_commentaires")
        .select("cible_formation")
        .not("cible_formation", "is", null),
    ]);

    if (commentsRes.data) setComments(commentsRes.data);
    if (actionsRes.data) setActions(actionsRes.data);
    
    // Extract unique responsables and cibles
    if (responsablesRes.data) {
      const uniqueResp = [...new Set(responsablesRes.data.map(r => r.responsable).filter(Boolean))];
      setExistingResponsables(uniqueResp as string[]);
    }
    if (ciblesRes.data) {
      const uniqueCibles = [...new Set(ciblesRes.data.map(c => c.cible_formation).filter(Boolean))];
      setExistingCibles(uniqueCibles as string[]);
    }
  };

  const handleNiveauInteretChange = async (value: string) => {
    setNiveauInteret(value);
    try {
      const { error } = await supabase
        .from("prospects")
        .update({ niveau_interet: value })
        .eq("id", prospect.id);

      if (error) throw error;
      toast.success("Niveau d'intérêt mis à jour");
      onUpdate();
    } catch (error) {
      console.error("Error updating niveau_interet:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleMarkAsDown = async () => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          is_down: true,
          down_raison: downRaison,
          down_date: new Date().toISOString(),
          statut: "perdu",
        })
        .eq("id", prospect.id);

      if (error) throw error;
      toast.success("Prospect marqué comme perdu");
      setShowDownDialog(false);
      setDownRaison("");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking prospect as down:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleReactivate = async () => {
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          is_down: false,
          down_raison: null,
          down_date: null,
          statut: "nouveau",
        })
        .eq("id", prospect.id);

      if (error) throw error;
      toast.success("Prospect réactivé");
      onUpdate();
    } catch (error) {
      console.error("Error reactivating prospect:", error);
      toast.error("Erreur lors de la réactivation");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase.from("prospect_commentaires").insert({
        prospect_id: prospect.id,
        contenu: newComment,
        cible_formation: newCommentCible || null,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success("Commentaire ajouté");
      setNewComment("");
      setNewCommentCible("");
      fetchCommentsAndActions();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire");
    }
  };

  const handleAddAction = async () => {
    if (!newAction.type_action) {
      toast.error("Veuillez sélectionner un type d'action");
      return;
    }

    try {
      const { error } = await supabase.from("prospect_actions").insert({
        prospect_id: prospect.id,
        type_action: newAction.type_action,
        responsable: newAction.responsable || null,
        commentaire: newAction.commentaire || null,
        resultat: newAction.resultat || null,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success("Action commerciale ajoutée");
      setNewAction({ type_action: "", responsable: "", commentaire: "", resultat: "" });
      setShowAddAction(false);
      fetchCommentsAndActions();
    } catch (error) {
      console.error("Error adding action:", error);
      toast.error("Erreur lors de l'ajout de l'action");
    }
  };

  const getNiveauInteretBadge = (niveau: string) => {
    const option = NIVEAU_INTERET_OPTIONS.find(o => o.value === niveau);
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge variant="secondary">Non défini</Badge>
    );
  };

  const getProgressColor = () => {
    if (prospect?.is_down) return "bg-gray-400";
    switch (niveauInteret) {
      case "peu_interesse": return "bg-red-500";
      case "moyennement_interesse": return "bg-amber-500";
      case "tres_interesse": return "bg-green-500";
      default: return "bg-gray-300";
    }
  };

  if (!prospect) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">
                  {prospect.prenom} {prospect.nom}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Créé le {format(new Date(prospect.created_at), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              {prospect.is_down ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Perdu
                </Badge>
              ) : getNiveauInteretBadge(niveauInteret)}
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progression commerciale</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getProgressColor()}`}
                  style={{ 
                    width: prospect.is_down ? "100%" : 
                           niveauInteret === "peu_interesse" ? "33%" :
                           niveauInteret === "moyennement_interesse" ? "66%" :
                           niveauInteret === "tres_interesse" ? "100%" : "10%"
                  }}
                />
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Actions rapides */}
              <div className="flex gap-2 flex-wrap">
                {!prospect.is_down && (
                  <>
                    <Select value={niveauInteret} onValueChange={handleNiveauInteretChange}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Niveau d'intérêt" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEAU_INTERET_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDownDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Marquer Down
                    </Button>
                  </>
                )}
                {prospect.is_down && (
                  <Button variant="outline" size="sm" onClick={handleReactivate}>
                    Réactiver le prospect
                  </Button>
                )}
              </div>

              {prospect.is_down && prospect.down_raison && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-4">
                    <p className="text-sm text-destructive">
                      <strong>Raison :</strong> {prospect.down_raison}
                    </p>
                    {prospect.down_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Marqué le {format(new Date(prospect.down_date), "dd/MM/yyyy", { locale: fr })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="infos">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="infos">Informations</TabsTrigger>
                  <TabsTrigger value="comments">
                    Commentaires ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="actions">
                    Actions ({actions.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="infos" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Coordonnées</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{prospect.email || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{prospect.telephone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{prospect.entreprise || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{prospect.poste || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sources / Origine</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {(prospect.sources || []).map((s: string) => (
                          <Badge key={s} variant="outline">
                            {getSourceLabel(s)}
                          </Badge>
                        ))}
                        {(prospect.sources || []).length === 0 && (
                          <span className="text-sm text-muted-foreground">Non renseigné</span>
                        )}
                      </div>
                      {prospect.source_autre_commentaire && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {prospect.source_autre_commentaire}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Centres d'intérêt</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(prospect.interet_thematiques || []).length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Thématiques</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {prospect.interet_thematiques.map((t: string) => (
                              <Badge key={t} variant="secondary">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(prospect.interet_programme_ids || []).length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Programmes</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {prospect.interet_programme_ids.map((id: string) => {
                              const prog = programmes.find(p => p.id === id);
                              return prog ? (
                                <Badge key={id} variant="default">
                                  [{prog.code}] {prog.titre}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      {(prospect.interet_module_ids || []).length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Modules</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {prospect.interet_module_ids.map((id: string) => {
                              const mod = modules.find(m => m.id === id);
                              return mod ? (
                                <Badge key={id} variant="outline">{mod.titre}</Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      {(prospect.interet_thematiques || []).length === 0 &&
                       (prospect.interet_programme_ids || []).length === 0 &&
                       (prospect.interet_module_ids || []).length === 0 && (
                        <span className="text-sm text-muted-foreground">Aucun intérêt renseigné</span>
                      )}
                    </CardContent>
                  </Card>

                  {prospect.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Notes générales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{prospect.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ajouter un commentaire</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Cible de formation (optionnel)</Label>
                        <SuggestiveInput
                          value={newCommentCible}
                          onChange={setNewCommentCible}
                          suggestions={existingCibles}
                          placeholder="Ex: Formation leadership, Module Excel..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Commentaire</Label>
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Saisir un commentaire..."
                          rows={3}
                        />
                      </div>
                      <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="pt-4">
                          {comment.cible_formation && (
                            <Badge variant="outline" className="mb-2">
                              {comment.cible_formation}
                            </Badge>
                          )}
                          <p className="text-sm">{comment.contenu}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun commentaire
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  {!showAddAction ? (
                    <Button size="sm" onClick={() => setShowAddAction(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvelle action commerciale
                    </Button>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Nouvelle action commerciale</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-xs">Type d'action *</Label>
                          <Select 
                            value={newAction.type_action} 
                            onValueChange={(v) => setNewAction({...newAction, type_action: v})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Responsable de l'action</Label>
                          <SuggestiveInput
                            value={newAction.responsable}
                            onChange={(v) => setNewAction({...newAction, responsable: v})}
                            suggestions={existingResponsables}
                            placeholder="Qui a mené l'action..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Commentaire</Label>
                          <Textarea
                            value={newAction.commentaire}
                            onChange={(e) => setNewAction({...newAction, commentaire: e.target.value})}
                            placeholder="Détails de l'action..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Résultat</Label>
                          <Textarea
                            value={newAction.resultat}
                            onChange={(e) => setNewAction({...newAction, resultat: e.target.value})}
                            placeholder="Résultat de l'action..."
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddAction}>
                            Enregistrer
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setShowAddAction(false);
                              setNewAction({ type_action: "", responsable: "", commentaire: "", resultat: "" });
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-3">
                    {actions.map((action) => (
                      <Card key={action.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="default">
                              {getActionLabel(action.type_action)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(action.date_action), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {action.responsable && (
                            <p className="text-sm">
                              <strong>Par :</strong> {action.responsable}
                            </p>
                          )}
                          {action.commentaire && (
                            <p className="text-sm mt-1">{action.commentaire}</p>
                          )}
                          {action.resultat && (
                            <p className="text-sm mt-1 text-muted-foreground">
                              <strong>Résultat :</strong> {action.resultat}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {actions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune action commerciale
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDownDialog} onOpenChange={setShowDownDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer ce prospect comme perdu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le prospect ne donnera plus suite à cette prospection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label>Raison (optionnel)</Label>
            <Textarea
              value={downRaison}
              onChange={(e) => setDownRaison(e.target.value)}
              placeholder="Ex: Budget insuffisant, choix d'un concurrent..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsDown}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const getNiveauInteretLabel = (value: string): string => {
  const options = [
    { value: "non_defini", label: "Non défini" },
    { value: "peu_interesse", label: "Peu intéressé" },
    { value: "moyennement_interesse", label: "Moyennement intéressé" },
    { value: "tres_interesse", label: "Très intéressé" },
  ];
  const option = options.find(o => o.value === value);
  return option ? option.label : "Non défini";
};
