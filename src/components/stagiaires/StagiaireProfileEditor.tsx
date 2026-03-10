import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, User, Briefcase, MapPin } from "lucide-react";
import { z } from "zod";

const stagiaireSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(200),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(200),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z.string().trim().max(50).optional().or(z.literal("")),
  telephone_indicatif: z.string().trim().max(10).optional().or(z.literal("")),
  date_naissance: z.string().optional().or(z.literal("")),
  adresse: z.string().trim().max(500).optional().or(z.literal("")),
  ville: z.string().trim().max(200).optional().or(z.literal("")),
  code_postal: z.string().trim().max(20).optional().or(z.literal("")),
  pays: z.string().trim().max(200).optional().or(z.literal("")),
  poste_fonction: z.string().trim().max(200).optional().or(z.literal("")),
  entreprise: z.string().trim().max(200).optional().or(z.literal("")),
  niveau_etude: z.string().trim().max(200).optional().or(z.literal("")),
});

interface StagiaireProfileEditorProps {
  stagiaireId: string;
  onUpdate?: () => void;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  telephone_indicatif: string | null;
  date_naissance: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  pays: string | null;
  poste_fonction: string | null;
  entreprise: string | null;
  niveau_etude: string | null;
  diplomes: unknown;
}

export function StagiaireProfileEditor({ stagiaireId, onUpdate }: StagiaireProfileEditorProps) {
  const { toast } = useToast();
  const [stagiaire, setStagiaire] = useState<Stagiaire | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Stagiaire>>({});

  useEffect(() => {
    loadStagiaire();
  }, [stagiaireId]);

  const loadStagiaire = async () => {
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("*")
        .eq("id", stagiaireId)
        .single();

      if (error) throw error;
      setStagiaire(data);
      setFormData(data);
    } catch (error) {
      console.error("Error loading stagiaire:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du stagiaire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const validatedData = stagiaireSchema.parse(formData);
      
      const { error } = await supabase
        .from("stagiaires")
        .update({
          nom: validatedData.nom,
          prenom: validatedData.prenom,
          email: validatedData.email,
          telephone: validatedData.telephone || null,
          telephone_indicatif: validatedData.telephone_indicatif || null,
          date_naissance: validatedData.date_naissance || null,
          adresse: validatedData.adresse || null,
          ville: validatedData.ville || null,
          code_postal: validatedData.code_postal || null,
          pays: validatedData.pays || null,
          poste_fonction: validatedData.poste_fonction || null,
          entreprise: validatedData.entreprise || null,
          niveau_etude: validatedData.niveau_etude || null,
        })
        .eq("id", stagiaireId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Vos informations ont été mises à jour",
      });
      setIsEditing(false);
      loadStagiaire();
      onUpdate?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les modifications",
          variant: "destructive",
        });
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (!stagiaire) {
    return <div className="text-center py-12">Stagiaire non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ma fiche stagiaire</h3>
          <p className="text-sm text-muted-foreground">
            Ces informations sont partagées dans l'ERP EXED MANAGER
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData(stagiaire);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="personnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="professionnel" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Professionnel
          </TabsTrigger>
          <TabsTrigger value="adresse" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Adresse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={isEditing ? formData.prenom || "" : stagiaire.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={isEditing ? formData.nom || "" : stagiaire.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={isEditing ? formData.email || "" : stagiaire.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    value={isEditing ? formData.telephone_indicatif || "" : stagiaire.telephone_indicatif || ""}
                    onChange={(e) => setFormData({ ...formData, telephone_indicatif: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+33"
                  />
                  <Input
                    className="flex-1"
                    id="telephone"
                    value={isEditing ? formData.telephone || "" : stagiaire.telephone || ""}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_naissance">Date de naissance</Label>
                <Input
                  id="date_naissance"
                  type="date"
                  value={isEditing ? formData.date_naissance || "" : stagiaire.date_naissance || ""}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professionnel">
          <Card>
            <CardHeader>
              <CardTitle>Informations professionnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entreprise">Entreprise</Label>
                <Input
                  id="entreprise"
                  value={isEditing ? formData.entreprise || "" : stagiaire.entreprise || ""}
                  onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poste_fonction">Poste / Fonction</Label>
                <Input
                  id="poste_fonction"
                  value={isEditing ? formData.poste_fonction || "" : stagiaire.poste_fonction || ""}
                  onChange={(e) => setFormData({ ...formData, poste_fonction: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="niveau_etude">Niveau d'études</Label>
                <Input
                  id="niveau_etude"
                  value={isEditing ? formData.niveau_etude || "" : stagiaire.niveau_etude || ""}
                  onChange={(e) => setFormData({ ...formData, niveau_etude: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adresse">
          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={isEditing ? formData.adresse || "" : stagiaire.adresse || ""}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={isEditing ? formData.ville || "" : stagiaire.ville || ""}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    value={isEditing ? formData.code_postal || "" : stagiaire.code_postal || ""}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pays">Pays</Label>
                  <Input
                    id="pays"
                    value={isEditing ? formData.pays || "" : stagiaire.pays || ""}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
