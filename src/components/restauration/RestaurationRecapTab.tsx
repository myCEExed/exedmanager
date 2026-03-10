import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileSpreadsheet, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useToast } from "@/hooks/use-toast";

interface EtatRestauration {
  id: string;
  module_id: string;
  nombre_total_unites: number | null;
  nombre_invites: number | null;
  notes: string | null;
  offres_restauration: {
    id: string;
    nature_restauration: string;
    formule_restauration: string;
    prix_unitaire: number;
  } | null;
  modules: {
    id: string;
    titre: string;
    code: string;
    date_debut: string | null;
    date_fin: string | null;
    classe_id: string;
    classes: {
      id: string;
      nom: string;
      sous_code: string;
      programme_id: string;
      programmes: {
        id: string;
        code: string;
        titre: string;
      };
    };
  };
}

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

export const RestaurationRecapTab = () => {
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();
  const [etats, setEtats] = useState<EtatRestauration[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [selectedClasse, setSelectedClasse] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [etatsResult, programmesResult, classesResult] = await Promise.all([
        supabase
          .from("etats_restauration")
          .select(`
            *,
            offres_restauration(*),
            modules(
              id, titre, code, date_debut, date_fin, classe_id,
              classes(id, nom, sous_code, programme_id, programmes(id, code, titre))
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("programmes").select("id, code, titre").order("code"),
        supabase.from("classes").select("id, nom, sous_code, programme_id").order("sous_code")
      ]);

      if (etatsResult.data) setEtats(etatsResult.data as unknown as EtatRestauration[]);
      if (programmesResult.data) setProgrammes(programmesResult.data);
      if (classesResult.data) setClasses(classesResult.data);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!selectedProgramme) return classes;
    return classes.filter(c => c.programme_id === selectedProgramme);
  }, [classes, selectedProgramme]);

  const filteredEtats = useMemo(() => {
    let filtered = etats;
    
    if (selectedProgramme) {
      filtered = filtered.filter(e => e.modules?.classes?.programme_id === selectedProgramme);
    }
    
    if (selectedClasse) {
      filtered = filtered.filter(e => e.modules?.classe_id === selectedClasse);
    }
    
    return filtered;
  }, [etats, selectedProgramme, selectedClasse]);

  const totaux = useMemo(() => {
    return filteredEtats.reduce((acc, etat) => {
      const cout = (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0);
      return {
        unites: acc.unites + (etat.nombre_total_unites || 0),
        invites: acc.invites + (etat.nombre_invites || 0),
        cout: acc.cout + cout
      };
    }, { unites: 0, invites: 0, cout: 0 });
  }, [filteredEtats]);

  const handleExport = () => {
    const data = filteredEtats.map(etat => ({
      "Programme": etat.modules?.classes?.programmes?.code || "-",
      "Classe": etat.modules?.classes?.sous_code || "-",
      "Module": etat.modules?.titre || "-",
      "Date": etat.modules?.date_debut ? format(new Date(etat.modules.date_debut), "dd/MM/yyyy", { locale: fr }) : "-",
      "Nature": etat.offres_restauration?.nature_restauration || "-",
      "Formule": etat.offres_restauration?.formule_restauration || "-",
      "Prix unitaire": etat.offres_restauration?.prix_unitaire || 0,
      "Unités": etat.nombre_total_unites || 0,
      "Invités": etat.nombre_invites || 0,
      "Coût total": (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0),
      "Notes": etat.notes || ""
    }));

    exportToExcel(data, "recap_restauration", "Récapitulatif Restauration");
    toast({ title: "Export réussi", description: "Le récapitulatif a été exporté." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Programme</label>
        <Select value={selectedProgramme || "__all__"} onValueChange={(v) => {
            setSelectedProgramme(v === "__all__" ? "" : v);
            setSelectedClasse("");
          }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Tous les programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les programmes</SelectItem>
              {programmes.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.code} - {p.titre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Classe</label>
        <Select value={selectedClasse || "__all__"} onValueChange={(v) => setSelectedClasse(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les classes</SelectItem>
              {filteredClasses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.sous_code} - {c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Totaux */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Unités</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaux.unites}</div>
            <p className="text-xs text-muted-foreground">dont {totaux.invites} invités</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions concernées</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEtats.length}</div>
            <p className="text-xs text-muted-foreground">modules avec restauration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coût Total</CardTitle>
            <span className="text-muted-foreground">€</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaux.cout.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">estimation basée sur les offres</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par session</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEtats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune restauration planifiée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead className="text-right">Unités</TableHead>
                  <TableHead className="text-right">Coût</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEtats.map(etat => {
                  const cout = (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0);
                  return (
                    <TableRow key={etat.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{etat.modules?.titre}</p>
                          <p className="text-xs text-muted-foreground">
                            {etat.modules?.classes?.programmes?.code} / {etat.modules?.classes?.sous_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {etat.modules?.date_debut
                          ? format(new Date(etat.modules.date_debut), "dd MMM yyyy", { locale: fr })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {etat.offres_restauration?.nature_restauration}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          {etat.offres_restauration?.formule_restauration}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {etat.nombre_total_unites}
                        {(etat.nombre_invites || 0) > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (+{etat.nombre_invites})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {cout.toFixed(2)} €
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
