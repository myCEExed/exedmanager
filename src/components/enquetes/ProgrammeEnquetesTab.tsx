import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList, BarChart3 } from "lucide-react";
import { ModelesEnqueteList } from "./ModelesEnqueteList";
import { EnquetesManager } from "./EnquetesManager";

interface ProgrammeEnquetesTabProps {
  programmeId: string;
}

export function ProgrammeEnquetesTab({ programmeId }: ProgrammeEnquetesTabProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="enquetes" className="w-full">
        <TabsList>
          <TabsTrigger value="enquetes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Enquêtes déployées
          </TabsTrigger>
          <TabsTrigger value="modeles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Modèles d'enquêtes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enquetes" className="mt-4">
          <EnquetesManager programmeId={programmeId} />
        </TabsContent>

        <TabsContent value="modeles" className="mt-4">
          <ModelesEnqueteList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
