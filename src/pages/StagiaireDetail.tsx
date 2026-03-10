import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const stagiaireSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(200),
  prenom: z.string().trim().min(1, "Le prénom est requis").max(200),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z.string().trim().max(50).optional().or(z.literal("")),
  telephone_indicatif: z.string().trim().max(10).optional().or(z.literal("")),
  adresse: z.string().trim().max(500).optional().or(z.literal("")),
  ville: z.string().trim().max(200).optional().or(z.literal("")),
  code_postal: z.string().trim().max(20).optional().or(z.literal("")),
  pays: z.string().trim().max(200).optional().or(z.literal("")),
  poste_fonction: z.string().trim().max(200).optional().or(z.literal("")),
  entreprise: z.string().trim().max(200).optional().or(z.literal("")),
  niveau_etude: z.string().trim().max(200).optional().or(z.literal("")),
});

export default function StagiaireDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("stagiaires");
  const [stagiaire, setStagiaire] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadStagiaire();
  }, [id]);

  const loadStagiaire = async () => {
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setStagiaire(data);
      setFormData(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement du stagiaire");
      console.error(error);
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
          adresse: validatedData.adresse || null,
          ville: validatedData.ville || null,
          code_postal: validatedData.code_postal || null,
          pays: validatedData.pays || null,
          poste_fonction: validatedData.poste_fonction || null,
          entreprise: validatedData.entreprise || null,
          niveau_etude: validatedData.niveau_etude || null,
          diplomes: formData.diplomes || [],
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Stagiaire modifié avec succès");
      setIsEditing(false);
      loadStagiaire();
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

  if (!stagiaire) {
    return <div className="text-center py-12">Stagiaire non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/stagiaires")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {stagiaire.prenom} {stagiaire.nom}
            </h1>
            <p className="text-muted-foreground">Fiche stagiaire</p>
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
              setFormData(stagiaire);
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

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input
              id="prenom"
              value={isEditing ? formData.prenom : stagiaire.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={isEditing ? formData.nom : stagiaire.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={isEditing ? formData.email : stagiaire.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <div className="flex gap-2">
              <Input
                className="w-24"
                value={isEditing ? formData.telephone_indicatif : stagiaire.telephone_indicatif}
                onChange={(e) => setFormData({ ...formData, telephone_indicatif: e.target.value })}
                disabled={!isEditing}
                placeholder="+33"
              />
              <Input
                className="flex-1"
                id="telephone"
                value={isEditing ? formData.telephone : stagiaire.telephone}
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
            <Label htmlFor="poste_fonction">Poste / Fonction</Label>
            <Input
              id="poste_fonction"
              value={isEditing ? formData.poste_fonction : stagiaire.poste_fonction}
              onChange={(e) => setFormData({ ...formData, poste_fonction: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise">Entreprise</Label>
            <Input
              id="entreprise"
              value={isEditing ? formData.entreprise : stagiaire.entreprise}
              onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="niveau_etude">Niveau d'études</Label>
            <Input
              id="niveau_etude"
              value={isEditing ? formData.niveau_etude : stagiaire.niveau_etude}
              onChange={(e) => setFormData({ ...formData, niveau_etude: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="diplomes">Diplômes</Label>
            <Textarea
              id="diplomes"
              value={isEditing ? JSON.stringify(formData.diplomes || []) : JSON.stringify(stagiaire.diplomes || [])}
              onChange={(e) => {
                try {
                  setFormData({ ...formData, diplomes: JSON.parse(e.target.value) });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              disabled={!isEditing}
              placeholder="Format JSON: []"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={isEditing ? formData.adresse : stagiaire.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                value={isEditing ? formData.ville : stagiaire.ville}
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code_postal">Code postal</Label>
              <Input
                id="code_postal"
                value={isEditing ? formData.code_postal : stagiaire.code_postal}
                onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pays">Pays</Label>
              <Input
                id="pays"
                value={isEditing ? formData.pays : stagiaire.pays}
                onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
