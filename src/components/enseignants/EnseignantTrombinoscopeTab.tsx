import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo_url: string | null;
}

interface AssignedClasse {
  id: string;
  nom: string;
  sous_code: string;
}

export function EnseignantTrombinoscopeTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedClasses, setAssignedClasses] = useState<AssignedClasse[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStagiaires, setLoadingStagiaires] = useState(false);

  useEffect(() => {
    if (user) {
      loadAssignedClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClasseId) {
      loadStagiaires();
    } else {
      setStagiaires([]);
    }
  }, [selectedClasseId]);

  const loadAssignedClasses = async () => {
    try {
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) {
        setLoading(false);
        return;
      }

      const { data: affectations } = await supabase
        .from("affectations")
        .select(`
          modules (
            classe_id,
            classes (
              id,
              nom,
              sous_code
            )
          )
        `)
        .eq("enseignant_id", enseignant.id)
        .eq("confirmee", true);

      if (affectations) {
        const classesMap = new Map<string, AssignedClasse>();
        affectations.forEach(a => {
          if (a.modules?.classes) {
            const classe = a.modules.classes;
            if (!classesMap.has(classe.id)) {
              classesMap.set(classe.id, {
                id: classe.id,
                nom: classe.nom,
                sous_code: classe.sous_code
              });
            }
          }
        });
        setAssignedClasses(Array.from(classesMap.values()));
      }
    } catch (error) {
      console.error("Error loading assigned classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStagiaires = async () => {
    try {
      setLoadingStagiaires(true);
      const { data, error } = await supabase
        .from("inscriptions")
        .select(`
          stagiaire_id,
          stagiaires (
            id,
            nom,
            prenom,
            email,
            photo_url
          )
        `)
        .eq("classe_id", selectedClasseId);

      if (error) throw error;

      const stagiairesList = data
        ?.map((inscription: any) => inscription.stagiaires)
        .filter(Boolean)
        .sort((a: Stagiaire, b: Stagiaire) => a.nom.localeCompare(b.nom)) || [];

      setStagiaires(stagiairesList);
    } catch (error) {
      console.error("Error loading stagiaires:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les stagiaires",
        variant: "destructive",
      });
    } finally {
      setLoadingStagiaires(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-sm font-medium">Classe</label>
          <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {assignedClasses.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>
                  {classe.sous_code} - {classe.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClasseId && stagiaires.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {stagiaires.length} stagiaire{stagiaires.length > 1 ? "s" : ""}
        </div>
      )}

      {loadingStagiaires ? (
        <div className="text-center py-12">Chargement...</div>
      ) : !selectedClasseId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sélectionnez une classe pour voir le trombinoscope</p>
          </CardContent>
        </Card>
      ) : stagiaires.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Aucun stagiaire inscrit dans cette classe</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stagiaires.map((stagiaire) => (
            <Card key={stagiaire.id}>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={stagiaire.photo_url || undefined} alt={`${stagiaire.prenom} ${stagiaire.nom}`} />
                    <AvatarFallback className="text-xl">
                      {stagiaire.prenom[0]}{stagiaire.nom[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-lg">
                  {stagiaire.prenom} {stagiaire.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">{stagiaire.email}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
