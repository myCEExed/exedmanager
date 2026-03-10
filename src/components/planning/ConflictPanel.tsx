import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, User, Users, Calendar, MapPin, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Conflict, ModulePlanning } from "@/hooks/usePlanningConflicts";
import { cn } from "@/lib/utils";

interface ConflictPanelProps {
  conflicts: Conflict[];
  onConflictClick?: (conflict: Conflict) => void;
  onModuleClick?: (module: ModulePlanning) => void;
  readOnly?: boolean;
}

export const ConflictPanel = ({ conflicts, onConflictClick, onModuleClick, readOnly = false }: ConflictPanelProps) => {
  const teacherConflicts = conflicts.filter((c) => c.type === "enseignant");
  const studentConflicts = conflicts.filter((c) => c.type === "stagiaire");

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            Aucun conflit détecté
          </CardTitle>
          <CardDescription>
            Tous les modules sont planifiés sans chevauchement
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Conflits détectés ({conflicts.length})
        </CardTitle>
        <CardDescription>
          Résolvez ces conflits pour éviter les problèmes de planification
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {teacherConflicts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <User className="h-4 w-4" />
                  Conflits enseignants ({teacherConflicts.length})
                </div>
                {teacherConflicts.map((conflict) => (
                  <ConflictItem
                    key={conflict.id}
                    conflict={conflict}
                    onConflictClick={onConflictClick}
                    onModuleClick={onModuleClick}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}

            {studentConflicts.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <Users className="h-4 w-4" />
                  Conflits stagiaires ({studentConflicts.length})
                </div>
                {studentConflicts.map((conflict) => (
                  <ConflictItem
                    key={conflict.id}
                    conflict={conflict}
                    onConflictClick={onConflictClick}
                    onModuleClick={onModuleClick}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface ConflictItemProps {
  conflict: Conflict;
  onConflictClick?: (conflict: Conflict) => void;
  onModuleClick?: (module: ModulePlanning) => void;
  readOnly?: boolean;
}

const ConflictItem = ({ conflict, onConflictClick, onModuleClick, readOnly = false }: ConflictItemProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        !readOnly && "hover:bg-muted/50 cursor-pointer",
        conflict.type === "enseignant"
          ? "border-destructive/30 bg-destructive/5"
          : "border-orange-300/30 bg-orange-50/50 dark:bg-orange-900/10"
      )}
      onClick={() => !readOnly && onConflictClick?.(conflict)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {conflict.entity.prenom} {conflict.entity.nom}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conflict.message}
          </p>
          
          <div className="mt-2 space-y-1">
            {conflict.modules.map((module) => (
              <div
                key={module.id}
                onClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  onModuleClick?.(module);
                }}
                className={cn(
                  "flex items-center gap-2 text-xs text-left w-full",
                  !readOnly && "hover:text-primary cursor-pointer transition-colors"
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {module.titre} - {module.classe?.nom}
                </span>
                {!readOnly && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {format(new Date(conflict.overlapStart), "dd/MM HH:mm", { locale: fr })} - {format(new Date(conflict.overlapEnd), "dd/MM HH:mm", { locale: fr })}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
