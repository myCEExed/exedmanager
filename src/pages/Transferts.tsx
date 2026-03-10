import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Car, Users, Building2, Sparkles, Tag } from "lucide-react";
import { TransfertsTab } from "@/components/transferts/TransfertsTab";
import { VehiculesTab } from "@/components/transferts/VehiculesTab";
import { ChauffeursTab } from "@/components/transferts/ChauffeursTab";
import { HotelsTab } from "@/components/transferts/HotelsTab";
import { TransfertOptimizer } from "@/components/transferts/TransfertOptimizer";
import { TarifsTransfertTab } from "@/components/transferts/TarifsTransfertTab";

const Transferts = () => {
  const { toast } = useToast();
  const { canViewSection, loading: roleLoading } = useUserRole();

  const hasAccess = canViewSection("transferts");

  useEffect(() => {
    if (!roleLoading && !hasAccess) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits pour accéder à cette page.",
        variant: "destructive",
      });
    }
  }, [roleLoading, hasAccess, toast]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Vous n'avez pas les droits pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Transferts</h1>
          <p className="text-muted-foreground mt-1">Pilotage logistique des enseignants</p>
        </div>
      </div>

      <Tabs defaultValue="optimisation" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="optimisation">
            <Sparkles className="h-4 w-4 mr-2" />
            Optimisation
          </TabsTrigger>
          <TabsTrigger value="transferts">
            <Car className="h-4 w-4 mr-2" />
            Transferts
          </TabsTrigger>
          <TabsTrigger value="tarifs">
            <Tag className="h-4 w-4 mr-2" />
            Tarifs
          </TabsTrigger>
          <TabsTrigger value="vehicules">
            <Car className="h-4 w-4 mr-2" />
            Véhicules
          </TabsTrigger>
          <TabsTrigger value="chauffeurs">
            <Users className="h-4 w-4 mr-2" />
            Chauffeurs
          </TabsTrigger>
          <TabsTrigger value="hotels">
            <Building2 className="h-4 w-4 mr-2" />
            Hôtels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optimisation" className="space-y-4">
          <TransfertOptimizer />
        </TabsContent>

        <TabsContent value="transferts" className="space-y-4">
          <TransfertsTab />
        </TabsContent>

        <TabsContent value="tarifs" className="space-y-4">
          <TarifsTransfertTab />
        </TabsContent>

        <TabsContent value="vehicules" className="space-y-4">
          <VehiculesTab />
        </TabsContent>

        <TabsContent value="chauffeurs" className="space-y-4">
          <ChauffeursTab />
        </TabsContent>

        <TabsContent value="hotels" className="space-y-4">
          <HotelsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transferts;