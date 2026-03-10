import { useCallback } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TransfertExport {
  id: string;
  date_depart: string;
  date_retour?: string;
  ville_depart: string;
  ville_arrivee: string;
  type_transport: string;
  statut: string;
  cout?: number;
  devise?: string;
  notes?: string;
  enseignants?: { nom: string; prenom: string };
  chauffeurs?: { nom: string; prenom: string };
  vehicules?: { marque: string; modele: string; immatriculation: string };
  hotels?: { nom: string };
  classes?: { nom: string; sous_code: string };
  tarifs_transfert?: { nom: string };
}

export const useTransfertExport = () => {
  const exportToExcel = useCallback((transferts: TransfertExport[], filename?: string) => {
    const data = transferts.map((t) => ({
      "Date départ": format(new Date(t.date_depart), "dd/MM/yyyy HH:mm", { locale: fr }),
      "Date retour": t.date_retour
        ? format(new Date(t.date_retour), "dd/MM/yyyy HH:mm", { locale: fr })
        : "-",
      Enseignant: t.enseignants
        ? `${t.enseignants.nom} ${t.enseignants.prenom}`
        : "-",
      "Ville départ": t.ville_depart,
      "Ville arrivée": t.ville_arrivee,
      "Type transport": t.type_transport,
      Statut: t.statut,
      Chauffeur: t.chauffeurs
        ? `${t.chauffeurs.nom} ${t.chauffeurs.prenom}`
        : "-",
      Véhicule: t.vehicules
        ? `${t.vehicules.marque} ${t.vehicules.modele} (${t.vehicules.immatriculation})`
        : "-",
      Hôtel: t.hotels?.nom || "-",
      Tarif: t.tarifs_transfert?.nom || "-",
      Coût: t.cout || "-",
      Devise: t.devise || "MAD",
      "Classe affectée": t.classes?.sous_code || "-",
      Notes: t.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transferts");

    // Ajuster la largeur des colonnes
    const columnWidths = [
      { wch: 18 }, // Date départ
      { wch: 18 }, // Date retour
      { wch: 25 }, // Enseignant
      { wch: 15 }, // Ville départ
      { wch: 15 }, // Ville arrivée
      { wch: 12 }, // Type transport
      { wch: 10 }, // Statut
      { wch: 20 }, // Chauffeur
      { wch: 30 }, // Véhicule
      { wch: 20 }, // Hôtel
      { wch: 20 }, // Tarif
      { wch: 10 }, // Coût
      { wch: 8 },  // Devise
      { wch: 15 }, // Classe
      { wch: 30 }, // Notes
    ];
    worksheet["!cols"] = columnWidths;

    const defaultFilename = `transferts_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  }, []);

  return { exportToExcel };
};
