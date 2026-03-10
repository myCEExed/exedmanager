import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useExcelExport } from './useExcelExport';

interface ModuleHistory {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_heures: number | null;
  classe_nom: string;
  programme_titre: string;
}

interface ClasseStats {
  classe_id: string;
  classe_nom: string;
  sous_code: string;
  programme_titre: string;
  date_debut: string | null;
  date_fin: string | null;
  nb_modules: number;
  total_heures: number;
}

interface EnseignantStats {
  total_modules: number;
  total_classes: number;
  total_heures: number;
}

interface ExportFilters {
  dateDebut?: string;
  dateFin?: string;
  selectedModules?: string[];
}

export const useEnseignantExport = () => {
  const { exportToExcel } = useExcelExport();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr });
  };

  const exportHistoryToPDF = (
    enseignantName: string,
    stats: EnseignantStats,
    modules: ModuleHistory[],
    classes: ClasseStats[],
    filters: ExportFilters
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Historique Formations: ${enseignantName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Export date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Active filters
    const activeFilters = [];
    if (filters.dateDebut) activeFilters.push(`Du: ${formatDate(filters.dateDebut)}`);
    if (filters.dateFin) activeFilters.push(`Au: ${formatDate(filters.dateFin)}`);
    if (filters.selectedModules && filters.selectedModules.length > 0) {
      activeFilters.push(`${filters.selectedModules.length} module(s) sélectionné(s)`);
    }

    if (activeFilters.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Filtres: ${activeFilters.join(' | ')}`, 14, yPos);
      yPos += 10;
    }

    // Statistics summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Modules dispensés', stats.total_modules.toString()],
        ['Classes animées', stats.total_classes.toString()],
        ['Total heures', `${stats.total_heures.toFixed(1)} h`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Modules table
    if (modules.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Modules dispensés (${modules.length})`, 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Code', 'Module', 'Classe', 'Programme', 'Début', 'Fin', 'Heures']],
        body: modules.map(m => [
          m.code,
          m.titre.length > 25 ? m.titre.substring(0, 25) + '...' : m.titre,
          m.classe_nom,
          m.programme_titre.length > 20 ? m.programme_titre.substring(0, 20) + '...' : m.programme_titre,
          formatDate(m.date_debut),
          formatDate(m.date_fin),
          m.duree_heures ? `${m.duree_heures}h` : '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Classes table
    if (classes.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Classes animées (${classes.length})`, 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Classe', 'Code', 'Programme', 'Modules', 'Heures', 'Début', 'Fin']],
        body: classes.map(c => [
          c.classe_nom,
          c.sous_code,
          c.programme_titre.length > 25 ? c.programme_titre.substring(0, 25) + '...' : c.programme_titre,
          c.nb_modules.toString(),
          `${c.total_heures.toFixed(1)}h`,
          formatDate(c.date_debut),
          formatDate(c.date_fin)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
        styles: { fontSize: 8 },
      });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    doc.save(`Enseignant_${enseignantName.replace(/\s+/g, '_')}_Historique_${timestamp}.pdf`);
  };

  const exportHistoryToExcel = (
    enseignantName: string,
    stats: EnseignantStats,
    modules: ModuleHistory[],
    classes: ClasseStats[],
    filters: ExportFilters
  ) => {
    const data: any[] = [];

    // Stats section
    data.push({ Section: 'RÉSUMÉ', Élément: 'Modules dispensés', Valeur: stats.total_modules });
    data.push({ Section: '', Élément: 'Classes animées', Valeur: stats.total_classes });
    data.push({ Section: '', Élément: 'Total heures', Valeur: stats.total_heures });
    data.push({ Section: '', Élément: '', Valeur: '' });

    // Filters applied
    if (filters.dateDebut || filters.dateFin || (filters.selectedModules && filters.selectedModules.length > 0)) {
      data.push({ Section: 'FILTRES APPLIQUÉS', Élément: '', Valeur: '' });
      if (filters.dateDebut) data.push({ Section: '', Élément: 'Date début', Valeur: formatDate(filters.dateDebut) });
      if (filters.dateFin) data.push({ Section: '', Élément: 'Date fin', Valeur: formatDate(filters.dateFin) });
      if (filters.selectedModules && filters.selectedModules.length > 0) {
        data.push({ Section: '', Élément: 'Modules sélectionnés', Valeur: filters.selectedModules.length });
      }
      data.push({ Section: '', Élément: '', Valeur: '' });
    }

    // Modules section
    data.push({ Section: 'MODULES DISPENSÉS', Élément: '', Valeur: '' });
    modules.forEach(m => {
      data.push({
        Section: '',
        Élément: `${m.code} - ${m.titre}`,
        Valeur: `${m.classe_nom} | ${formatDate(m.date_debut)} - ${formatDate(m.date_fin)} | ${m.duree_heures || 0}h`
      });
    });
    data.push({ Section: '', Élément: '', Valeur: '' });

    // Classes section
    data.push({ Section: 'CLASSES ANIMÉES', Élément: '', Valeur: '' });
    classes.forEach(c => {
      data.push({
        Section: '',
        Élément: `${c.classe_nom} (${c.sous_code})`,
        Valeur: `${c.programme_titre} | ${c.nb_modules} modules | ${c.total_heures}h`
      });
    });

    exportToExcel(data, `Enseignant_${enseignantName.replace(/\s+/g, '_')}_Historique`, 'Historique');
  };

  return {
    exportHistoryToPDF,
    exportHistoryToExcel,
  };
};
