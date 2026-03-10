import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Save, X, User, History } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { EnseignantHistoryTab } from "@/components/enseignants/EnseignantHistoryTab";

const enseignantSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(200),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(200),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z.string().trim().max(50).optional().or(z.literal("")),
  telephone_indicatif: z.string().trim().max(10).optional().or(z.literal("")),
  pays_residence: z.string().trim().max(200).optional().or(z.literal("")),
  adresse_residence: z.string().trim().max(500).optional().or(z.literal("")),
  mode_remuneration: z.enum(["vacation", "prestation_service", "salarie", "autre"]).optional(),
  raison_sociale: z.string().trim().max(200).optional().or(z.literal("")),
  numero_identification: z.string().trim().max(100).optional().or(z.literal("")),
});

export default function EnseignantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("enseignants");
  const [enseignant, setEnseignant] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadEnseignant();
  }, [id]);

  const loadEnseignant = async () => {
    try {
      const { data, error } = await supabase
        .from("enseignants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setEnseignant(data);
      setFormData(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement de l'enseignant");
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
        .eq("id", id);

      if (error) throw error;

      toast.success("Enseignant modifié avec succès");
      setIsEditing(false);
      loadEnseignant();
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
    return <div className="text-center py-12">Enseignant non trouvé</div>;
  }

  const enseignantName = `${enseignant.prenom} ${enseignant.nom}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/enseignants")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {enseignantName}
            </h1>
            <p className="text-muted-foreground">Fiche enseignant</p>
          </div>
        </div>
        {canEdit && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        )}
        {isEditing && (
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

      <Tabs defaultValue="signaletique" className="space-y-6">
        <TabsList>
          <TabsTrigger value="signaletique" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Signalétique
          </TabsTrigger>
          <TabsTrigger value="historique" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signaletique" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={isEditing ? formData.prenom : enseignant.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={isEditing ? formData.nom : enseignant.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={isEditing ? formData.email : enseignant.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    value={isEditing ? formData.telephone_indicatif : enseignant.telephone_indicatif}
                    onChange={(e) => setFormData({ ...formData, telephone_indicatif: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+33"
                  />
                  <Input
                    className="flex-1"
                    id="telephone"
                    value={isEditing ? formData.telephone : enseignant.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations professionnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mode_remuneration">Mode de rémunération</Label>
                <Select
                  value={isEditing ? formData.mode_remuneration : enseignant.mode_remuneration}
                  onValueChange={(value) => setFormData({ ...formData, mode_remuneration: value })}
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
                  value={isEditing ? formData.raison_sociale : enseignant.raison_sociale}
                  onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="numero_identification">Numéro d'identification</Label>
                <Input
                  id="numero_identification"
                  value={isEditing ? formData.numero_identification : enseignant.numero_identification}
                  onChange={(e) => setFormData({ ...formData, numero_identification: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résidence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pays_residence">Pays de résidence</Label>
                <Input
                  id="pays_residence"
                  value={isEditing ? formData.pays_residence : enseignant.pays_residence}
                  onChange={(e) => setFormData({ ...formData, pays_residence: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_residence">Adresse de résidence</Label>
                <Input
                  id="adresse_residence"
                  value={isEditing ? formData.adresse_residence : enseignant.adresse_residence}
                  onChange={(e) => setFormData({ ...formData, adresse_residence: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique">
          <EnseignantHistoryTab 
            enseignantId={id!} 
            enseignantName={enseignantName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
