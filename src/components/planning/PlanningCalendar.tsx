import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModulePlanning, Conflict } from "@/hooks/usePlanningConflicts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlanningCalendarProps {
  modules: ModulePlanning[];
  conflicts: Conflict[];
  onModuleClick: (module: ModulePlanning) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export const PlanningCalendar = ({
  modules,
  conflicts,
  onModuleClick,
  selectedDate,
  onDateSelect
}: PlanningCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getModulesForDay = (day: Date): ModulePlanning[] => {
    return modules.filter((module) => {
      if (!module.date_debut) return false;
      const moduleStart = new Date(module.date_debut);
      const moduleEnd = module.date_fin ? new Date(module.date_fin) : moduleStart;
      
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      return moduleStart <= dayEnd && moduleEnd >= dayStart;
    });
  };

  const getConflictsForModule = (moduleId: string): Conflict[] => {
    return conflicts.filter((conflict) =>
      conflict.modules.some((m) => m.id === moduleId)
    );
  };

  const hasConflictsOnDay = (day: Date): boolean => {
    const dayModules = getModulesForDay(day);
    return dayModules.some((module) => getConflictsForModule(module.id).length > 0);
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const getModuleColor = (module: ModulePlanning) => {
    const hasConflict = getConflictsForModule(module.id).length > 0;
    if (hasConflict) return "bg-destructive/20 border-destructive text-destructive-foreground";
    
    // Color by program
    const programCode = module.classe?.programmes?.code || "";
    const hash = programCode.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
      "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
      "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
      "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
      "bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300",
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, dayIdx) => {
            const dayModules = getModulesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasConflicts = hasConflictsOnDay(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] border-b border-r p-1 transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                  isSelected && "bg-accent",
                  "last:border-r-0 [&:nth-child(7n)]:border-r-0",
                  dayIdx >= days.length - 7 && "border-b-0"
                )}
                onClick={() => onDateSelect?.(day)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday && "bg-primary text-primary-foreground font-bold",
                      !isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hasConflicts && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                  <TooltipProvider>
                    {dayModules.slice(0, 3).map((module) => {
                      const moduleConflicts = getConflictsForModule(module.id);
                      return (
                        <Tooltip key={module.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onModuleClick(module);
                              }}
                              className={cn(
                                "w-full rounded border px-1.5 py-0.5 text-left text-xs truncate transition-all hover:opacity-80",
                                getModuleColor(module)
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {moduleConflicts.length > 0 && (
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                )}
                                <span className="truncate">{module.titre}</span>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{module.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {module.classe?.nom || "Classe"} - {module.classe?.programmes?.titre || "Programme"}
                              </p>
                              {module.date_debut && (
                                <p className="text-xs">
                                  {format(new Date(module.date_debut), "dd/MM HH:mm", { locale: fr })}
                                  {module.date_fin && ` - ${format(new Date(module.date_fin), "dd/MM HH:mm", { locale: fr })}`}
                                </p>
                              )}
                              {moduleConflicts.length > 0 && (
                                <div className="pt-1 border-t">
                                  {moduleConflicts.map((c) => (
                                    <p key={c.id} className="text-xs text-destructive">
                                      ⚠️ {c.message}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                  {dayModules.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayModules.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
