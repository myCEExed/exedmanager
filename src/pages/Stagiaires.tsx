import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useExcelImport } from "@/hooks/useExcelImport";
import { useExcelTemplate } from "@/hooks/useExcelTemplate";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useStagiaireExport, StagiaireWithDetails } from "@/hooks/useStagiaireExport";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatarImage } from "@/components/SignedAvatarImage";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Mail, Phone, MapPin, Download, Upload, Camera } from "lucide-react";
import { z } from "zod";
import StagiairesFilters, { FilterState } from "@/components/stagiaires/StagiairesFilters";

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  telephone_indicatif: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  pays: string | null;
  date_naissance: string | null;
  photo_url: string | null;
  poste_fonction: string | null;
  entreprise: string | null;
  niveau_etude: string | null;
  diplomes: any;
}

interface StagiaireDetails {
  inscriptions: {
    classe_id: string;
    classes: {
      id: string;
      nom: string;
      sous_code: string;
      programme_id: string;
      date_debut: string | null;
      date_fin: string | null;
      programmes: {
        id: string;
        titre: string;
        code: string;
      };
    };
  }[];
}

export default function Stagiaires() {
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();
  const { importFromExcel } = useExcelImport();
  const { downloadTemplate } = useExcelTemplate();
  const { uploadPhoto, uploading } = usePhotoUpload();
  const { exportToPDF, exportToExcelWithDetails } = useStagiaireExport();
  
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [stagiaireDetails, setStagiaireDetails] = useState<Map<string, StagiaireDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    dateDebut: null,
    dateFin: null,
    programmes: [],
    modules: [],
    classes: [],
  });

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    ville: "",
    code_postal: "",
    pays: "France",
    poste_fonction: "",
    entreprise: "",
    niveau_etude: "",
  });

  useEffect(() => {
    loadStagiaires();
  }, []);

  useEffect(() => {
    if (stagiaires.length > 0) {
      loadStagiaireDetails();
    }
  }, [stagiaires]);

  const loadStagiaires = async () => {
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("*")
        .order("nom");

      if (error) throw error;
      setStagiaires(data || []);
    } catch (error) {
      console.error("Error loading stagiaires:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les stagiaires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStagiaireDetails = async () => {
    try {
      // Load inscriptions with classes and programmes
      const { data: inscriptions, error: inscError } = await supabase
        .from("inscriptions")
        .select(`
          stagiaire_id,
          classe_id,
          classes (
            id,
            nom,
            sous_code,
            programme_id,
            date_debut,
            date_fin,
            programmes (
              id,
              titre,
              code
            )
          )
        `);

      if (inscError) throw inscError;

      // Load modules via classes
      const { data: modules, error: modError } = await supabase
        .from("modules")
        .select(`
          id,
          titre,
          code,
          classe_id,
          date_debut,
          date_fin
        `);

      if (modError) throw modError;

      // Build details map
      const detailsMap = new Map<string, StagiaireDetails>();
      
      stagiaires.forEach(s => {
        const stagiaireInscriptions = inscriptions?.filter(i => i.stagiaire_id === s.id) || [];
        detailsMap.set(s.id, {
          inscriptions: stagiaireInscriptions.map(i => ({
            classe_id: i.classe_id,
            classes: i.classes as any,
          })),
        });
      });

      setStagiaireDetails(detailsMap);
    } catch (error) {
      console.error("Error loading stagiaire details:", error);
    }
  };

  // Filter stagiaires based on all criteria
  const filteredStagiaires = useMemo(() => {
    let result = stagiaires.filter(
      (stagiaire) =>
        stagiaire.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stagiaire.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stagiaire.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply advanced filters
    const hasAdvancedFilters = filters.dateDebut || filters.dateFin || 
      filters.programmes.length > 0 || filters.modules.length > 0 || filters.classes.length > 0;

    if (hasAdvancedFilters) {
      result = result.filter(stagiaire => {
        const details = stagiaireDetails.get(stagiaire.id);
        if (!details || details.inscriptions.length === 0) return false;

        let passesFilter = true;

        // Date filter
        if (filters.dateDebut || filters.dateFin) {
          const hasMatchingDate = details.inscriptions.some(insc => {
            const classeDebut = insc.classes?.date_debut ? new Date(insc.classes.date_debut) : null;
            const classeFin = insc.classes?.date_fin ? new Date(insc.classes.date_fin) : null;
            
            if (filters.dateDebut && classeFin) {
              if (classeFin < filters.dateDebut) return false;
            }
            if (filters.dateFin && classeDebut) {
              if (classeDebut > filters.dateFin) return false;
            }
            return true;
          });
          if (!hasMatchingDate) passesFilter = false;
        }

        // Programme filter
        if (filters.programmes.length > 0 && passesFilter) {
          const hasMatchingProgramme = details.inscriptions.some(insc => 
            insc.classes?.programmes && filters.programmes.includes(insc.classes.programmes.id)
          );
          if (!hasMatchingProgramme) passesFilter = false;
        }

        // Classe filter
        if (filters.classes.length > 0 && passesFilter) {
          const hasMatchingClasse = details.inscriptions.some(insc => 
            filters.classes.includes(insc.classe_id)
          );
          if (!hasMatchingClasse) passesFilter = false;
        }

        return passesFilter;
      });
    }

    return result;
  }, [stagiaires, searchTerm, filters, stagiaireDetails]);

  // Build export data with details
  const buildExportData = async (): Promise<StagiaireWithDetails[]> => {
    const { data: modules } = await supabase
      .from("modules")
      .select("id, titre, code, classe_id");

    return filteredStagiaires.map(s => {
      const details = stagiaireDetails.get(s.id);
      const inscriptions = details?.inscriptions || [];
      
      const programmeMap = new Map<string, { id: string; titre: string; code: string }>();
      const classeMap = new Map<string, { id: string; nom: string; code: string }>();
      const moduleMap = new Map<string, { id: string; titre: string; code: string }>();

      inscriptions.forEach(insc => {
        if (insc.classes?.programmes) {
          programmeMap.set(insc.classes.programmes.id, {
            id: insc.classes.programmes.id,
            titre: insc.classes.programmes.titre,
            code: insc.classes.programmes.code,
          });
        }
        if (insc.classes) {
          classeMap.set(insc.classes.id, {
            id: insc.classes.id,
            nom: insc.classes.nom,
            code: insc.classes.sous_code,
          });

          // Find modules for this class
          const classModules = modules?.filter(m => m.classe_id === insc.classes.id) || [];
          classModules.forEach(m => {
            // Apply module filter if active
            if (filters.modules.length === 0 || filters.modules.includes(m.id)) {
              moduleMap.set(m.id, {
                id: m.id,
                titre: m.titre,
                code: m.code,
              });
            }
          });
        }
      });

      return {
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        email: s.email,
        telephone: s.telephone,
        programmes: Array.from(programmeMap.values()),
        modules: Array.from(moduleMap.values()),
        classes: Array.from(classeMap.values()),
      };
    });
  };

  const handleExportPDF = async () => {
    const data = await buildExportData();
    exportToPDF(data, filters);
    toast({
      title: "Succès",
      description: "Export PDF généré avec succès",
    });
  };

  const handleExportExcel = async () => {
    const data = await buildExportData();
    exportToExcelWithDetails(data, filters);
    toast({
      title: "Succès",
      description: "Export Excel généré avec succès",
    });
  };

  const stagiaireSchema = z.object({
    nom: z.string().trim().min(1, "Le nom est requis").max(200, "Le nom ne peut dépasser 200 caractères"),
    prenom: z.string().trim().min(1, "Le prénom est requis").max(200, "Le prénom ne peut dépasser 200 caractères"),
    email: z.string().trim().email("Email invalide").max(255, "L'email ne peut dépasser 255 caractères"),
    telephone: z.string().trim().max(50, "Le téléphone ne peut dépasser 50 caractères").optional().or(z.literal("")),
    adresse: z.string().trim().max(500, "L'adresse ne peut dépasser 500 caractères").optional().or(z.literal("")),
    ville: z.string().trim().max(200, "La ville ne peut dépasser 200 caractères").optional().or(z.literal("")),
    code_postal: z.string().trim().max(20, "Le code postal ne peut dépasser 20 caractères").optional().or(z.literal("")),
    pays: z.string().trim().max(200, "Le pays ne peut dépasser 200 caractères"),
    poste_fonction: z.string().trim().max(200, "Le poste ne peut dépasser 200 caractères").optional().or(z.literal("")),
    entreprise: z.string().trim().max(200, "L'entreprise ne peut dépasser 200 caractères").optional().or(z.literal("")),
    niveau_etude: z.string().trim().max(200, "Le niveau d'études ne peut dépasser 200 caractères").optional().or(z.literal("")),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStagiaire = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = stagiaireSchema.parse(formData);
      
      const { data: newStagiaire, error } = await supabase
        .from("stagiaires")
        .insert([{
          nom: validatedData.nom,
          prenom: validatedData.prenom,
          email: validatedData.email,
          telephone: validatedData.telephone || null,
          adresse: validatedData.adresse || null,
          ville: validatedData.ville || null,
          code_postal: validatedData.code_postal || null,
          pays: validatedData.pays,
          poste_fonction: validatedData.poste_fonction || null,
          entreprise: validatedData.entreprise || null,
          niveau_etude: validatedData.niveau_etude || null,
        }])
        .select()
        .single();

      if (error) throw error;

      if (photoFile && newStagiaire) {
        const photoUrl = await uploadPhoto(photoFile, newStagiaire.id);
        if (photoUrl) {
          await supabase
            .from("stagiaires")
            .update({ photo_url: photoUrl })
            .eq("id", newStagiaire.id);
        }
      }

      toast({
        title: "Succès",
        description: "Stagiaire créé avec succès",
      });
      
      setIsDialogOpen(false);
      setFormData({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        adresse: "",
        ville: "",
        code_postal: "",
        pays: "France",
        poste_fonction: "",
        entreprise: "",
        niveau_etude: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      loadStagiaires();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error creating stagiaire:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer le stagiaire",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadTemplate = () => {
    const columns = ['Nom', 'Prénom', 'Email', 'Téléphone Indicatif', 'Téléphone', 'Adresse', 'Ville', 'Code Postal', 'Pays', 'Date de Naissance'];
    const sampleData = [{
      'Nom': 'Martin',
      'Prénom': 'Sophie',
      'Email': 'sophie.martin@example.com',
      'Téléphone Indicatif': '+33',
      'Téléphone': '612345678',
      'Adresse': '456 avenue Exemple',
      'Ville': 'Paris',
      'Code Postal': '75001',
      'Pays': 'France',
      'Date de Naissance': '1995-06-15'
    }];
    downloadTemplate(columns, 'stagiaires', sampleData);
    toast({
      title: "Succès",
      description: "Canevas téléchargé avec succès",
    });
  };

  const convertExcelDate = (value: any): string | null => {
    if (!value) return null;
    
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [day, month, year] = value.split('/');
        return `${year}-${month}-${day}`;
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [day, month, year] = value.split('-');
        return `${year}-${month}-${day}`;
      }
    }
    
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const handleImport = async (file: File) => {
    const expectedColumns = ['Nom', 'Prénom', 'Email', 'Téléphone Indicatif', 'Téléphone', 'Adresse', 'Ville', 'Code Postal', 'Pays', 'Date de Naissance'];
    
    await importFromExcel(file, expectedColumns, async (data) => {
      for (const row of data) {
        const dateNaissance = convertExcelDate(row['Date de Naissance']);
        
        const { error } = await supabase.from('stagiaires').insert({
          nom: row['Nom'],
          prenom: row['Prénom'],
          email: row['Email'],
          telephone_indicatif: row['Téléphone Indicatif'] || '+33',
          telephone: row['Téléphone'] || null,
          adresse: row['Adresse'] || null,
          ville: row['Ville'] || null,
          code_postal: row['Code Postal'] || null,
          pays: row['Pays'] || null,
          date_naissance: dateNaissance
        });

        if (error) {
          toast({
            title: "Erreur",
            description: `Erreur lors de l'import de ${row['Nom']} ${row['Prénom']}: ${error.message}`,
            variant: "destructive",
          });
          return;
        }
      }
      
      toast({
        title: "Succès",
        description: `${data.length} stagiaire(s) importé(s) avec succès`,
      });
      loadStagiaires();
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Stagiaires</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez les stagiaires inscrits aux formations
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger Canevas
          </Button>
          {canEdit() && (
            <>
              <label htmlFor="import-stagiaires">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer
                  </span>
                </Button>
              </label>
              <input
                id="import-stagiaires"
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="w-4 h-4 mr-2" />
                Nouveau stagiaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau stagiaire</DialogTitle>
                <DialogDescription>
                  Remplissez les informations du stagiaire
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStagiaire} className="space-y-4">
                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={photoPreview || undefined} />
                      <AvatarFallback>
                        <Camera className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <Label htmlFor="photo">
                        <Button type="button" variant="outline" asChild>
                          <span>
                            <Camera className="w-4 h-4 mr-2" />
                            Choisir une photo
                          </span>
                        </Button>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG ou WEBP (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      value={formData.code_postal}
                      onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poste_fonction">Poste / Fonction</Label>
                  <Input
                    id="poste_fonction"
                    value={formData.poste_fonction}
                    onChange={(e) => setFormData({ ...formData, poste_fonction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entreprise">Entreprise</Label>
                  <Input
                    id="entreprise"
                    value={formData.entreprise}
                    onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niveau_etude">Niveau d'études</Label>
                  <Input
                    id="niveau_etude"
                    value={formData.niveau_etude}
                    onChange={(e) => setFormData({ ...formData, niveau_etude: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Créer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <StagiairesFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        filteredCount={filteredStagiaires.length}
        totalCount={stagiaires.length}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher un stagiaire..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : filteredStagiaires.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Aucun stagiaire trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStagiaires.map((stagiaire) => (
            <Card
              key={stagiaire.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/stagiaires/${stagiaire.id}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={stagiaire.photo_url || undefined} alt={`${stagiaire.prenom} ${stagiaire.nom}`} />
                    <AvatarFallback>
                      {stagiaire.prenom[0]}{stagiaire.nom[0]}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle>{stagiaire.prenom} {stagiaire.nom}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{stagiaire.email}</span>
                </div>
                {stagiaire.telephone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{stagiaire.telephone_indicatif} {stagiaire.telephone}</span>
                  </div>
                )}
                {stagiaire.ville && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{stagiaire.ville}</span>
                  </div>
                )}
                {stagiaire.poste_fonction && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Poste:</strong> {stagiaire.poste_fonction}
                  </div>
                )}
                {stagiaire.entreprise && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Entreprise:</strong> {stagiaire.entreprise}
                  </div>
                )}
                {stagiaire.niveau_etude && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Niveau:</strong> {stagiaire.niveau_etude}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
