import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Save, QrCode } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Programme {
  id: string;
  code: string;
  titre: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
}

interface Module {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
}

interface AttendanceRecord {
  stagiaire_id: string;
  present: boolean;
  retard_minutes: number;
  qr_scanned: boolean;
  qr_scan_time: string | null;
}

export function ManualAttendanceDialog({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [dateSession, setDateSession] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (open) {
      loadProgrammes();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProgramme) {
      loadClasses(selectedProgramme);
      setSelectedClasse("");
      setSelectedModule("");
      setStagiaires([]);
      setAttendance([]);
    }
  }, [selectedProgramme]);

  useEffect(() => {
    if (selectedClasse) {
      loadModules(selectedClasse);
      loadStagiaires(selectedClasse);
      setSelectedModule("");
    }
  }, [selectedClasse]);

  useEffect(() => {
    if (selectedModule && stagiaires.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedModule, dateSession, stagiaires]);

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
      .select("id, nom, sous_code")
      .eq("programme_id", programmeId)
      .order("nom");
    setClasses(data || []);
  };

  const loadModules = async (classeId: string) => {
    const { data } = await supabase
      .from("modules")
      .select("id, code, titre, date_debut")
      .eq("classe_id", classeId)
      .order("date_debut", { ascending: true, nullsFirst: false });
    setModules(data || []);
  };

  const loadStagiaires = async (classeId: string) => {
    const { data } = await supabase
      .from("inscriptions")
      .select("stagiaires(id, nom, prenom)")
      .eq("classe_id", classeId);
    
    if (data) {
      const list = data
        .map((i: any) => i.stagiaires)
        .filter((s: any) => s !== null)
        .sort((a: Stagiaire, b: Stagiaire) => a.nom.localeCompare(b.nom));
      setStagiaires(list);
    }
  };

  const loadExistingAttendance = async () => {
    if (!selectedModule || !dateSession) return;
    
    setLoadingExisting(true);
    try {
      // Charger les présences existantes pour ce module et cette date
      const { data: existingRecords } = await supabase
        .from("assiduite")
        .select("stagiaire_id, present, retard_minutes, qr_code_scan_time")
        .eq("module_id", selectedModule)
        .gte("date_session", new Date(dateSession).toISOString().split('T')[0])
        .lt("date_session", new Date(new Date(dateSession).getTime() + 24*60*60*1000).toISOString().split('T')[0]);

      // Créer un map des présences existantes
      const existingMap = new Map<string, {present: boolean; retard: number; scanTime: string | null}>();
      if (existingRecords) {
        existingRecords.forEach(r => {
          existingMap.set(r.stagiaire_id, {
            present: r.present ?? false,
            retard: r.retard_minutes ?? 0,
            scanTime: r.qr_code_scan_time
          });
        });
      }

      // Initialiser les records d'assiduité pour chaque stagiaire
      setAttendance(stagiaires.map(s => {
        const existing = existingMap.get(s.id);
        return {
          stagiaire_id: s.id,
          present: existing?.present ?? true,
          retard_minutes: existing?.retard ?? 0,
          qr_scanned: !!existing?.scanTime,
          qr_scan_time: existing?.scanTime ?? null,
        };
      }));
    } catch (error) {
      console.error("Error loading existing attendance:", error);
      // Fallback: initialiser sans données existantes
      setAttendance(stagiaires.map(s => ({
        stagiaire_id: s.id,
        present: true,
        retard_minutes: 0,
        qr_scanned: false,
        qr_scan_time: null,
      })));
    } finally {
      setLoadingExisting(false);
    }
  };

  const updateAttendance = (stagiaireId: string, field: 'present' | 'retard_minutes', value: boolean | number) => {
    setAttendance(prev => prev.map(a => 
      a.stagiaire_id === stagiaireId 
        ? { ...a, [field]: value }
        : a
    ));
  };

  const saveAttendance = async () => {
    if (!selectedModule || !dateSession) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un module et une date de session",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const sessionDate = new Date(dateSession).toISOString();
      
      // Pour chaque stagiaire, insérer ou mettre à jour
      for (const a of attendance) {
        const { error } = await supabase
          .from("assiduite")
          .upsert({
            stagiaire_id: a.stagiaire_id,
            module_id: selectedModule,
            date_session: sessionDate,
            present: a.present,
            retard_minutes: a.present ? a.retard_minutes : null,
            created_by: user?.id,
          }, {
            onConflict: 'stagiaire_id,module_id,date_session',
          });

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "Présences enregistrées avec succès",
      });

      setOpen(false);
      onSaved();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    setAttendance(prev => prev.map(a => ({ ...a, present: true, retard_minutes: 0 })));
  };

  const markAllAbsent = () => {
    setAttendance(prev => prev.map(a => ({ ...a, present: false, retard_minutes: 0 })));
  };

  // Statistiques
  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.present).length,
    absent: attendance.filter(a => !a.present).length,
    scanned: attendance.filter(a => a.qr_scanned).length,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCheck className="w-4 h-4 mr-2" />
          Saisie manuelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Saisie manuelle des présences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Programme</Label>
              <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
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

            <div className="space-y-2">
              <Label>Classe</Label>
              <Select 
                value={selectedClasse} 
                onValueChange={setSelectedClasse}
                disabled={!selectedProgramme}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select 
                value={selectedModule} 
                onValueChange={setSelectedModule}
                disabled={!selectedClasse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.titre}
                      {m.date_debut && (
                        <span className="text-muted-foreground ml-1">
                          ({format(new Date(m.date_debut), "dd/MM", { locale: fr })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date et heure de la session</Label>
              <Input
                type="datetime-local"
                value={dateSession}
                onChange={(e) => setDateSession(e.target.value)}
              />
            </div>
          </div>

          {stagiaires.length > 0 && selectedModule && (
            <>
              {/* Statistiques */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  Total: {stats.total}
                </Badge>
                <Badge variant="default" className="bg-green-600">
                  Présents: {stats.present}
                </Badge>
                <Badge variant="destructive">
                  Absents: {stats.absent}
                </Badge>
                {stats.scanned > 0 && (
                  <Badge variant="secondary">
                    <QrCode className="w-3 h-3 mr-1" />
                    Scannés: {stats.scanned}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  Tous présents
                </Button>
                <Button variant="outline" size="sm" onClick={markAllAbsent}>
                  Tous absents
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-4">
                {loadingExisting ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stagiaires.map((stagiaire) => {
                      const record = attendance.find(a => a.stagiaire_id === stagiaire.id);
                      return (
                        <div 
                          key={stagiaire.id} 
                          className={`flex items-center justify-between p-2 rounded-md hover:bg-muted ${
                            record?.qr_scanned ? 'bg-green-50 border border-green-200' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={record?.present ?? true}
                              onCheckedChange={(checked) => 
                                updateAttendance(stagiaire.id, 'present', !!checked)
                              }
                            />
                            <div>
                              <span className="font-medium">
                                {stagiaire.prenom} {stagiaire.nom}
                              </span>
                              {record?.qr_scanned && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <QrCode className="w-3 h-3" />
                                  Scanné à {record.qr_scan_time && format(new Date(record.qr_scan_time), "HH:mm", { locale: fr })}
                                </div>
                              )}
                            </div>
                          </div>
                          {record?.present && (
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-muted-foreground">Retard (min)</Label>
                              <Input
                                type="number"
                                min="0"
                                className="w-20 h-8"
                                value={record.retard_minutes}
                                onChange={(e) => 
                                  updateAttendance(stagiaire.id, 'retard_minutes', parseInt(e.target.value) || 0)
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}

          <Button 
            className="w-full" 
            onClick={saveAttendance}
            disabled={!selectedModule || stagiaires.length === 0 || saving || loadingExisting}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer les présences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
