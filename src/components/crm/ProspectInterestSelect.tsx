import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X, Plus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface Programme {
  id: string;
  titre: string;
  code: string;
  type: string;
}

interface ModuleCatalogue {
  id: string;
  titre: string;
}

interface ProspectInterestSelectProps {
  thematiques: string[];
  onThematiquesChange: (thematiques: string[]) => void;
  programmeIds: string[];
  onProgrammeIdsChange: (ids: string[]) => void;
  moduleIds: string[];
  onModuleIdsChange: (ids: string[]) => void;
  existingThematiques?: string[];
}

export const ProspectInterestSelect = ({
  thematiques,
  onThematiquesChange,
  programmeIds,
  onProgrammeIdsChange,
  moduleIds,
  onModuleIdsChange,
  existingThematiques = [],
}: ProspectInterestSelectProps) => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modules, setModules] = useState<ModuleCatalogue[]>([]);
  const [newThematique, setNewThematique] = useState("");
  const [thematiqueSearch, setThematiqueSearch] = useState("");
  const [programmeOpen, setProgrammeOpen] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [programmesRes, modulesRes] = await Promise.all([
      supabase.from("programmes").select("id, titre, code, type").order("titre"),
      supabase.from("module_catalogue").select("id, titre").order("titre"),
    ]);

    if (programmesRes.data) setProgrammes(programmesRes.data);
    if (modulesRes.data) setModules(modulesRes.data);
  };

  const filteredThematiqueSuggestions = useMemo(() => {
    if (!thematiqueSearch) return existingThematiques.slice(0, 10);
    return existingThematiques
      .filter((t) => t.toLowerCase().includes(thematiqueSearch.toLowerCase()))
      .slice(0, 10);
  }, [existingThematiques, thematiqueSearch]);

  const handleAddThematique = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !thematiques.includes(trimmed)) {
      onThematiquesChange([...thematiques, trimmed]);
    }
    setNewThematique("");
    setThematiqueSearch("");
  };

  const handleRemoveThematique = (thematique: string) => {
    onThematiquesChange(thematiques.filter((t) => t !== thematique));
  };

  const toggleProgramme = (id: string) => {
    if (programmeIds.includes(id)) {
      onProgrammeIdsChange(programmeIds.filter((p) => p !== id));
    } else {
      onProgrammeIdsChange([...programmeIds, id]);
    }
  };

  const toggleModule = (id: string) => {
    if (moduleIds.includes(id)) {
      onModuleIdsChange(moduleIds.filter((m) => m !== id));
    } else {
      onModuleIdsChange([...moduleIds, id]);
    }
  };

  const selectedProgrammes = programmes.filter((p) => programmeIds.includes(p.id));
  const selectedModules = modules.filter((m) => moduleIds.includes(m.id));

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Objet de l'intérêt (optionnel)</Label>

      {/* Thématiques */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Thématiques</Label>
        <div className="flex flex-wrap gap-1 mb-2">
          {thematiques.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveThematique(t)}
              />
            </Badge>
          ))}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder="Saisir ou sélectionner une thématique..."
                value={newThematique}
                onChange={(e) => {
                  setNewThematique(e.target.value);
                  setThematiqueSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddThematique(newThematique);
                  }
                }}
              />
              {newThematique && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                  onClick={() => handleAddThematique(newThematique)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </PopoverTrigger>
          {filteredThematiqueSuggestions.length > 0 && (
            <PopoverContent className="w-[300px] p-0" align="start">
              <ScrollArea className="h-[150px]">
                <div className="p-2 space-y-1">
                  {filteredThematiqueSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent"
                      onClick={() => handleAddThematique(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          )}
        </Popover>
      </div>

      {/* Programmes */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Programmes</Label>
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedProgrammes.map((p) => (
            <Badge key={p.id} variant="outline" className="gap-1">
              [{p.code}] {p.titre}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleProgramme(p.id)} />
            </Badge>
          ))}
        </div>
        <Popover open={programmeOpen} onOpenChange={setProgrammeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Sélectionner des programmes
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher un programme..." />
              <CommandList>
                <CommandEmpty>Aucun programme trouvé</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {programmes.map((programme) => (
                      <CommandItem
                        key={programme.id}
                        onSelect={() => toggleProgramme(programme.id)}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          checked={programmeIds.includes(programme.id)}
                          className="pointer-events-none"
                        />
                        <span className="text-xs text-muted-foreground">[{programme.code}]</span>
                        <span>{programme.titre}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {programme.type}
                        </Badge>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Modules */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Modules du catalogue</Label>
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedModules.map((m) => (
            <Badge key={m.id} variant="outline" className="gap-1">
              {m.titre}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleModule(m.id)} />
            </Badge>
          ))}
        </div>
        <Popover open={moduleOpen} onOpenChange={setModuleOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Sélectionner des modules
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher un module..." />
              <CommandList>
                <CommandEmpty>Aucun module trouvé</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-[200px]">
                    {modules.map((module) => (
                      <CommandItem
                        key={module.id}
                        onSelect={() => toggleModule(module.id)}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          checked={moduleIds.includes(module.id)}
                          className="pointer-events-none"
                        />
                        <span>{module.titre}</span>
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
