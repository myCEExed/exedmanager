import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ClientStatsDialog } from "@/components/clients/ClientStatsDialog";

const clientSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(200, "Nom trop long"),
  code: z.string().trim().min(1, "Le code est requis").max(50, "Code trop long"),
  secteur_activite: z.string().max(200, "Secteur trop long").optional(),
  adresse: z.string().max(500, "Adresse trop longue").optional(),
  ville: z.string().max(100, "Ville trop longue").optional(),
  code_postal: z.string().max(20, "Code postal trop long").optional(),
  pays: z.string().max(100, "Pays trop long").optional(),
  telephone: z.string().max(20, "Téléphone trop long").optional(),
  telephone_indicatif: z.string().max(10, "Indicatif trop long").optional(),
  email: z.string().email("Email invalide").max(255, "Email trop long").optional().or(z.literal("")),
  site_web: z.string().url("URL invalide").max(500, "URL trop longue").optional().or(z.literal("")),
  contact_principal_nom: z.string().max(200, "Nom trop long").optional(),
  contact_principal_fonction: z.string().max(100, "Fonction trop longue").optional(),
  contact_principal_email: z.string().email("Email invalide").max(255, "Email trop long").optional().or(z.literal("")),
  contact_principal_telephone: z.string().max(20, "Téléphone trop long").optional(),
  notes: z.string().max(2000, "Notes trop longues").optional(),
});

interface Client {
  id: string;
  nom: string;
  code: string;
  secteur_activite: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  pays: string | null;
  telephone: string | null;
  telephone_indicatif: string | null;
  email: string | null;
  site_web: string | null;
  contact_principal_nom: string | null;
  contact_principal_fonction: string | null;
  contact_principal_email: string | null;
  contact_principal_telephone: string | null;
  notes: string | null;
  created_at: string;
}

const Clients = () => {
  const { user } = useAuth();
  const { canEditSection } = useUserRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nom: "",
      code: "",
      secteur_activite: "",
      adresse: "",
      ville: "",
      code_postal: "",
      pays: "France",
      telephone: "",
      telephone_indicatif: "+33",
      email: "",
      site_web: "",
      contact_principal_nom: "",
      contact_principal_fonction: "",
      contact_principal_email: "",
      contact_principal_telephone: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("nom");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };


  const handleSaveClient = async (values: z.infer<typeof clientSchema>) => {
    try {
      const clientData = {
        nom: values.nom,
        code: values.code,
        secteur_activite: values.secteur_activite || null,
        adresse: values.adresse || null,
        ville: values.ville || null,
        code_postal: values.code_postal || null,
        pays: values.pays || null,
        telephone: values.telephone || null,
        telephone_indicatif: values.telephone_indicatif || null,
        email: values.email || null,
        site_web: values.site_web || null,
        contact_principal_nom: values.contact_principal_nom || null,
        contact_principal_fonction: values.contact_principal_fonction || null,
        contact_principal_email: values.contact_principal_email || null,
        contact_principal_telephone: values.contact_principal_telephone || null,
        notes: values.notes || null,
        created_by: user?.id,
      };

      if (selectedClient) {
        const { error } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", selectedClient.id);

        if (error) throw error;
        toast.success("Client modifié avec succès");
      } else {
        const { error } = await supabase
          .from("clients")
          .insert([clientData]);

        if (error) throw error;
        toast.success("Client créé avec succès");
      }

      setDialogOpen(false);
      setSelectedClient(null);
      form.reset();
      loadClients();
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    form.reset({
      nom: client.nom,
      code: client.code,
      secteur_activite: client.secteur_activite || "",
      adresse: client.adresse || "",
      ville: client.ville || "",
      code_postal: client.code_postal || "",
      pays: client.pays || "France",
      telephone: client.telephone || "",
      telephone_indicatif: client.telephone_indicatif || "+33",
      email: client.email || "",
      site_web: client.site_web || "",
      contact_principal_nom: client.contact_principal_nom || "",
      contact_principal_fonction: client.contact_principal_fonction || "",
      contact_principal_email: client.contact_principal_email || "",
      contact_principal_telephone: client.contact_principal_telephone || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  const handleViewStats = (client: Client) => {
    setSelectedClient(client);
    setStatsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-96">Chargement...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clients</h1>
        <p className="text-muted-foreground">Gestion des organisations clientes pour les programmes INTRA</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {canEditSection("clients") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setSelectedClient(null); form.reset(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? "Modifier le client" : "Nouveau client"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveClient)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom du client" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="Code du client" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="secteur_activite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secteur d'activité</FormLabel>
                        <FormControl>
                          <Input placeholder="Secteur d'activité" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adresse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="ville"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input placeholder="Ville" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code_postal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code Postal</FormLabel>
                          <FormControl>
                            <Input placeholder="Code Postal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <FormControl>
                            <Input placeholder="Pays" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input placeholder="Téléphone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telephone_indicatif"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indicatif</FormLabel>
                          <FormControl>
                            <Input placeholder="Indicatif" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="site_web"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Web</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="Site Web" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <h3 className="text-lg font-semibold mt-4">Contact Principal</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_principal_nom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="Nom du contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_principal_fonction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fonction</FormLabel>
                          <FormControl>
                            <Input placeholder="Fonction du contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contact_principal_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email du contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_principal_telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="Téléphone du contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    {selectedClient ? "Modifier" : "Enregistrer"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="w-8 h-8 text-primary" />
                <span className="text-xs text-muted-foreground">{client.code}</span>
              </div>
              <CardTitle className="mt-2">{client.nom}</CardTitle>
              {client.secteur_activite && (
                <CardDescription>{client.secteur_activite}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {client.ville && (
                  <p className="text-muted-foreground">{client.ville}, {client.pays}</p>
                )}
                {client.contact_principal_nom && (
                  <div>
                    <p className="font-medium">{client.contact_principal_nom}</p>
                    {client.contact_principal_fonction && (
                      <p className="text-xs text-muted-foreground">{client.contact_principal_fonction}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 min-w-[100px]"
                  onClick={() => handleViewStats(client)}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Statistiques</span>
                  <span className="sm:hidden">Stats</span>
                </Button>
                {canEditSection("clients") && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 min-w-[100px]"
                    onClick={() => handleEdit(client)}
                  >
                    Modifier
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Dialog - using new component */}
      <ClientStatsDialog
        open={statsDialogOpen}
        onOpenChange={setStatsDialogOpen}
        client={selectedClient}
      />

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "Aucun client trouvé" : "Aucun client enregistré"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Clients;
