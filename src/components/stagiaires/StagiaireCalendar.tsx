import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  List, 
  LayoutGrid,
  Clock,
  MapPin
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfDay, 
  endOfDay,
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isWithinInterval, 
  parseISO 
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface Module {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  salle?: string | null;
  lieu_hors_site?: string | null;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  };
}

interface StagiaireCalendarProps {
  modules: Module[];
}

type ViewMode = "calendar" | "list";
type CalendarView = "day" | "week" | "month" | "custom";

export function StagiaireCalendar({ modules }: StagiaireCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  const today = new Date();

  const isPastModule = (module: Module) => {
    if (!module.date_fin) return false;
    return parseISO(module.date_fin) < today;
  };

  const getModulesForDay = (date: Date) => {
    return modules.filter((module) => {
      if (!module.date_debut || !module.date_fin) return false;
      const start = parseISO(module.date_debut);
      const end = parseISO(module.date_fin);
      return isWithinInterval(date, { start, end });
    });
  };

  const getModulesInRange = (startDate: Date, endDate: Date) => {
    return modules.filter((module) => {
      if (!module.date_debut || !module.date_fin) return false;
      const moduleStart = parseISO(module.date_debut);
      const moduleEnd = parseISO(module.date_fin);
      return (
        isWithinInterval(moduleStart, { start: startDate, end: endDate }) ||
        isWithinInterval(moduleEnd, { start: startDate, end: endDate }) ||
        (moduleStart <= startDate && moduleEnd >= endDate)
      );
    });
  };

  // Calculate display range based on view
  const { displayStart, displayEnd, days } = useMemo(() => {
    let start: Date, end: Date;

    switch (calendarView) {
      case "day":
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case "week":
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case "custom":
        if (customRange?.from && customRange?.to) {
          start = customRange.from;
          end = customRange.to;
        } else {
          start = startOfMonth(currentDate);
          end = endOfMonth(currentDate);
        }
        break;
      case "month":
      default:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
    }

    return {
      displayStart: start,
      displayEnd: end,
      days: eachDayOfInterval({ start, end }),
    };
  }, [calendarView, currentDate, customRange]);

  const filteredModules = useMemo(() => {
    return getModulesInRange(displayStart, displayEnd).sort((a, b) => {
      const dateA = a.date_debut ? parseISO(a.date_debut).getTime() : 0;
      const dateB = b.date_debut ? parseISO(b.date_debut).getTime() : 0;
      return dateA - dateB;
    });
  }, [displayStart, displayEnd, modules]);

  const navigate = (direction: "prev" | "next") => {
    const modifier = direction === "prev" ? -1 : 1;
    
    switch (calendarView) {
      case "day":
        setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case "month":
      default:
        setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const getTitle = () => {
    switch (calendarView) {
      case "day":
        return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
      case "week":
        return `Semaine du ${format(displayStart, "d MMM", { locale: fr })} au ${format(displayEnd, "d MMM yyyy", { locale: fr })}`;
      case "custom":
        if (customRange?.from && customRange?.to) {
          return `Du ${format(customRange.from, "d MMM", { locale: fr })} au ${format(customRange.to, "d MMM yyyy", { locale: fr })}`;
        }
        return "Sélectionnez une période";
      case "month":
      default:
        return format(currentDate, "MMMM yyyy", { locale: fr });
    }
  };

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const firstDayOfMonth = (startOfMonth(currentDate).getDay() + 6) % 7;

  const renderModuleCard = (module: Module, showDate = true) => (
    <div
      key={module.id}
      className={cn(
        "p-3 rounded-lg border",
        isPastModule(module) ? "bg-muted/50 border-muted" : "bg-primary/5 border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{module.titre}</div>
          <div className="text-sm text-muted-foreground truncate">
            {module.classe.programme.titre} - {module.classe.nom}
          </div>
          {showDate && module.date_debut && module.date_fin && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(module.date_debut), "d MMM", { locale: fr })} - {format(parseISO(module.date_fin), "d MMM yyyy", { locale: fr })}
            </div>
          )}
          {(module.salle || module.lieu_hors_site) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {module.salle || module.lieu_hors_site}
            </div>
          )}
        </div>
        <Badge variant={isPastModule(module) ? "secondary" : "default"} className="shrink-0">
          {module.code}
        </Badge>
      </div>
    </div>
  );

  const renderDayView = () => {
    const dayModules = getModulesForDay(currentDate);
    
    return (
      <div className="space-y-3">
        {dayModules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Aucun module prévu ce jour
          </div>
        ) : (
          dayModules.map((module) => renderModuleCard(module, false))
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayModules = getModulesForDay(day);
          const isToday = isSameDay(day, today);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] p-2 border rounded-lg",
                isToday && "bg-primary/10 border-primary"
              )}
            >
              <div className={cn("text-sm font-medium mb-2", isToday && "text-primary font-bold")}>
                {format(day, "d", { locale: fr })}
              </div>
              <div className="space-y-1">
                {dayModules.slice(0, 2).map((module) => (
                  <div
                    key={module.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      isPastModule(module) ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
                    )}
                    title={module.titre}
                  >
                    {module.titre}
                  </div>
                ))}
                {dayModules.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayModules.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="p-2" />
        ))}

        {days.map((day) => {
          const dayModules = getModulesForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[80px] p-1 border rounded-lg",
                isToday && "bg-primary/10 border-primary",
                !isSameMonth(day, currentDate) && "opacity-50"
              )}
            >
              <div className={cn("text-sm font-medium mb-1", isToday && "text-primary font-bold")}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayModules.slice(0, 2).map((module) => (
                  <div
                    key={module.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      isPastModule(module) ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
                    )}
                    title={`${module.titre} - ${module.classe.programme.titre}`}
                  >
                    {module.titre}
                  </div>
                ))}
                {dayModules.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayModules.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="space-y-3">
        {filteredModules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Aucun module pour cette période
          </div>
        ) : (
          filteredModules.map((module) => renderModuleCard(module))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Liste
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={calendarView} onValueChange={(v) => {
          setCalendarView(v as CalendarView);
          if (v === "custom") {
            setIsCustomPickerOpen(true);
          }
        }}>
          <TabsList>
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="custom">Période</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            <span className="capitalize">{getTitle()}</span>
          </CardTitle>
          
          <div className="flex gap-2 items-center">
            {calendarView === "custom" ? (
              <Popover open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Modifier la période
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={(range) => {
                      setCustomRange(range);
                      if (range?.from && range?.to) {
                        setIsCustomPickerOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    locale={fr}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Aujourd'hui
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "list" ? (
            renderListView()
          ) : (
            <>
              {calendarView === "day" && renderDayView()}
              {calendarView === "week" && renderWeekView()}
              {calendarView === "month" && renderMonthView()}
              {calendarView === "custom" && renderListView()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming modules section */}
      {viewMode === "calendar" && calendarView === "month" && (
        <UpcomingModules modules={modules} today={today} />
      )}
    </div>
  );
}

function UpcomingModules({ modules, today }: { modules: Module[]; today: Date }) {
  const upcomingModules = useMemo(() => {
    return modules
      .filter((m) => m.date_debut && parseISO(m.date_debut) >= today)
      .sort((a, b) => parseISO(a.date_debut!).getTime() - parseISO(b.date_debut!).getTime())
      .slice(0, 5);
  }, [modules, today]);

  if (upcomingModules.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prochains modules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingModules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <div className="font-medium">{module.titre}</div>
                <div className="text-sm text-muted-foreground">
                  {module.classe.programme.titre} - {module.classe.nom}
                </div>
              </div>
              <Badge variant="outline">
                {module.date_debut && format(parseISO(module.date_debut), "d MMM", { locale: fr })}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
