import * as XLSX from 'xlsx';

export const useExcelTemplate = () => {
  const downloadTemplate = (columns: string[], filename: string, sampleData?: any[]) => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Create template data with column headers and optional sample rows
      const templateData = sampleData || [{}];
      const ws = XLSX.utils.json_to_sheet(templateData, { header: columns });
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, `${filename}_canevas.xlsx`);
      
      return true;
    } catch (error) {
      console.error('Error creating template:', error);
      return false;
    }
  };

  return { downloadTemplate };
};
