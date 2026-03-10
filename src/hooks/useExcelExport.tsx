import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const useExcelExport = () => {
  const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const fullFilename = `${filename}_${timestamp}.xlsx`;
      
      // Write and download file
      XLSX.writeFile(wb, fullFilename);
      
      return true;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      return false;
    }
  };

  return { exportToExcel };
};
