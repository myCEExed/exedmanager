import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useExcelExport } from './useExcelExport';

interface ClientStats {
  nb_programmes: number;
  nb_stagiaires: number;
  ca_total: number;
  ca_par_annee: { annee: number; montant: number }[];
}

interface Programme {
  id: string;
  code: string;
  titre: string;
  type: string;
  date_debut: string | null;
  date_fin: string | null;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  date_debut: string | null;
  date_fin: string | null;
  programme_titre: string;
  nb_stagiaires: number;
}

interface ExportFilters {
  annee?: string;
  programmeId?: string;
  classeId?: string;
}

export const useClientExport = () => {
  const { exportToExcel } = useExcelExport();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr });
  };

  const exportStatsToPDF = (
    clientName: string,
    stats: ClientStats,
    filters: ExportFilters,
    filteredProgrammes: Programme[],
    filteredClasses: Classe[]
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Statistiques Client: ${clientName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Export date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Active filters
    const activeFilters = [];
    if (filters.annee) activeFilters.push(`Année: ${filters.annee}`);
    if (filters.programmeId) {
      const prog = filteredProgrammes.find(p => p.id === filters.programmeId);
      if (prog) activeFilters.push(`Programme: ${prog.titre}`);
    }
    if (filters.classeId) {
      const classe = filteredClasses.find(c => c.id === filters.classeId);
      if (classe) activeFilters.push(`Classe: ${classe.nom}`);
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
    doc.text('Résumé Statistiques', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Nombre de programmes', stats.nb_programmes.toString()],
        ['Nombre de stagiaires', stats.nb_stagiaires.toString()],
        ['Chiffre d\'affaires total', `${stats.ca_total.toLocaleString('fr-FR')} €`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // CA by year
    if (stats.ca_par_annee.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Chiffre d\'affaires par année', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Année', 'Montant']],
        body: stats.ca_par_annee.map(item => [
          item.annee.toString(),
          `${item.montant.toLocaleString('fr-FR')} €`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Programmes
    if (filteredProgrammes.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Programmes associés', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Code', 'Titre', 'Type', 'Début', 'Fin']],
        body: filteredProgrammes.map(prog => [
          prog.code,
          prog.titre,
          prog.type,
          formatDate(prog.date_debut),
          formatDate(prog.date_fin)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: {
          1: { cellWidth: 60 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Classes
    if (filteredClasses.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Classes associées', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Nom', 'Code', 'Programme', 'Stagiaires', 'Début', 'Fin']],
        body: filteredClasses.map(classe => [
          classe.nom,
          classe.sous_code,
          classe.programme_titre,
          classe.nb_stagiaires.toString(),
          formatDate(classe.date_debut),
          formatDate(classe.date_fin)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
      });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    doc.save(`Client_${clientName.replace(/\s+/g, '_')}_Statistiques_${timestamp}.pdf`);
  };

  const exportStatsToExcel = (
    clientName: string,
    stats: ClientStats,
    filters: ExportFilters,
    filteredProgrammes: Programme[],
    filteredClasses: Classe[]
  ) => {
    // Prepare data for Excel
    const data = [];

    // Stats summary
    data.push({ Section: 'STATISTIQUES', Indicateur: 'Nombre de programmes', Valeur: stats.nb_programmes });
    data.push({ Section: '', Indicateur: 'Nombre de stagiaires', Valeur: stats.nb_stagiaires });
    data.push({ Section: '', Indicateur: 'CA Total (€)', Valeur: stats.ca_total });
    data.push({ Section: '', Indicateur: '', Valeur: '' });

    // CA by year
    if (stats.ca_par_annee.length > 0) {
      data.push({ Section: 'CA PAR ANNÉE', Indicateur: '', Valeur: '' });
      stats.ca_par_annee.forEach(item => {
        data.push({ Section: '', Indicateur: item.annee.toString(), Valeur: item.montant });
      });
      data.push({ Section: '', Indicateur: '', Valeur: '' });
    }

    // Programmes
    if (filteredProgrammes.length > 0) {
      data.push({ Section: 'PROGRAMMES', Indicateur: '', Valeur: '' });
      filteredProgrammes.forEach(prog => {
        data.push({
          Section: '',
          Indicateur: `${prog.code} - ${prog.titre}`,
          Valeur: `${formatDate(prog.date_debut)} - ${formatDate(prog.date_fin)}`
        });
      });
      data.push({ Section: '', Indicateur: '', Valeur: '' });
    }

    // Classes
    if (filteredClasses.length > 0) {
      data.push({ Section: 'CLASSES', Indicateur: '', Valeur: '' });
      filteredClasses.forEach(classe => {
        data.push({
          Section: '',
          Indicateur: `${classe.nom} (${classe.sous_code})`,
          Valeur: `${classe.nb_stagiaires} stagiaires - ${formatDate(classe.date_debut)} à ${formatDate(classe.date_fin)}`
        });
      });
    }

    exportToExcel(data, `Client_${clientName.replace(/\s+/g, '_')}_Statistiques`, 'Statistiques');
  };

  const exportHistoryToPDF = (
    clientName: string,
    programmes: Programme[],
    classes: Classe[]
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Historique Pédagogique: ${clientName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Export date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Programmes
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Programmes (${programmes.length})`, 14, yPos);
    yPos += 8;

    if (programmes.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Code', 'Titre', 'Type', 'Date de début', 'Date de fin']],
        body: programmes.map(prog => [
          prog.code,
          prog.titre,
          prog.type,
          formatDate(prog.date_debut),
          formatDate(prog.date_fin)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: {
          1: { cellWidth: 60 }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Aucun programme associé', 14, yPos);
      yPos += 15;
    }

    // Classes
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Classes (${classes.length})`, 14, yPos);
    yPos += 8;

    if (classes.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Nom', 'Code', 'Programme', 'Stagiaires', 'Début', 'Fin']],
        body: classes.map(classe => [
          classe.nom,
          classe.sous_code,
          classe.programme_titre,
          classe.nb_stagiaires.toString(),
          formatDate(classe.date_debut),
          formatDate(classe.date_fin)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [168, 85, 247] },
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Aucune classe associée', 14, yPos);
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    doc.save(`Client_${clientName.replace(/\s+/g, '_')}_Historique_${timestamp}.pdf`);
  };

  const exportHistoryToExcel = (
    clientName: string,
    programmes: Programme[],
    classes: Classe[]
  ) => {
    const data: any[] = [];

    // Programmes section
    data.push({ Type: 'PROGRAMMES', Nom: '', Code: '', Programme: '', Stagiaires: '', Début: '', Fin: '' });
    programmes.forEach(prog => {
      data.push({
        Type: 'Programme',
        Nom: prog.titre,
        Code: prog.code,
        Programme: prog.type,
        Stagiaires: '-',
        Début: formatDate(prog.date_debut),
        Fin: formatDate(prog.date_fin)
      });
    });

    data.push({ Type: '', Nom: '', Code: '', Programme: '', Stagiaires: '', Début: '', Fin: '' });

    // Classes section
    data.push({ Type: 'CLASSES', Nom: '', Code: '', Programme: '', Stagiaires: '', Début: '', Fin: '' });
    classes.forEach(classe => {
      data.push({
        Type: 'Classe',
        Nom: classe.nom,
        Code: classe.sous_code,
        Programme: classe.programme_titre,
        Stagiaires: classe.nb_stagiaires,
        Début: formatDate(classe.date_debut),
        Fin: formatDate(classe.date_fin)
      });
    });

    exportToExcel(data, `Client_${clientName.replace(/\s+/g, '_')}_Historique`, 'Historique');
  };

  return {
    exportStatsToPDF,
    exportStatsToExcel,
    exportHistoryToPDF,
    exportHistoryToExcel,
  };
};
