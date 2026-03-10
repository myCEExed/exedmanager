import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useExcelImport } from "@/hooks/useExcelImport";
import { useExcelTemplate } from "@/hooks/useExcelTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clock, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { CreateProgrammeDialog } from "@/components/programmes/CreateProgrammeDialog";

const Programmes = () => {
  const { user } = useAuth();
  const { canEdit, isAdmin, isResponsableScolarite } = useUserRole();
  const { exportToExcel } = useExcelExport();
  const { importFromExcel } = useExcelImport();
  const { downloadTemplate } = useExcelTemplate();
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadProgrammes();
  }, []);

  const loadProgrammes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("programmes")
        .select(`
          *,
          clients (
            id,
            nom,
            code
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des programmes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const canManageProgramme = (programme: any) => {
    if (!user) return false;
    return (
      isAdmin() || 
      isResponsableScolarite() || 
      (canEdit() && programme.created_by === user.id)
    );
  };

  const filteredProgrammes = programmes.filter(
    (p) =>
      p.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const exportData = programmes.map((p) => ({
      Code: p.code,
      Titre: p.titre,
      Type: p.type,
      Description: p.code_description || "",
      "Date début": p.date_debut || "",
      "Date fin": p.date_fin || "",
      Rétroactif: p.is_retroactive ? "Oui" : "Non",
    }));
    exportToExcel(exportData, "programmes", "Programmes");
    toast.success("Export Excel réussi");
  };

  const handleDownloadTemplate = () => {
    const columns = ['Code', 'Titre', 'Type', 'Description', 'Date début', 'Date fin', 'Rétroactif'];
    const sampleData = [{
      'Code': 'PROG001',
      'Titre': 'Exemple Programme',
      'Type': 'INTER',
      'Description': 'Description exemple',
      'Date début': '2024-01-01',
      'Date fin': '2024-12-31',
      'Rétroactif': 'Non'
    }];
    downloadTemplate(columns, 'programmes', sampleData);
    toast.success("Canevas téléchargé avec succès");
  };

  const handleImport = async (file: File) => {
    const expectedColumns = ['Code', 'Titre', 'Type', 'Description', 'Date début', 'Date fin', 'Rétroactif'];
    
    await importFromExcel(file, expectedColumns, async (data) => {
      for (const row of data) {
        const { error } = await supabase.from('programmes').insert({
          code: row['Code'],
          titre: row['Titre'],
          type: row['Type'],
          code_description: row['Description'] || null,
          date_debut: row['Date début'] || null,
          date_fin: row['Date fin'] || null,
          is_retroactive: row['Rétroactif']?.toLowerCase() === 'oui',
          created_by: user?.id
        });

        if (error) {
          toast.error(`Erreur lors de l'import de ${row['Code']}: ${error.message}`);
          return;
        }
      }
      
      toast.success(`${data.length} programme(s) importé(s) avec succès`);
      loadProgrammes();
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Programmes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestion des programmes de formation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate} size="sm" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Télécharger Canevas
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate} size="sm" className="sm:hidden">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline" onClick={handleExport} size="sm" className="sm:hidden">
            <Download className="h-4 w-4" />
          </Button>
          {canEdit() && (
            <>
              <label htmlFor="import-programmes">
                <Button variant="outline" asChild size="sm" className="hidden sm:flex">
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer
                  </span>
                </Button>
                <Button variant="outline" asChild size="sm" className="sm:hidden">
                  <span>
                    <Upload className="h-4 w-4" />
                  </span>
                </Button>
              </label>
              <input
                id="import-programmes"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
          {canEdit() && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par code ou nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : filteredProgrammes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm
                ? "Aucun programme trouvé"
                : "Aucun programme. Créez-en un pour commencer."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProgrammes.map((programme) => (
            <Link key={programme.id} to={`/programmes/${programme.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{programme.titre}</CardTitle>
                    {programme.is_retroactive && (
                      <Badge variant="secondary" className="ml-2">
                        <Clock className="mr-1 h-3 w-3" />
                        Rétroactif
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge>{programme.type}</Badge>
                    <Badge variant="outline">{programme.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {programme.type === "INTRA" && programme.clients && (
                    <div className="mb-3 text-sm">
                      <span className="font-medium">Client:</span>{" "}
                      <span className="text-muted-foreground">
                        {programme.clients.nom} ({programme.clients.code})
                      </span>
                    </div>
                  )}
                  {programme.code_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {programme.code_description}
                    </p>
                  )}
                  {programme.date_debut && (
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Période:</span>{" "}
                      {new Date(programme.date_debut).toLocaleDateString("fr-FR")}
                      {programme.date_fin &&
                        ` - ${new Date(programme.date_fin).toLocaleDateString(
                          "fr-FR"
                        )}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProgrammeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadProgrammes}
      />
    </div>
  );
};

export default Programmes;
