import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const useExcelImport = () => {
  const importFromExcel = async (
    file: File,
    expectedColumns: string[],
    onDataParsed: (data: any[]) => Promise<void>
  ) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        toast.error('Le fichier Excel est vide');
        return false;
      }

      // Validate columns
      const fileColumns = Object.keys(jsonData[0] as object);
      const missingColumns = expectedColumns.filter(col => !fileColumns.includes(col));
      
      if (missingColumns.length > 0) {
        toast.error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
        return false;
      }

      await onDataParsed(jsonData);
      return true;
    } catch (error) {
      console.error('Error importing from Excel:', error);
      toast.error('Erreur lors de l\'importation du fichier Excel');
      return false;
    }
  };

  return { importFromExcel };
};
