import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, Move, AlignLeft, AlignCenter, AlignRight, Eye, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['div', 'p', 'span', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'small'],
  ALLOWED_ATTR: ['style', 'class', 'href', 'target', 'rel'],
};

interface InvoiceTemplatePreviewProps {
  formData: {
    nom: string;
    logo_url: string;
    en_tete_html: string;
    pied_page_html: string;
    couleur_principale: string;
    afficher_logo: boolean;
    afficher_conditions: boolean;
    conditions_paiement: string;
    mentions_legales: string;
    prefixe_numero: string;
    prochain_numero: number;
    format_numero: string;
    logo_position: string;
    logo_size: string;
    header_alignment: string;
    footer_alignment: string;
  };
  onChange: (field: string, value: any) => void;
}

export function InvoiceTemplatePreview({ formData, onChange }: InvoiceTemplatePreviewProps) {
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 2 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `logos/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("invoice-assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("invoice-assets")
        .getPublicUrl(fileName);

      onChange("logo_url", publicUrl);
      toast({
        title: "Succès",
        description: "Logo uploadé avec succès",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    onChange("logo_url", "");
  };

  const generatePreviewNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const numero = String(formData.prochain_numero).padStart(4, "0");
    
    return formData.format_numero
      .replace("{prefixe}", formData.prefixe_numero)
      .replace("{annee}", String(year))
      .replace("{mois}", month)
      .replace("{numero}", numero);
  };

  const getLogoPositionClass = () => {
    switch (formData.logo_position) {
      case "left": return "justify-start";
      case "center": return "justify-center";
      case "right": return "justify-end";
      default: return "justify-start";
    }
  };

  const getLogoSizeClass = () => {
    switch (formData.logo_size) {
      case "small": return "h-12";
      case "medium": return "h-16";
      case "large": return "h-24";
      default: return "h-16";
    }
  };

  const getAlignmentClass = (alignment: string) => {
    switch (alignment) {
      case "left": return "text-left";
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Prévisualisation</h3>
        <Button
          type="button"
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
          {editMode ? "Aperçu" : "Éditer"}
        </Button>
      </div>

      {/* Editor Controls */}
      {editMode && (
        <Tabs defaultValue="logo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="header">En-tête</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="footer">Pied</TabsTrigger>
          </TabsList>

          <TabsContent value="logo" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <div className="relative">
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="h-16 object-contain border rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="h-16 w-32 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-accent/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Upload..." : "Choisir un fichier"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position du logo</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_position === "left" ? "default" : "outline"}
                    onClick={() => onChange("logo_position", "left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_position === "center" ? "default" : "outline"}
                    onClick={() => onChange("logo_position", "center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_position === "right" ? "default" : "outline"}
                    onClick={() => onChange("logo_position", "right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Taille du logo</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_size === "small" ? "default" : "outline"}
                    onClick={() => onChange("logo_size", "small")}
                  >
                    S
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_size === "medium" ? "default" : "outline"}
                    onClick={() => onChange("logo_size", "medium")}
                  >
                    M
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.logo_size === "large" ? "default" : "outline"}
                    onClick={() => onChange("logo_size", "large")}
                  >
                    L
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="header" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alignement en-tête</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.header_alignment === "left" ? "default" : "outline"}
                    onClick={() => onChange("header_alignment", "left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.header_alignment === "center" ? "default" : "outline"}
                    onClick={() => onChange("header_alignment", "center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.header_alignment === "right" ? "default" : "outline"}
                    onClick={() => onChange("header_alignment", "right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contenu en-tête (HTML)</Label>
              <Textarea
                value={formData.en_tete_html}
                onChange={(e) => onChange("en_tete_html", e.target.value)}
                placeholder="<div>Votre entreprise - Adresse...</div>"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Conditions de paiement</Label>
              <Textarea
                value={formData.conditions_paiement}
                onChange={(e) => onChange("conditions_paiement", e.target.value)}
                placeholder="Paiement à 30 jours..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="footer" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alignement pied de page</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.footer_alignment === "left" ? "default" : "outline"}
                    onClick={() => onChange("footer_alignment", "left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.footer_alignment === "center" ? "default" : "outline"}
                    onClick={() => onChange("footer_alignment", "center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.footer_alignment === "right" ? "default" : "outline"}
                    onClick={() => onChange("footer_alignment", "right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mentions légales</Label>
              <Textarea
                value={formData.mentions_legales}
                onChange={(e) => onChange("mentions_legales", e.target.value)}
                placeholder="TVA non applicable, Article 293B du CGI..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Pied de page personnalisé (HTML)</Label>
              <Textarea
                value={formData.pied_page_html}
                onChange={(e) => onChange("pied_page_html", e.target.value)}
                placeholder="<div>...</div>"
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Preview */}
      <div 
        className="border rounded-lg bg-white shadow-sm overflow-hidden"
        style={{ 
          minHeight: "500px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Header section */}
        <div 
          className={`p-6 border-b ${editMode && activeSection === "header" ? "ring-2 ring-primary" : ""}`}
          onClick={() => editMode && setActiveSection("header")}
          style={{ cursor: editMode ? "pointer" : "default" }}
        >
          {/* Logo */}
          {formData.afficher_logo && (
            <div className={`flex mb-4 ${getLogoPositionClass()}`}>
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className={`${getLogoSizeClass()} object-contain`}
                />
              ) : (
                <div 
                  className={`${getLogoSizeClass()} w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-sm`}
                >
                  Logo
                </div>
              )}
            </div>
          )}

          {/* Header content */}
          <div className={getAlignmentClass(formData.header_alignment)}>
            {formData.en_tete_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.en_tete_html, SANITIZE_CONFIG) }}
                className="text-sm text-gray-600"
              />
            ) : (
              <div className="text-sm text-gray-400 italic">
                En-tête personnalisé (cliquez sur Éditer)
              </div>
            )}
          </div>
        </div>

        {/* Invoice title */}
        <div className="p-6">
          <div className="text-center mb-8">
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: formData.couleur_principale }}
            >
              FACTURE
            </h1>
            <p className="text-lg font-medium text-gray-600">
              {generatePreviewNumber()}
            </p>
          </div>

          {/* Sample content */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2" style={{ color: formData.couleur_principale }}>
                Émetteur
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Votre Entreprise</p>
                <p>123 Rue Exemple</p>
                <p>75000 Paris</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: formData.couleur_principale }}>
                Destinataire
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Client Exemple</p>
                <p>456 Avenue Test</p>
                <p>69000 Lyon</p>
              </div>
            </div>
          </div>

          {/* Sample table */}
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr style={{ backgroundColor: formData.couleur_principale }}>
                <th className="text-left p-3 text-white">Description</th>
                <th className="text-right p-3 text-white">Quantité</th>
                <th className="text-right p-3 text-white">Prix unitaire</th>
                <th className="text-right p-3 text-white">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">Service de formation</td>
                <td className="text-right p-3">1</td>
                <td className="text-right p-3">1 500,00 €</td>
                <td className="text-right p-3">1 500,00 €</td>
              </tr>
              <tr className="border-b">
                <td className="p-3">Matériel pédagogique</td>
                <td className="text-right p-3">10</td>
                <td className="text-right p-3">50,00 €</td>
                <td className="text-right p-3">500,00 €</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="text-right p-3">Total HT</td>
                <td className="text-right p-3">2 000,00 €</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right p-3">TVA (20%)</td>
                <td className="text-right p-3">400,00 €</td>
              </tr>
              <tr className="font-bold text-lg" style={{ color: formData.couleur_principale }}>
                <td colSpan={3} className="text-right p-3">Total TTC</td>
                <td className="text-right p-3">2 400,00 €</td>
              </tr>
            </tfoot>
          </table>

          {/* Conditions */}
          {formData.afficher_conditions && formData.conditions_paiement && (
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold text-sm mb-2">Conditions de paiement</h4>
              <p className="text-sm text-gray-600">{formData.conditions_paiement}</p>
            </div>
          )}
        </div>

        {/* Footer section */}
        <div 
          className={`p-6 border-t bg-gray-50 ${editMode && activeSection === "footer" ? "ring-2 ring-primary" : ""} ${getAlignmentClass(formData.footer_alignment)}`}
          onClick={() => editMode && setActiveSection("footer")}
          style={{ cursor: editMode ? "pointer" : "default" }}
        >
          {formData.mentions_legales && (
            <p className="text-xs text-gray-500 mb-2">{formData.mentions_legales}</p>
          )}
          {formData.pied_page_html ? (
            <div 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.pied_page_html, SANITIZE_CONFIG) }}
              className="text-xs text-gray-500"
            />
          ) : (
            <div className="text-xs text-gray-400 italic">
              Pied de page personnalisé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}