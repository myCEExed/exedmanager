import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Programme {
  id: string;
  code: string;
  titre: string;
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

interface AssiduiteFiltersProps {
  filterProgramme: string;
  filterClasse: string;
  filterModule: string;
  filterStagiaire?: string;
  showStagiaireFilter?: boolean;
  onProgrammeChange: (value: string) => void;
  onClasseChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onStagiaireChange?: (value: string) => void;
  onClearFilters: () => void;
}

export function AssiduiteFilters({
  filterProgramme,
  filterClasse,
  filterModule,
  filterStagiaire,
  showStagiaireFilter = false,
  onProgrammeChange,
  onClasseChange,
  onModuleChange,
  onStagiaireChange,
  onClearFilters,
}: AssiduiteFiltersProps) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);

  useEffect(() => {
    loadProgrammes();
  }, []);

  useEffect(() => {
    if (filterProgramme) {
      loadClasses(filterProgramme);
    } else {
      setClasses([]);
    }
  }, [filterProgramme]);

  useEffect(() => {
    if (filterClasse) {
      loadModules(filterClasse);
      if (showStagiaireFilter) {
        loadStagiaires(filterClasse);
      }
    } else {
      setModules([]);
      setStagiaires([]);
    }
  }, [filterClasse, showStagiaireFilter]);

  const loadProgrammes = async () => {
    const { data } = await supabase
      .from("programmes")
      .select("id, code, titre")
      .order("code");
    setProgrammes(data || []);
  };

  const loadClasses = async (programmeId: string) => {
    const { data } = await supabase
      .from("classes")
      .select("id, nom, sous_code, programme_id")
      .eq("programme_id", programmeId)
      .order("nom");
    setClasses(data || []);
  };

  const loadModules = async (classeId: string) => {
    const { data } = await supabase
      .from("modules")
      .select("id, code, titre, classe_id")
      .eq("classe_id", classeId)
      .order("code");
    setModules(data || []);
  };

  const loadStagiaires = async (classeId: string) => {
    const { data } = await supabase
      .from("inscriptions")
      .select("stagiaire_id, stagiaires(id, nom, prenom)")
      .eq("classe_id", classeId)
      .order("stagiaires(nom)");
    
    if (data) {
      const stagiairesList = data
        .map((i: any) => i.stagiaires)
        .filter((s: any) => s !== null);
      setStagiaires(stagiairesList);
    }
  };

  const handleProgrammeChange = (value: string) => {
    onProgrammeChange(value);
    onClasseChange("");
    onModuleChange("");
    if (onStagiaireChange) onStagiaireChange("");
  };

  const handleClasseChange = (value: string) => {
    onClasseChange(value);
    onModuleChange("");
    if (onStagiaireChange) onStagiaireChange("");
  };

  const handleModuleChange = (value: string) => {
    onModuleChange(value);
  };

  const hasFilters = filterProgramme || filterClasse || filterModule || filterStagiaire;

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="space-y-2 min-w-[200px]">
        <Label>Programme</Label>
        <Select value={filterProgramme} onValueChange={handleProgrammeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les programmes" />
          </SelectTrigger>
          <SelectContent>
            {programmes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} - {p.titre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 min-w-[200px]">
        <Label>Classe</Label>
        <Select 
          value={filterClasse} 
          onValueChange={handleClasseChange}
          disabled={!filterProgramme}
        >
          <SelectTrigger>
            <SelectValue placeholder="Toutes les classes" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nom} ({c.sous_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 min-w-[200px]">
        <Label>Module</Label>
        <Select 
          value={filterModule} 
          onValueChange={handleModuleChange}
          disabled={!filterClasse}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les modules" />
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

      {showStagiaireFilter && (
        <div className="space-y-2 min-w-[200px]">
          <Label>Stagiaire</Label>
          <Select 
            value={filterStagiaire || ""} 
            onValueChange={onStagiaireChange}
            disabled={!filterClasse}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les stagiaires" />
            </SelectTrigger>
            <SelectContent>
              {stagiaires.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.prenom} {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="w-4 h-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  );
}
