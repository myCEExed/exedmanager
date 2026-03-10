import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ClasseModulesScheduler } from "@/components/classes/ClasseModulesScheduler";

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
  programmes: {
    id: string;
    titre: string;
    code: string;
  } | null;
}

const Modules = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classeId = searchParams.get("classe");
  const { canEdit } = useUserRole();
  
  const [classe, setClasse] = useState<Classe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classeId) {
      loadClasse();
    }
  }, [classeId]);

  const loadClasse = async () => {
    if (!classeId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id,
          nom,
          sous_code,
          programme_id,
          programmes (
            id,
            titre,
            code
          )
        `)
        .eq("id", classeId)
        .single();

      if (error) throw error;
      setClasse(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement de la classe");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!classeId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune classe sélectionnée</p>
            <Button className="mt-4" onClick={() => navigate("/classes")}>
              Retour aux classes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!classe?.programmes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/classes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Modules - {classe?.nom}
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold mb-2">Aucun programme associé</h3>
            <p className="text-muted-foreground mb-4">
              Cette classe n'est pas liée à un programme. Veuillez d'abord associer un programme pour pouvoir planifier des modules.
            </p>
            <Button onClick={() => navigate("/classes")}>
              Retour aux classes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/classes/${classeId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Planification des modules
            </h1>
            <p className="text-muted-foreground">
              {classe.nom} • {classe.programmes.titre} ({classe.programmes.code})
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/planning")}>
          <Calendar className="mr-2 h-4 w-4" />
          Vue Planning
        </Button>
      </div>

      <ClasseModulesScheduler 
        classeId={classe.id}
        programmeId={classe.programme_id}
      />
    </div>
  );
};

export default Modules;
