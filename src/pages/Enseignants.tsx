import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useExcelImport } from "@/hooks/useExcelImport";
import { useExcelTemplate } from "@/hooks/useExcelTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, MapPin, Users as UsersIcon, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Enseignants = () => {
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const { exportToExcel } = useExcelExport();
  const { importFromExcel } = useExcelImport();
  const { downloadTemplate } = useExcelTemplate();
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEnseignant, setNewEnseignant] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    telephone_indicatif: "+33",
    pays_residence: "",
    mode_remuneration: "vacation" as any,
    raison_sociale: "",
    numero_identification: "",
  });

  useEffect(() => {
    loadEnseignants();
  }, []);

  const loadEnseignants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enseignants")
        .select("*")
        .order("nom", { ascending: true });

      if (error) throw error;
      setEnseignants(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des enseignants");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const enseignantSchema = z.object({
    nom: z.string().trim().min(1, "Le nom est requis").max(200, "Le nom ne peut dépasser 200 caractères"),
    prenom: z.string().trim().min(1, "Le prénom est requis").max(200, "Le prénom ne peut dépasser 200 caractères"),
    email: z.string().trim().email("Email invalide").max(255, "L'email ne peut dépasser 255 caractères"),
    telephone: z.string().trim().max(50, "Le téléphone ne peut dépasser 50 caractères").optional().or(z.literal("")),
    telephone_indicatif: z.string().trim().max(10, "L'indicatif ne peut dépasser 10 caractères").optional().or(z.literal("")),
    pays_residence: z.string().trim().max(200, "Le pays ne peut dépasser 200 caractères").optional().or(z.literal("")),
    mode_remuneration: z.enum(["vacation", "prestation_service", "salarie", "autre"]),
    raison_sociale: z.string().trim().max(200, "La raison sociale ne peut dépasser 200 caractères").optional().or(z.literal("")),
    numero_identification: z.string().trim().max(100, "Le numéro d'identification ne peut dépasser 100 caractères").optional().or(z.literal("")),
  });

  const handleCreateEnseignant = async () => {
    try {
      // Validate input data
      const validatedData = enseignantSchema.parse(newEnseignant);

      const { error } = await supabase.from("enseignants").insert([{
        nom: validatedData.nom,
        prenom: validatedData.prenom,
        email: validatedData.email,
        telephone: validatedData.telephone || null,
        telephone_indicatif: validatedData.telephone_indicatif || null,
        pays_residence: validatedData.pays_residence || null,
        mode_remuneration: validatedData.mode_remuneration,
        raison_sociale: validatedData.raison_sociale || null,
        numero_identification: validatedData.numero_identification || null,
      }]);

      if (error) throw error;

      toast.success("Enseignant ajouté avec succès");
      setDialogOpen(false);
      setNewEnseignant({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        telephone_indicatif: "+33",
        pays_residence: "",
        mode_remuneration: "vacation",
        raison_sociale: "",
        numero_identification: "",
      });
      loadEnseignants();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erreur lors de l'ajout de l'enseignant");
        console.error(error);
      }
    }
  };

  const filteredEnseignants = enseignants.filter(
    (e) =>
      e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const exportData = enseignants.map((e) => ({
      Nom: e.nom,
      Prénom: e.prenom,
      Email: e.email,
      Téléphone: e.telephone ? `${e.telephone_indicatif} ${e.telephone}` : "",
      "Pays de résidence": e.pays_residence || "",
      "Mode de rémunération": e.mode_remuneration || "",
    }));
    exportToExcel(exportData, "enseignants", "Enseignants");
    toast.success("Export Excel réussi");
  };

  const handleDownloadTemplate = () => {
    const columns = ['Nom', 'Prénom', 'Email', 'Téléphone Indicatif', 'Téléphone', 'Pays', 'Mode Rémunération'];
    const sampleData = [{
      'Nom': 'Dupont',
      'Prénom': 'Jean',
      'Email': 'jean.dupont@example.com',
      'Téléphone Indicatif': '+33',
      'Téléphone': '612345678',
      'Pays': 'France',
      'Mode Rémunération': 'vacation'
    }];
    downloadTemplate(columns, 'enseignants', sampleData);
    toast.success("Canevas téléchargé avec succès");
  };

  const handleImport = async (file: File) => {
    const expectedColumns = ['Nom', 'Prénom', 'Email', 'Téléphone Indicatif', 'Téléphone', 'Pays', 'Mode Rémunération'];
    
    await importFromExcel(file, expectedColumns, async (data) => {
      for (const row of data) {
        const { error } = await supabase.from('enseignants').insert({
          nom: row['Nom'],
          prenom: row['Prénom'],
          email: row['Email'],
          telephone_indicatif: row['Téléphone Indicatif'] || '+33',
          telephone: row['Téléphone'] || null,
          pays_residence: row['Pays'] || null,
          mode_remuneration: row['Mode Rémunération'] || null
        });

        if (error) {
          toast.error(`Erreur lors de l'import de ${row['Nom']} ${row['Prénom']}: ${error.message}`);
          return;
        }
      }
      
      toast.success(`${data.length} enseignant(s) importé(s) avec succès`);
      loadEnseignants();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enseignants</h1>
          <p className="text-muted-foreground">
            Base de données des enseignants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger Canevas
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          {canEditSection("enseignants") && (
            <>
              <label htmlFor="import-enseignants">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer
                  </span>
                </Button>
              </label>
              <input
                id="import-enseignants"
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
          {canEditSection("enseignants") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel enseignant
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un enseignant</DialogTitle>
              <DialogDescription>
                Remplissez les informations de l'enseignant
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={newEnseignant.prenom}
                    onChange={(e) =>
                      setNewEnseignant({ ...newEnseignant, prenom: e.target.value })
                    }
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={newEnseignant.nom}
                    onChange={(e) =>
                      setNewEnseignant({ ...newEnseignant, nom: e.target.value })
                    }
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEnseignant.email}
                  onChange={(e) =>
                    setNewEnseignant({ ...newEnseignant, email: e.target.value })
                  }
                  placeholder="jean.dupont@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    value={newEnseignant.telephone_indicatif}
                    onChange={(e) =>
                      setNewEnseignant({
                        ...newEnseignant,
                        telephone_indicatif: e.target.value,
                      })
                    }
                    placeholder="+33"
                  />
                  <Input
                    className="flex-1"
                    id="telephone"
                    value={newEnseignant.telephone}
                    onChange={(e) =>
                      setNewEnseignant({
                        ...newEnseignant,
                        telephone: e.target.value,
                      })
                    }
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pays">Pays de résidence</Label>
                <Input
                  id="pays"
                  value={newEnseignant.pays_residence}
                  onChange={(e) =>
                    setNewEnseignant({
                      ...newEnseignant,
                      pays_residence: e.target.value,
                    })
                  }
                  placeholder="France"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remuneration">Mode de rémunération</Label>
                <Select
                  value={newEnseignant.mode_remuneration}
                  onValueChange={(value) =>
                    setNewEnseignant({ ...newEnseignant, mode_remuneration: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="prestation_service">
                      Prestation de service
                    </SelectItem>
                    <SelectItem value="salarie">Salarié</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raison_sociale">Raison sociale</Label>
                <Input
                  id="raison_sociale"
                  value={newEnseignant.raison_sociale}
                  onChange={(e) =>
                    setNewEnseignant({
                      ...newEnseignant,
                      raison_sociale: e.target.value,
                    })
                  }
                  placeholder="Société XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_identification">Numéro d'identification</Label>
                <Input
                  id="numero_identification"
                  value={newEnseignant.numero_identification}
                  onChange={(e) =>
                    setNewEnseignant({
                      ...newEnseignant,
                      numero_identification: e.target.value,
                    })
                  }
                  placeholder="123456789"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateEnseignant}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un enseignant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Chargement...</div>
      ) : filteredEnseignants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <UsersIcon className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {searchTerm
                ? "Aucun enseignant trouvé"
                : "Aucun enseignant"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Essayez une autre recherche"
                : "Ajoutez votre premier enseignant pour commencer"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnseignants.map((enseignant) => (
            <Card
              key={enseignant.id}
              className="transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => navigate(`/enseignants/${enseignant.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  {enseignant.prenom} {enseignant.nom}
                </CardTitle>
                {enseignant.mode_remuneration && (
                  <Badge variant="secondary" className="w-fit">
                    {enseignant.mode_remuneration}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{enseignant.email}</span>
                </div>
                {enseignant.telephone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>
                      {enseignant.telephone_indicatif} {enseignant.telephone}
                    </span>
                  </div>
                )}
                {enseignant.pays_residence && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{enseignant.pays_residence}</span>
                  </div>
                )}
                {enseignant.raison_sociale && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Raison sociale:</strong> {enseignant.raison_sociale}
                  </div>
                )}
                {enseignant.numero_identification && (
                  <div className="text-sm text-muted-foreground truncate">
                    <strong>N° ID:</strong> {enseignant.numero_identification}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Enseignants;