import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Save, X, User, Briefcase, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";

type RemunerationMode = Database["public"]["Enums"]["remuneration_mode"];

const enseignantSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(200),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(200),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z.string().trim().max(50).optional().or(z.literal("")),
  telephone_indicatif: z.string().trim().max(10).optional().or(z.literal("")),
  pays_residence: z.string().trim().max(200).optional().or(z.literal("")),
  adresse_residence: z.string().trim().max(500).optional().or(z.literal("")),
  mode_remuneration: z.enum(["vacation", "prestation_service", "salarie", "autre"]).optional().nullable(),
  raison_sociale: z.string().trim().max(200).optional().or(z.literal("")),
  numero_identification: z.string().trim().max(100).optional().or(z.literal("")),
  thematiques: z.array(z.string()).optional().nullable(),
});

interface EnseignantProfileEditorProps {
  enseignantId: string;
  onUpdate?: () => void;
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  telephone_indicatif?: string | null;
  pays_residence?: string | null;
  adresse_residence?: string | null;
  mode_remuneration?: RemunerationMode | null;
  raison_sociale?: string | null;
  numero_identification?: string | null;
  thematiques?: string[] | null;
}

export function EnseignantProfileEditor({ enseignantId, onUpdate }: EnseignantProfileEditorProps) {
  const [enseignant, setEnseignant] = useState<Enseignant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Enseignant>>({});

  useEffect(() => {
    loadEnseignant();
  }, [enseignantId]);

  const loadEnseignant = async () => {
    try {
      const { data, error } = await supabase
        .from("enseignants")
        .select("*")
        .eq("id", enseignantId)
        .single();

      if (error) throw error;
      setEnseignant(data);
      setFormData(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du profil");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const validatedData = enseignantSchema.parse(formData);
      
      const { error } = await supabase
        .from("enseignants")
        .update({
          nom: validatedData.nom,
          prenom: validatedData.prenom,
          email: validatedData.email,
          telephone: validatedData.telephone || null,
          telephone_indicatif: validatedData.telephone_indicatif || null,
          pays_residence: validatedData.pays_residence || null,
          adresse_residence: validatedData.adresse_residence || null,
          mode_remuneration: validatedData.mode_remuneration || null,
          raison_sociale: validatedData.raison_sociale || null,
          numero_identification: validatedData.numero_identification || null,
        })
        .eq("id", enseignantId);

      if (error) throw error;

      toast.success("Profil modifié avec succès");
      setIsEditing(false);
      loadEnseignant();
      onUpdate?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erreur lors de la modification");
        console.error(error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (!enseignant) {
    return <div className="text-center py-12">Profil non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ma fiche enseignant</h3>
          <p className="text-sm text-muted-foreground">
            Ces informations sont partagées avec EXED Manager
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setFormData(enseignant);
            }}>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="professionnel" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Professionnel
          </TabsTrigger>
          <TabsTrigger value="residence" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Résidence
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
                  value={isEditing ? (formData.prenom || "") : (enseignant.prenom || "")}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={isEditing ? (formData.nom || "") : (enseignant.nom || "")}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={isEditing ? (formData.email || "") : (enseignant.email || "")}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    value={isEditing ? (formData.telephone_indicatif || "") : (enseignant.telephone_indicatif || "")}
                    onChange={(e) => setFormData({ ...formData, telephone_indicatif: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+33"
                  />
                  <Input
                    className="flex-1"
                    id="telephone"
                    value={isEditing ? (formData.telephone || "") : (enseignant.telephone || "")}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
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
                <Label htmlFor="mode_remuneration">Mode de rémunération</Label>
                <Select
                  value={isEditing ? (formData.mode_remuneration || "") : (enseignant.mode_remuneration || "")}
                  onValueChange={(value) => setFormData({ ...formData, mode_remuneration: value as RemunerationMode })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="prestation_service">Prestation de service</SelectItem>
                    <SelectItem value="salarie">Salarié</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raison_sociale">Raison sociale</Label>
                <Input
                  id="raison_sociale"
                  value={isEditing ? (formData.raison_sociale || "") : (enseignant.raison_sociale || "")}
                  onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="numero_identification">Numéro d'identification</Label>
                <Input
                  id="numero_identification"
                  value={isEditing ? (formData.numero_identification || "") : (enseignant.numero_identification || "")}
                  onChange={(e) => setFormData({ ...formData, numero_identification: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residence">
          <Card>
            <CardHeader>
              <CardTitle>Résidence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pays_residence">Pays de résidence</Label>
                <Input
                  id="pays_residence"
                  value={isEditing ? (formData.pays_residence || "") : (enseignant.pays_residence || "")}
                  onChange={(e) => setFormData({ ...formData, pays_residence: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_residence">Adresse de résidence</Label>
                <Input
                  id="adresse_residence"
                  value={isEditing ? (formData.adresse_residence || "") : (enseignant.adresse_residence || "")}
                  onChange={(e) => setFormData({ ...formData, adresse_residence: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
