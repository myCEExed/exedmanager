import { useMemo, useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  startOfYear,
  endOfYear,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  addDays,
  subDays,
  eachMonthOfInterval,
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  subQuarters,
  getMonth
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModulePlanning, Conflict } from "@/hooks/usePlanningConflicts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarViewSelector, CalendarViewType } from "./CalendarViewSelector";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlanningCalendarMultiViewProps {
  modules: ModulePlanning[];
  conflicts: Conflict[];
  onModuleClick?: (module: ModulePlanning) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  filters: {
    programme?: string;
    classe?: string;
    enseignant?: string;
    dateStart?: Date;
    dateEnd?: Date;
  };
  readOnly?: boolean;
}

export const PlanningCalendarMultiView = ({
  modules,
  conflicts,
  onModuleClick,
  selectedDate,
  onDateSelect,
  filters,
  readOnly = false
}: PlanningCalendarMultiViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>("month");

  // Filter modules based on filters
  const filteredModules = useMemo(() => {
    let result = [...modules];
    
    if (filters.programme) {
      result = result.filter(m => m.classe?.programmes?.id === filters.programme);
    }
    if (filters.classe) {
      result = result.filter(m => m.classe?.id === filters.classe);
    }
    if (filters.enseignant) {
      result = result.filter(m =>
        m.affectations.some(a => a.enseignant_id === filters.enseignant)
      );
    }
    if (filters.dateStart) {
      result = result.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) >= filters.dateStart!;
      });
    }
    if (filters.dateEnd) {
      result = result.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) <= filters.dateEnd!;
      });
    }
    
    return result;
  }, [modules, filters]);

  const navigatePrevious = () => {
    switch (viewType) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "quarter":
        setCurrentDate(subQuarters(currentDate, 1));
        break;
      case "semester":
        setCurrentDate(subMonths(currentDate, 6));
        break;
      case "year":
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "quarter":
        setCurrentDate(addQuarters(currentDate, 1));
        break;
      case "semester":
        setCurrentDate(addMonths(currentDate, 6));
        break;
      case "year":
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  const getDateRangeTitle = (): string => {
    switch (viewType) {
      case "day":
        return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: fr });
      case "quarter":
        const qStart = startOfQuarter(currentDate);
        const qEnd = endOfQuarter(currentDate);
        return `${format(qStart, "MMM", { locale: fr })} - ${format(qEnd, "MMM yyyy", { locale: fr })}`;
      case "semester":
        const month = getMonth(currentDate);
        const semesterNum = month < 6 ? 1 : 2;
        return `Semestre ${semesterNum} ${format(currentDate, "yyyy", { locale: fr })}`;
      case "year":
        return format(currentDate, "yyyy", { locale: fr });
    }
  };

  const getModulesForDay = (day: Date): ModulePlanning[] => {
    return filteredModules.filter((module) => {
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

  const renderDayView = () => {
    const dayModules = getModulesForDay(currentDate);
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7h to 20h

    return (
      <div className="rounded-lg border">
        <div className="grid grid-cols-[60px_1fr] divide-x">
          <div className="bg-muted/30">
            {hours.map((hour) => (
              <div key={hour} className="h-16 border-b px-2 py-1 text-xs text-muted-foreground">
                {hour}:00
              </div>
            ))}
          </div>
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="h-16 border-b" />
            ))}
            {dayModules.map((module) => {
              if (!module.date_debut) return null;
              const start = new Date(module.date_debut);
              const end = module.date_fin ? new Date(module.date_fin) : start;
              const startHour = start.getHours() + start.getMinutes() / 60;
              const endHour = end.getHours() + end.getMinutes() / 60;
              const top = (startHour - 7) * 64;
              const height = Math.max((endHour - startHour) * 64, 32);

              return (
                <TooltipProvider key={module.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !readOnly && onModuleClick?.(module)}
                        className={cn(
                          "absolute left-1 right-1 rounded border px-2 py-1 text-left text-xs overflow-hidden",
                          !readOnly && "cursor-pointer",
                          getModuleColor(module)
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="font-medium truncate">{module.titre}</div>
                        <div className="text-[10px] opacity-75 truncate">
                          {module.classe?.nom}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{module.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {module.classe?.nom} - {module.classe?.programmes?.titre}
                        </p>
                        <p className="text-xs">
                          {format(start, "HH:mm", { locale: fr })}
                          {module.date_fin && ` - ${format(end, "HH:mm", { locale: fr })}`}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);

    return (
      <div className="rounded-lg border overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
            <div className="p-2" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 text-center border-l",
                  isSameDay(day, new Date()) && "bg-primary/10"
                )}
              >
                <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: fr })}</div>
                <div className={cn(
                  "text-sm font-medium",
                  isSameDay(day, new Date()) && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            <div className="bg-muted/30">
              {hours.map((hour) => (
                <div key={hour} className="h-12 border-b px-2 py-1 text-xs text-muted-foreground">
                  {hour}:00
                </div>
              ))}
            </div>
            {days.map((day) => {
              const dayModules = getModulesForDay(day);
              return (
                <div key={day.toISOString()} className="relative border-l">
                  {hours.map((hour) => (
                    <div key={hour} className="h-12 border-b" />
                  ))}
                  {dayModules.slice(0, 5).map((module) => {
                    if (!module.date_debut) return null;
                    const start = new Date(module.date_debut);
                    const end = module.date_fin ? new Date(module.date_fin) : start;
                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const endHour = end.getHours() + end.getMinutes() / 60;
                    const top = (startHour - 7) * 48;
                    const height = Math.max((endHour - startHour) * 48, 24);

                    return (
                      <TooltipProvider key={module.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => !readOnly && onModuleClick?.(module)}
                              className={cn(
                                "absolute left-0.5 right-0.5 rounded border px-1 py-0.5 text-left text-[10px] overflow-hidden",
                                !readOnly && "cursor-pointer",
                                getModuleColor(module)
                              )}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="font-medium truncate">{module.titre}</div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{module.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {module.classe?.nom}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div key={day} className="px-2 py-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, dayIdx) => {
            const dayModules = getModulesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasConflicts = hasConflictsOnDay(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] border-b border-r p-1 transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                  isSelected && "bg-accent",
                  "last:border-r-0 [&:nth-child(7n)]:border-r-0",
                  dayIdx >= days.length - 7 && "border-b-0"
                )}
                onClick={() => onDateSelect?.(day)}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    isToday && "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasConflicts && <AlertTriangle className="h-3 w-3 text-destructive" />}
                </div>
                <div className="mt-1 space-y-0.5 max-h-[60px] overflow-y-auto">
                  <TooltipProvider>
                    {dayModules.slice(0, 3).map((module) => (
                      <Tooltip key={module.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); !readOnly && onModuleClick?.(module); }}
                            className={cn(
                              "w-full rounded border px-1 py-0.5 text-left text-[10px] truncate",
                              !readOnly && "cursor-pointer",
                              getModuleColor(module)
                            )}
                          >
                            {module.titre}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{module.titre}</p>
                          <p className="text-xs">{module.classe?.nom}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                  {dayModules.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayModules.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuarterView = () => {
    const qStart = startOfQuarter(currentDate);
    const qEnd = endOfQuarter(currentDate);
    const months = eachMonthOfInterval({ start: qStart, end: qEnd });

    return (
      <div className="grid grid-cols-3 gap-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
          const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

          return (
            <div key={month.toISOString()} className="rounded-lg border">
              <div className="p-2 border-b bg-muted/30 text-center font-medium text-sm">
                {format(month, "MMMM", { locale: fr })}
              </div>
              <div className="grid grid-cols-7 text-[10px]">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <div key={i} className="p-1 text-center text-muted-foreground">{d}</div>
                ))}
                {days.map((day) => {
                  const dayModules = getModulesForDay(day);
                  const hasModules = dayModules.length > 0;
                  const hasConflicts = hasConflictsOnDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-1 text-center text-[10px]",
                        !isSameMonth(day, month) && "text-muted-foreground/50",
                        isSameDay(day, new Date()) && "font-bold text-primary"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 mx-auto rounded-full flex items-center justify-center",
                        hasModules && !hasConflicts && "bg-primary/20",
                        hasConflicts && "bg-destructive/20"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSemesterView = () => {
    const month = getMonth(currentDate);
    const semesterStart = month < 6 
      ? new Date(currentDate.getFullYear(), 0, 1)
      : new Date(currentDate.getFullYear(), 6, 1);
    const semesterEnd = month < 6
      ? new Date(currentDate.getFullYear(), 5, 30)
      : new Date(currentDate.getFullYear(), 11, 31);
    const months = eachMonthOfInterval({ start: semesterStart, end: semesterEnd });

    return (
      <div className="grid grid-cols-3 gap-3">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const monthModules = filteredModules.filter(m => {
            if (!m.date_debut) return false;
            const d = new Date(m.date_debut);
            return d >= monthStart && d <= monthEnd;
          });

          return (
            <div key={month.toISOString()} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{format(month, "MMMM", { locale: fr })}</span>
                <Badge variant="secondary" className="text-xs">{monthModules.length}</Badge>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const dayModules = getModulesForDay(day);
                  const hasModules = dayModules.length > 0;
                  const hasConflicts = hasConflictsOnDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "w-4 h-4 rounded-sm text-[8px] flex items-center justify-center",
                        hasModules && !hasConflicts && "bg-primary/30",
                        hasConflicts && "bg-destructive/30",
                        isSameDay(day, new Date()) && "ring-1 ring-primary"
                      )}
                      title={dayModules.length > 0 ? `${dayModules.length} module(s)` : undefined}
                    >
                      {dayModules.length > 0 && dayModules.length}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return (
      <div className="grid grid-cols-4 gap-3">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const monthModules = filteredModules.filter(m => {
            if (!m.date_debut) return false;
            const d = new Date(m.date_debut);
            return d >= monthStart && d <= monthEnd;
          });
          const hasConflicts = conflicts.some(c => 
            c.modules.some(m => {
              if (!m.date_debut) return false;
              const d = new Date(m.date_debut);
              return d >= monthStart && d <= monthEnd;
            })
          );

          return (
            <button
              key={month.toISOString()}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                isSameMonth(month, new Date()) && "ring-2 ring-primary"
              )}
              onClick={() => {
                setCurrentDate(month);
                setViewType("month");
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{format(month, "MMM", { locale: fr })}</span>
                {hasConflicts && <AlertTriangle className="h-3 w-3 text-destructive" />}
              </div>
              <div className="text-2xl font-bold text-primary">{monthModules.length}</div>
              <div className="text-xs text-muted-foreground">module(s)</div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderView = () => {
    switch (viewType) {
      case "day":
        return renderDayView();
      case "week":
        return renderWeekView();
      case "month":
        return renderMonthView();
      case "quarter":
        return renderQuarterView();
      case "semester":
        return renderSemesterView();
      case "year":
        return renderYearView();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize ml-2">
            {getDateRangeTitle()}
          </h3>
        </div>
        <CalendarViewSelector value={viewType} onChange={setViewType} />
      </div>

      <ScrollArea className="w-full">
        {renderView()}
      </ScrollArea>
    </div>
  );
};
