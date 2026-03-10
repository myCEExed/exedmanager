import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ModulePlanning, Conflict } from "@/hooks/usePlanningConflicts";

interface ExportFilters {
  programme?: string;
  classe?: string;
  enseignant?: string;
  dateStart?: Date;
  dateEnd?: Date;
}

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

export const usePlanningExport = () => {
  const filterModules = (modules: ModulePlanning[], filters: ExportFilters): ModulePlanning[] => {
    let filtered = [...modules];

    if (filters.programme) {
      filtered = filtered.filter(m => m.classe?.programmes?.id === filters.programme);
    }
    if (filters.classe) {
      filtered = filtered.filter(m => m.classe?.id === filters.classe);
    }
    if (filters.enseignant) {
      filtered = filtered.filter(m =>
        m.affectations.some(a => a.enseignant_id === filters.enseignant)
      );
    }
    if (filters.dateStart) {
      filtered = filtered.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) >= filters.dateStart!;
      });
    }
    if (filters.dateEnd) {
      filtered = filtered.filter(m => {
        if (!m.date_debut) return false;
        return new Date(m.date_debut) <= filters.dateEnd!;
      });
    }

    return filtered.sort((a, b) => {
      if (!a.date_debut || !b.date_debut) return 0;
      return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
    });
  };

  const getLieuDisplay = (module: ModulePlanning): string => {
    if (module.type_lieu === "hors_site" && module.lieu_hors_site) {
      return module.lieu_hors_site;
    }
    return module.salle || "Non défini";
  };

  const getEnseignantsDisplay = (module: ModulePlanning): string => {
    return module.affectations
      .filter(a => a.enseignants)
      .map(a => `${a.enseignants!.prenom} ${a.enseignants!.nom}`)
      .join(", ") || "Non assigné";
  };

  const exportToPDF = (
    modules: ModulePlanning[],
    conflicts: Conflict[],
    filters: ExportFilters,
    programmes: Programme[],
    classes: Classe[]
  ): void => {
    const filteredModules = filterModules(modules, filters);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Planning des Modules", 14, 22);

    // Subtitle with filters
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let subtitle = `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`;
    doc.text(subtitle, 14, 30);

    // Filter info
    let yPos = 36;
    const filterLines: string[] = [];
    
    if (filters.programme) {
      const prog = programmes.find(p => p.id === filters.programme);
      if (prog) filterLines.push(`Programme: ${prog.titre}`);
    }
    if (filters.classe) {
      const cls = classes.find(c => c.id === filters.classe);
      if (cls) filterLines.push(`Classe: ${cls.nom}`);
    }
    if (filters.dateStart) {
      filterLines.push(`Du: ${format(filters.dateStart, "dd/MM/yyyy", { locale: fr })}`);
    }
    if (filters.dateEnd) {
      filterLines.push(`Au: ${format(filters.dateEnd, "dd/MM/yyyy", { locale: fr })}`);
    }

    if (filterLines.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Filtres: ${filterLines.join(" | ")}`, 14, yPos);
      yPos += 6;
    }

    // Stats
    doc.setFontSize(9);
    doc.setTextColor(60);
    const conflictCount = conflicts.filter(c => 
      c.modules.some(m => filteredModules.some(fm => fm.id === m.id))
    ).length;
    doc.text(`Total: ${filteredModules.length} modules | ${conflictCount} conflit(s)`, 14, yPos);
    yPos += 8;

    // Table data
    const tableData = filteredModules.map((module) => {
      const hasConflict = conflicts.some(c => 
        c.modules.some(m => m.id === module.id)
      );
      
      return [
        module.date_debut ? format(new Date(module.date_debut), "dd/MM/yyyy", { locale: fr }) : "-",
        module.date_debut ? format(new Date(module.date_debut), "HH:mm", { locale: fr }) : "-",
        module.date_fin ? format(new Date(module.date_fin), "HH:mm", { locale: fr }) : "-",
        module.titre,
        module.classe?.nom || "-",
        module.classe?.programmes?.titre || "-",
        getLieuDisplay(module),
        getEnseignantsDisplay(module),
        hasConflict ? "⚠️ Oui" : ""
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Début", "Fin", "Module", "Classe", "Programme", "Lieu", "Intervenants", "Conflit"]],
      body: tableData,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 12 },
        2: { cellWidth: 12 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
        7: { cellWidth: 30 },
        8: { cellWidth: 12 }
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      didParseCell: (data) => {
        // Highlight conflict rows
        if (data.section === "body" && data.row.raw && Array.isArray(data.row.raw)) {
          const cellData = data.row.raw as string[];
          if (cellData[8]?.includes("Oui")) {
            data.cell.styles.fillColor = [254, 226, 226];
          }
        }
      }
    });

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${i} sur ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    doc.save(`planning_${timestamp}.pdf`);
  };

  const exportToExcel = (
    modules: ModulePlanning[],
    conflicts: Conflict[],
    filters: ExportFilters,
    programmes: Programme[],
    classes: Classe[]
  ): void => {
    const filteredModules = filterModules(modules, filters);

    // Create data for the main sheet
    const data = filteredModules.map((module) => {
      const hasConflict = conflicts.some(c => 
        c.modules.some(m => m.id === module.id)
      );
      const conflictMessages = conflicts
        .filter(c => c.modules.some(m => m.id === module.id))
        .map(c => c.message)
        .join("; ");

      return {
        "Date": module.date_debut ? format(new Date(module.date_debut), "dd/MM/yyyy", { locale: fr }) : "",
        "Heure début": module.date_debut ? format(new Date(module.date_debut), "HH:mm", { locale: fr }) : "",
        "Heure fin": module.date_fin ? format(new Date(module.date_fin), "HH:mm", { locale: fr }) : "",
        "Durée (h)": module.duree_heures || "",
        "Code module": module.code,
        "Titre": module.titre,
        "Classe": module.classe?.nom || "",
        "Programme": module.classe?.programmes?.titre || "",
        "Code programme": module.classe?.programmes?.code || "",
        "Lieu": getLieuDisplay(module),
        "Intervenants": getEnseignantsDisplay(module),
        "Conflit": hasConflict ? "Oui" : "Non",
        "Détail conflit": conflictMessages
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Date
      { wch: 10 }, // Heure début
      { wch: 10 }, // Heure fin
      { wch: 10 }, // Durée
      { wch: 12 }, // Code module
      { wch: 30 }, // Titre
      { wch: 20 }, // Classe
      { wch: 25 }, // Programme
      { wch: 12 }, // Code programme
      { wch: 20 }, // Lieu
      { wch: 30 }, // Intervenants
      { wch: 8 },  // Conflit
      { wch: 40 }  // Détail conflit
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Planning");

    // Create summary sheet
    const summaryData = [
      { "Information": "Date d'export", "Valeur": format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr }) },
      { "Information": "Nombre de modules", "Valeur": filteredModules.length.toString() },
      { "Information": "Modules avec conflit", "Valeur": filteredModules.filter(m => 
        conflicts.some(c => c.modules.some(cm => cm.id === m.id))
      ).length.toString() }
    ];

    if (filters.programme) {
      const prog = programmes.find(p => p.id === filters.programme);
      if (prog) summaryData.push({ "Information": "Filtre Programme", "Valeur": prog.titre });
    }
    if (filters.classe) {
      const cls = classes.find(c => c.id === filters.classe);
      if (cls) summaryData.push({ "Information": "Filtre Classe", "Valeur": cls.nom });
    }
    if (filters.dateStart) {
      summaryData.push({ "Information": "Date début", "Valeur": format(filters.dateStart, "dd/MM/yyyy", { locale: fr }) });
    }
    if (filters.dateEnd) {
      summaryData.push({ "Information": "Date fin", "Valeur": format(filters.dateEnd, "dd/MM/yyyy", { locale: fr }) });
    }

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Résumé");

    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    XLSX.writeFile(wb, `planning_${timestamp}.xlsx`);
  };

  return {
    exportToPDF,
    exportToExcel,
    filterModules
  };
};
