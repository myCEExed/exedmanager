import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Users, AlertTriangle, Clock, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatarImage } from "@/components/SignedAvatarImage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModulePlanning, Conflict } from "@/hooks/usePlanningConflicts";
import { cn } from "@/lib/utils";

interface ModuleListProps {
  modules: ModulePlanning[];
  conflicts: Conflict[];
  onModuleClick?: (module: ModulePlanning) => void;
  filters: {
    programme?: string;
    classe?: string;
    enseignant?: string;
    dateStart?: Date;
    dateEnd?: Date;
  };
  readOnly?: boolean;
}

export const ModuleList = ({ modules, conflicts, onModuleClick, filters, readOnly = false }: ModuleListProps) => {
  const getConflictsForModule = (moduleId: string): Conflict[] => {
    return conflicts.filter((conflict) =>
      conflict.modules.some((m) => m.id === moduleId)
    );
  };

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  };

  const getLieuDisplay = (module: ModulePlanning) => {
    if (module.type_lieu === "hors_site" && module.lieu_hors_site) {
      return module.lieu_hors_site;
    }
    return module.salle || "Non défini";
  };

  // Apply filters
  let filteredModules = modules;

  if (filters.programme) {
    filteredModules = filteredModules.filter(
      (m) => m.classe?.programmes?.id === filters.programme
    );
  }

  if (filters.classe) {
    filteredModules = filteredModules.filter(
      (m) => m.classe?.id === filters.classe
    );
  }

  if (filters.enseignant) {
    filteredModules = filteredModules.filter((m) =>
      m.affectations.some((a) => a.enseignant_id === filters.enseignant)
    );
  }

  if (filters.dateStart) {
    filteredModules = filteredModules.filter((m) => {
      if (!m.date_debut) return false;
      return new Date(m.date_debut) >= filters.dateStart!;
    });
  }

  if (filters.dateEnd) {
    filteredModules = filteredModules.filter((m) => {
      if (!m.date_debut) return false;
      return new Date(m.date_debut) <= filters.dateEnd!;
    });
  }

  if (filteredModules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Aucun module trouvé avec les filtres sélectionnés
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedModules: Record<string, ModulePlanning[]> = {};
  filteredModules.forEach((module) => {
    if (!module.date_debut) return;
    const dateKey = format(new Date(module.date_debut), "yyyy-MM-dd");
    if (!groupedModules[dateKey]) {
      groupedModules[dateKey] = [];
    }
    groupedModules[dateKey].push(module);
  });

  const sortedDates = Object.keys(groupedModules).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <div className="sticky top-0 z-10 bg-background py-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
            </h3>
          </div>
          <div className="space-y-3 mt-2">
            {groupedModules[dateKey].map((module) => {
              const moduleConflicts = getConflictsForModule(module.id);
              const hasConflict = moduleConflicts.length > 0;

              return (
                <Card
                  key={module.id}
                  className={cn(
                    "transition-all",
                    !readOnly && "hover:shadow-md cursor-pointer",
                    hasConflict && "border-destructive/50 bg-destructive/5"
                  )}
                  onClick={() => !readOnly && onModuleClick?.(module)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{module.titre}</h4>
                              {hasConflict && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Conflit
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {module.classe?.nom} • {module.classe?.programmes?.titre}
                            </p>
                          </div>
                          {!readOnly && (
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                          {module.date_debut && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(module.date_debut), "HH:mm", { locale: fr })}
                                {module.date_fin && ` - ${format(new Date(module.date_fin), "HH:mm", { locale: fr })}`}
                              </span>
                            </div>
                          )}
                          {module.duree_heures && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{module.duree_heures}h</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{getLieuDisplay(module)}</span>
                          </div>
                        </div>

                        {/* Enseignants */}
                        {module.affectations.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div className="flex -space-x-2">
                              {module.affectations.slice(0, 3).map((aff) => (
                                aff.enseignants && (
                                  <Avatar key={aff.id} className="h-7 w-7 border-2 border-background">
                                    <AvatarImage src={aff.enseignants.photo_url || ""} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(aff.enseignants.nom, aff.enseignants.prenom)}
                                    </AvatarFallback>
                                  </Avatar>
                                )
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {module.affectations
                                .filter((a) => a.enseignants)
                                .map((a) => `${a.enseignants!.prenom} ${a.enseignants!.nom}`)
                                .join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Conflict details */}
                        {hasConflict && (
                          <div className="pt-2 border-t space-y-1">
                            {moduleConflicts.map((conflict) => (
                              <p key={conflict.id} className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {conflict.message}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
