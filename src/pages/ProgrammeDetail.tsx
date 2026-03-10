import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, Calendar, BookOpen, Users, FileText, Calculator, GraduationCap, History, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { ProgrammeModulesManager } from "@/components/programmes/ProgrammeModulesManager";
import { ProgrammeAuditLog } from "@/components/programmes/ProgrammeAuditLog";
import { ProgrammeClassesManager } from "@/components/programmes/ProgrammeClassesManager";
import { ProgrammeCoutsManager } from "@/components/programmes/ProgrammeCoutsManager";
import { ProgrammeContenuManager } from "@/components/programmes/ProgrammeContenuManager";
import { EditProgrammeDialog } from "@/components/programmes/EditProgrammeDialog";
import { ProgrammeEnquetesTab } from "@/components/enquetes/ProgrammeEnquetesTab";

const ProgrammeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("programmes");
  const [programme, setProgramme] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [classesModules, setClassesModules] = useState<any[]>([]);
  const [couts, setCouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProgrammeDetails();
    }
  }, [id]);

  const loadProgrammeDetails = async () => {
    setLoading(true);
    try {
      // Charger le programme avec le client
      const { data: programmeData, error: programmeError } = await supabase
        .from("programmes")
        .select(`
          *,
          clients (
            id,
            nom,
            code,
            secteur_activite,
            email,
            telephone,
            ville,
            pays
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (programmeError) throw programmeError;
      
      if (!programmeData) {
        setProgramme(null);
        setLoading(false);
        return;
      }
      
      setProgramme(programmeData);

      // Charger les données en parallèle pour plus de performance
      const [classesResult, programmeModulesResult, coutsResult] = await Promise.allSettled([
        // Charger les classes
        supabase
          .from("classes")
          .select("*, inscriptions(count)")
          .eq("programme_id", id)
          .order("date_debut", { ascending: true }),
        
        // Charger les modules du programme
        supabase
          .from("programme_modules")
          .select(`
            *,
            module_catalogue (
              id,
              titre,
              descriptif
            )
          `)
          .eq("programme_id", id)
          .order("ordre", { ascending: true }),
        
        // Charger les coûts
        supabase
          .from("programme_couts")
          .select("*")
          .eq("programme_id", id)
      ]);

      // Traiter les résultats des classes
      if (classesResult.status === 'fulfilled' && !classesResult.value.error) {
        const classesData = classesResult.value.data || [];
        setClasses(classesData);

        // Charger les modules des classes seulement s'il y a des classes
        if (classesData.length > 0) {
          const classIds = classesData.map(c => c.id);
          const { data: modulesData, error: modulesError } = await supabase
            .from("modules")
            .select(`
              *,
              classe_id,
              affectations (
                id,
                enseignant_id,
                confirmee,
                enseignants (
                  id,
                  nom,
                  prenom,
                  email,
                  photo_url
                )
              )
            `)
            .in("classe_id", classIds)
            .order("date_debut", { ascending: true });

          if (!modulesError) {
            setClassesModules(modulesData || []);
          }
        }
      } else {
        console.error("Error loading classes:", classesResult);
        setClasses([]);
      }

      // Traiter les résultats des modules du programme
      if (programmeModulesResult.status === 'fulfilled' && !programmeModulesResult.value.error) {
        setModules(programmeModulesResult.value.data || []);
      } else {
        console.error("Error loading programme modules:", programmeModulesResult);
        setModules([]);
      }

      // Traiter les résultats des coûts
      if (coutsResult.status === 'fulfilled' && !coutsResult.value.error) {
        setCouts(coutsResult.value.data || []);
      } else {
        console.error("Error loading costs:", coutsResult);
        setCouts([]);
      }

    } catch (error: any) {
      console.error("Error in loadProgrammeDetails:", error);
      toast.error("Erreur lors du chargement des détails du programme");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/programmes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="text-center text-muted-foreground py-8">Chargement...</div>
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/programmes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Programme non trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCouts = couts.reduce((sum, cout) => sum + (cout.montant || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header avec retour */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate("/programmes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        {canEdit && <EditProgrammeDialog programme={programme} onProgrammeUpdated={loadProgrammeDetails} />}
      </div>

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{programme.titre}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge>{programme.type}</Badge>
                <Badge variant="outline">{programme.code}</Badge>
                {programme.is_retroactive && (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    Rétroactif
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {programme.code_description && (
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-muted-foreground">{programme.code_description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programme.date_debut && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Période</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(programme.date_debut).toLocaleDateString("fr-FR")}
                    {programme.date_fin &&
                      ` - ${new Date(programme.date_fin).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
              </div>
            )}

            {programme.type === "INTRA" && programme.clients && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">
                    {programme.clients.nom} ({programme.clients.code})
                  </p>
                  {programme.clients.secteur_activite && (
                    <p className="text-xs text-muted-foreground">
                      {programme.clients.secteur_activite}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour organiser le contenu */}
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="modules">
            <BookOpen className="mr-2 h-4 w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="contenu">
            <FileText className="mr-2 h-4 w-4" />
            Contenu
          </TabsTrigger>
          <TabsTrigger value="classes">
            <GraduationCap className="mr-2 h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="enquetes">
            <ClipboardList className="mr-2 h-4 w-4" />
            Enquêtes
          </TabsTrigger>
          <TabsTrigger value="couts">
            <Calculator className="mr-2 h-4 w-4" />
            Coûts
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-6">
          <ProgrammeModulesManager
            programmeId={id!}
            onModulesChange={loadProgrammeDetails}
          />
        </TabsContent>

        <TabsContent value="contenu" className="mt-6">
          <ProgrammeContenuManager programmeId={id!} />
        </TabsContent>

        <TabsContent value="classes" className="mt-6">
          <ProgrammeClassesManager
            programmeId={id!}
            onClassesChange={loadProgrammeDetails}
          />
        </TabsContent>

        <TabsContent value="enquetes" className="mt-6">
          <ProgrammeEnquetesTab programmeId={id!} />
        </TabsContent>

        <TabsContent value="couts" className="mt-6">
          <ProgrammeCoutsManager
            programmeId={id!}
            onCoutsChange={loadProgrammeDetails}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ProgrammeAuditLog programmeId={id!} />
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default ProgrammeDetail;
