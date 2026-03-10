import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Rocket, Flame, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TypeEnquete, TYPE_ENQUETE_LABELS, ModeleEnquete } from "./types";

interface DeployerEnqueteDialogProps {
  programmeId?: string;
  classeId?: string;
  moduleId?: string;
  onDeploy: () => void;
  trigger?: React.ReactNode;
}

export function DeployerEnqueteDialog({ 
  programmeId, 
  classeId, 
  moduleId, 
  onDeploy,
  trigger 
}: DeployerEnqueteDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [modeles, setModeles] = useState<ModeleEnquete[]>([]);
  const [selectedModeleId, setSelectedModeleId] = useState<string>("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [typeEnquete, setTypeEnquete] = useState<TypeEnquete>("a_froid");
  const [dateDebut, setDateDebut] = useState<Date>(new Date());
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [estActive, setEstActive] = useState(true);

  // Load classes and modules for selection if not provided
  const [classes, setClasses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>(classeId || "");
  const [selectedModuleId, setSelectedModuleId] = useState<string>(moduleId || "");

  useEffect(() => {
    if (open) {
      loadModeles();
      if (!classeId) loadClasses();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClasseId && !moduleId) {
      loadModules();
    }
  }, [selectedClasseId]);

  const loadModeles = async () => {
    const { data, error } = await supabase
      .from("modeles_enquete")
      .select("*")
      .eq("est_actif", true)
      .order("nom");

    if (!error && data) {
      setModeles(data as ModeleEnquete[]);
    }
  };

  const loadClasses = async () => {
    let query = supabase.from("classes").select(`
      id, nom, sous_code,
      programmes(id, titre, code)
    `);

    if (programmeId) {
      query = query.eq("programme_id", programmeId);
    }

    const { data, error } = await query.order("nom");
    if (!error && data) {
      setClasses(data);
    }
  };

  const loadModules = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("id, code, titre")
      .eq("classe_id", selectedClasseId)
      .order("date_debut");

    if (!error && data) {
      setModules(data);
    }
  };

  const handleModeleChange = async (modeleId: string) => {
    setSelectedModeleId(modeleId);
    const modele = modeles.find(m => m.id === modeleId);
    if (modele) {
      setTypeEnquete(modele.type_enquete);
      if (!titre) setTitre(modele.nom);
    }
  };

  const handleDeploy = async () => {
    if (!selectedModeleId) {
      toast.error("Veuillez sélectionner un modèle");
      return;
    }

    if (!titre.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    const targetClasseId = classeId || selectedClasseId;
    const targetModuleId = moduleId || selectedModuleId;

    if (!targetClasseId && typeEnquete === 'a_chaud' && !targetModuleId) {
      toast.error("Veuillez sélectionner une classe ou un module");
      return;
    }

    setLoading(true);
    try {
      // Create enquete
      const { data: enquete, error: enqueteError } = await supabase
        .from("enquetes")
        .insert({
          titre,
          description,
          type_enquete: typeEnquete,
          modele_id: selectedModeleId,
          programme_id: programmeId,
          classe_id: targetClasseId || null,
          module_id: targetModuleId || null,
          date_debut: dateDebut.toISOString(),
          date_fin: dateFin?.toISOString() || null,
          est_active: estActive,
          created_by: user?.id
        })
        .select()
        .single();

      if (enqueteError) throw enqueteError;

      // Copy questions from modele
      const { data: modeleQuestions, error: questionsError } = await supabase
        .from("modeles_enquete_questions")
        .select("*")
        .eq("modele_id", selectedModeleId)
        .order("ordre");

      if (questionsError) throw questionsError;

      if (modeleQuestions && modeleQuestions.length > 0) {
        const enqueteQuestions = modeleQuestions.map(q => ({
          enquete_id: enquete.id,
          question: q.question,
          type_question: q.type_question,
          options: q.options,
          obligatoire: q.obligatoire,
          ordre: q.ordre,
          condition_question_id: null, // Reset conditions
          condition_valeur: null
        }));

        const { error: insertError } = await supabase
          .from("enquetes_questions")
          .insert(enqueteQuestions);

        if (insertError) throw insertError;
      }

      toast.success("Enquête déployée avec succès");
      setOpen(false);
      onDeploy();
    } catch (error: any) {
      console.error("Error deploying enquete:", error);
      toast.error("Erreur lors du déploiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Rocket className="mr-2 h-4 w-4" />
            Déployer une enquête
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Déployer une enquête</DialogTitle>
          <DialogDescription>
            Créez une nouvelle enquête à partir d'un modèle existant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modèle d'enquête *</Label>
            <Select value={selectedModeleId} onValueChange={handleModeleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un modèle" />
              </SelectTrigger>
              <SelectContent>
                {modeles.map((modele) => (
                  <SelectItem key={modele.id} value={modele.id}>
                    <div className="flex items-center gap-2">
                      {modele.type_enquete === 'a_chaud' ? (
                        <Flame className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Snowflake className="h-4 w-4 text-blue-500" />
                      )}
                      {modele.nom}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titre de l'enquête *</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Évaluation Module Marketing Digital"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>

          {!classeId && (
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.programmes?.code} - {classe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!moduleId && selectedClasseId && typeEnquete === 'a_chaud' && (
            <div className="space-y-2">
              <Label>Module (optionnel pour évaluation à chaud)</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.code} - {module.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateDebut, "dd/MM/yyyy", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateDebut}
                    onSelect={(d) => d && setDateDebut(d)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin (optionnelle)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFin ? format(dateFin, "dd/MM/yyyy", { locale: fr }) : "Non définie"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFin}
                    onSelect={setDateFin}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Enquête active</Label>
              <p className="text-sm text-muted-foreground">
                Les stagiaires pourront répondre immédiatement
              </p>
            </div>
            <Switch checked={estActive} onCheckedChange={setEstActive} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleDeploy} disabled={loading}>
            <Rocket className="mr-2 h-4 w-4" />
            {loading ? "Déploiement..." : "Déployer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
