import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useExcelExport } from './useExcelExport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface StagiaireWithDetails {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  programmes: { id: string; titre: string; code: string }[];
  modules: { id: string; titre: string; code: string }[];
  classes: { id: string; nom: string; code: string }[];
}

export interface ExportFilters {
  dateDebut: Date | null;
  dateFin: Date | null;
  programmes: string[];
  modules: string[];
  classes: string[];
}

export const useStagiaireExport = () => {
  const { exportToExcel } = useExcelExport();

  const exportToPDF = (stagiaires: StagiaireWithDetails[], filters: ExportFilters) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text('Liste des Stagiaires', pageWidth / 2, 20, { align: 'center' });

    // Filters info
    doc.setFontSize(10);
    let yPos = 30;
    const filterLines: string[] = [];
    
    if (filters.dateDebut || filters.dateFin) {
      const debut = filters.dateDebut ? format(filters.dateDebut, 'dd/MM/yyyy', { locale: fr }) : '-';
      const fin = filters.dateFin ? format(filters.dateFin, 'dd/MM/yyyy', { locale: fr }) : '-';
      filterLines.push(`Période: ${debut} au ${fin}`);
    }
    if (filters.programmes.length > 0) {
      filterLines.push(`Programmes: ${filters.programmes.length} sélectionné(s)`);
    }
    if (filters.modules.length > 0) {
      filterLines.push(`Modules: ${filters.modules.length} sélectionné(s)`);
    }
    if (filters.classes.length > 0) {
      filterLines.push(`Classes: ${filters.classes.length} sélectionnée(s)`);
    }

    if (filterLines.length > 0) {
      doc.setTextColor(100);
      filterLines.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 5;
      });
      doc.setTextColor(0);
      yPos += 5;
    }

    // Summary statistics
    const totalProgrammes = new Set(stagiaires.flatMap(s => s.programmes.map(p => p.id))).size;
    const totalModules = new Set(stagiaires.flatMap(s => s.modules.map(m => m.id))).size;
    const totalClasses = new Set(stagiaires.flatMap(s => s.classes.map(c => c.id))).size;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Résumé global:', 14, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total stagiaires: ${stagiaires.length}`, 14, yPos);
    yPos += 5;
    doc.text(`Programmes uniques: ${totalProgrammes}`, 14, yPos);
    yPos += 5;
    doc.text(`Modules uniques: ${totalModules}`, 14, yPos);
    yPos += 5;
    doc.text(`Classes uniques: ${totalClasses}`, 14, yPos);
    yPos += 10;

    // Main table - Qualitative data
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Détails par stagiaire:', 14, yPos);
    yPos += 5;

    const tableData = stagiaires.map(s => [
      `${s.prenom} ${s.nom}`,
      s.email,
      s.programmes.map(p => p.titre).join(', ') || '-',
      s.modules.map(m => m.titre).join(', ') || '-',
      s.classes.map(c => c.nom).join(', ') || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Stagiaire', 'Email', 'Programmes', 'Modules', 'Classes']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
      },
    });

    // Quantitative summary table on new page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Statistiques quantitatives par stagiaire', pageWidth / 2, 20, { align: 'center' });

    const quantData = stagiaires.map(s => [
      `${s.prenom} ${s.nom}`,
      s.programmes.length.toString(),
      s.modules.length.toString(),
      s.classes.length.toString(),
    ]);

    // Add totals row
    quantData.push([
      'TOTAL',
      stagiaires.reduce((sum, s) => sum + s.programmes.length, 0).toString(),
      stagiaires.reduce((sum, s) => sum + s.modules.length, 0).toString(),
      stagiaires.reduce((sum, s) => sum + s.classes.length, 0).toString(),
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Stagiaire', 'Nb Programmes', 'Nb Modules', 'Nb Classes']],
      body: quantData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: (data) => {
        if (data.row.index === quantData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
      },
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    doc.save(`stagiaires_export_${timestamp}.pdf`);
  };

  const exportToExcelWithDetails = (stagiaires: StagiaireWithDetails[], filters: ExportFilters) => {
    // Sheet 1: Qualitative data
    const qualitativeData = stagiaires.map(s => ({
      'Nom': s.nom,
      'Prénom': s.prenom,
      'Email': s.email,
      'Téléphone': s.telephone || '',
      'Programmes': s.programmes.map(p => p.titre).join(', '),
      'Modules': s.modules.map(m => m.titre).join(', '),
      'Classes': s.classes.map(c => c.nom).join(', '),
    }));

    // Sheet 2: Quantitative data
    const quantitativeData = stagiaires.map(s => ({
      'Nom': s.nom,
      'Prénom': s.prenom,
      'Nb Programmes': s.programmes.length,
      'Nb Modules': s.modules.length,
      'Nb Classes': s.classes.length,
    }));

    // Add totals
    quantitativeData.push({
      'Nom': 'TOTAL',
      'Prénom': '',
      'Nb Programmes': stagiaires.reduce((sum, s) => sum + s.programmes.length, 0),
      'Nb Modules': stagiaires.reduce((sum, s) => sum + s.modules.length, 0),
      'Nb Classes': stagiaires.reduce((sum, s) => sum + s.classes.length, 0),
    });

    // For now, export qualitative data with counts
    const combinedData = stagiaires.map(s => ({
      'Nom': s.nom,
      'Prénom': s.prenom,
      'Email': s.email,
      'Téléphone': s.telephone || '',
      'Programmes': s.programmes.map(p => p.titre).join(', '),
      'Nb Programmes': s.programmes.length,
      'Modules': s.modules.map(m => m.titre).join(', '),
      'Nb Modules': s.modules.length,
      'Classes': s.classes.map(c => c.nom).join(', '),
      'Nb Classes': s.classes.length,
    }));

    // Add totals row
    combinedData.push({
      'Nom': 'TOTAL',
      'Prénom': `${stagiaires.length} stagiaires`,
      'Email': '',
      'Téléphone': '',
      'Programmes': '',
      'Nb Programmes': stagiaires.reduce((sum, s) => sum + s.programmes.length, 0),
      'Modules': '',
      'Nb Modules': stagiaires.reduce((sum, s) => sum + s.modules.length, 0),
      'Classes': '',
      'Nb Classes': stagiaires.reduce((sum, s) => sum + s.classes.length, 0),
    });

    exportToExcel(combinedData, 'stagiaires_details', 'Stagiaires');
    return true;
  };

  return {
    exportToPDF,
    exportToExcelWithDetails,
  };
};
