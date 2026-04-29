import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignedAvatarImage } from "@/components/SignedAvatarImage";
import { useToast } from "@/hooks/use-toast";
import { useTrombinoscopeExport } from "@/hooks/useTrombinoscopeExport";
import { FileText, Presentation, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo_url: string | null;
}

interface Classe {
  id: string;
  nom: string;
  programme_id: string;
}

interface Programme {
  id: string;
  titre: string;
  code: string;
}

export default function Trombinoscope() {
  const { toast } = useToast();
  const { exportToDOCX, exportToPPTX } = useTrombinoscopeExport();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("");
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadProgrammes();
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClasseId) {
      loadStagiaires();
    } else {
      setStagiaires([]);
    }
  }, [selectedClasseId]);

  // Reset classe when programme changes
  useEffect(() => {
    if (selectedProgrammeId) {
      // Check if current classe belongs to the selected programme
      const currentClasse = classes.find(c => c.id === selectedClasseId);
      if (currentClasse && currentClasse.programme_id !== selectedProgrammeId) {
        setSelectedClasseId("");
      }
    }
  }, [selectedProgrammeId]);

  const loadProgrammes = async () => {
    try {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, titre, code")
        .order("titre");

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error) {
      console.error("Error loading programmes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les programmes",
        variant: "destructive",
      });
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, nom, programme_id")
        .order("nom");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les classes",
        variant: "destructive",
      });
    }
  };

  // Filter classes based on selected programme
  const filteredClasses = useMemo(() => {
    if (!selectedProgrammeId) return classes;
    return classes.filter(c => c.programme_id === selectedProgrammeId);
  }, [classes, selectedProgrammeId]);

  const loadStagiaires = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!selectedClasseId || stagiaires.length === 0) return;
    
    setExporting(true);
    const selectedClasse = classes.find(c => c.id === selectedClasseId);
    const success = await exportToDOCX(stagiaires, selectedClasse?.nom || "Classe");
    
    if (success) {
      toast({
        title: "Succès",
        description: "Trombinoscope exporté en DOCX",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le trombinoscope",
        variant: "destructive",
      });
    }
    setExporting(false);
  };

  const handleExportPPTX = async () => {
    if (!selectedClasseId || stagiaires.length === 0) return;
    
    setExporting(true);
    const selectedClasse = classes.find(c => c.id === selectedClasseId);
    const success = await exportToPPTX(stagiaires, selectedClasse?.nom || "Classe");
    
    if (success) {
      toast({
        title: "Succès",
        description: "Trombinoscope exporté en PPTX",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le trombinoscope",
        variant: "destructive",
      });
    }
    setExporting(false);
  };

  const clearFilters = () => {
    setSelectedProgrammeId("");
    setSelectedClasseId("");
    setStagiaires([]);
  };

  const hasActiveFilters = selectedProgrammeId || selectedClasseId;

  const getSelectedProgrammeName = () => {
    const prog = programmes.find(p => p.id === selectedProgrammeId);
    return prog ? `${prog.code} - ${prog.titre}` : "";
  };

  const getSelectedClasseName = () => {
    const cls = classes.find(c => c.id === selectedClasseId);
    return cls?.nom || "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trombinoscope</h1>
        <p className="text-muted-foreground">
          Visualisez et exportez les trombinoscopes par programme et classe
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-sm font-medium">Programme</label>
          <Select value={selectedProgrammeId} onValueChange={setSelectedProgrammeId}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les programmes</SelectItem>
              {programmes.map((programme) => (
                <SelectItem key={programme.id} value={programme.id}>
                  {programme.code} - {programme.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-sm font-medium">Classe</label>
          <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {filteredClasses.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>
                  {classe.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportDOCX}
            disabled={!selectedClasseId || stagiaires.length === 0 || exporting}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exporter DOCX
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPPTX}
            disabled={!selectedClasseId || stagiaires.length === 0 || exporting}
          >
            <Presentation className="w-4 h-4 mr-2" />
            Exporter PPTX
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtres actifs:</span>
          {selectedProgrammeId && selectedProgrammeId !== "__all__" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Programme: {getSelectedProgrammeName()}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setSelectedProgrammeId("")}
              />
            </Badge>
          )}
          {selectedClasseId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Classe: {getSelectedClasseName()}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => setSelectedClasseId("")}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Effacer tout
          </Button>
        </div>
      )}

      {/* Stagiaires count */}
      {selectedClasseId && stagiaires.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {stagiaires.length} stagiaire{stagiaires.length > 1 ? "s" : ""} trouvé{stagiaires.length > 1 ? "s" : ""}
        </div>
      )}

      {loading ? (
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
                  <Avatar className="w-32 h-32">
                    <SignedAvatarImage photoUrl={stagiaire.photo_url} fallbackBucket="stagiaire-photos" alt={`${stagiaire.prenom} ${stagiaire.nom}`} />
                    <AvatarFallback className="text-2xl">
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
