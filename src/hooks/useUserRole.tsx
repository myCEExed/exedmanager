import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole =
  | "proprietaire"
  | "administrateur"
  | "responsable_scolarite"
  | "gestionnaire_scolarite"
  | "direction_financiere"
  | "financier"
  | "commercial"
  | "collaborateur"
  | "enseignant"
  | "stagiaire"
  | "chauffeur"
  | null;

// Définition des permissions par section
const SECTION_PERMISSIONS: Record<string, {
  view: UserRole[];
  edit: UserRole[];
}> = {
  // Tableau de bord - tous peuvent consulter (sauf chauffeur qui a son portail dédié)
  dashboard: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "direction_financiere", "financier", "commercial", "collaborateur", "enseignant", "stagiaire"],
    edit: ["proprietaire", "administrateur"],
  },
  // Programmes - Collaborateur en consultation seule
  programmes: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "commercial", "financier", "collaborateur"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
  // Classes - Collaborateur en consultation seule
  classes: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier", "collaborateur"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
  // Planning - Collaborateur en consultation seule
  planning: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "commercial", "financier", "direction_financiere", "collaborateur"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
  // Modules - Collaborateur en consultation seule
  modules: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "commercial", "financier", "collaborateur"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
  // Clients - Collaborateur en consultation seule
  clients: {
    view: ["proprietaire", "administrateur", "gestionnaire_scolarite", "commercial", "financier", "collaborateur"],
    edit: ["proprietaire", "administrateur", "gestionnaire_scolarite", "financier"],
  },
  // Enseignants - Collaborateur en consultation seule
  enseignants: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier", "collaborateur"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier"],
  },
  // Stagiaires - Financier en consultation seule
  stagiaires: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
  // Trombinoscope - Collaborateur en consultation seule
  trombinoscope: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "financier", "collaborateur"],
    edit: [],
  },
  // CRM - Accès complet pour Commercial, Financier en modification
  crm: {
    view: ["proprietaire", "administrateur", "gestionnaire_scolarite", "financier", "commercial"],
    edit: ["proprietaire", "administrateur", "gestionnaire_scolarite", "financier", "commercial"],
  },
  // Factures - Financier peut modifier
  factures: {
    view: ["proprietaire", "administrateur", "financier", "direction_financiere"],
    edit: ["proprietaire", "administrateur", "financier"],
  },
  // Recouvrements - Financier peut modifier
  recouvrements: {
    view: ["proprietaire", "administrateur", "financier", "direction_financiere"],
    edit: ["proprietaire", "administrateur", "financier"],
  },
  // Performance Financière - Consultation seule pour tous
  performance_financiere: {
    view: ["proprietaire", "administrateur", "financier", "direction_financiere"],
    edit: [],
  },
  // Transferts - Financier en consultation seule
  transferts: {
    view: ["proprietaire", "administrateur", "gestionnaire_scolarite", "financier"],
    edit: ["proprietaire", "administrateur", "gestionnaire_scolarite"],
  },
  // Documents - Financier en consultation seule
  documents: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant"],
  },
  // Messages - Financier en consultation seule
  messages: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire"],
  },
  // Discussions - Financier en consultation seule
  discussions: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire"],
  },
  // Invitations - Financier en consultation seule
  invitations: {
    view: ["proprietaire", "administrateur", "gestionnaire_scolarite", "financier"],
    edit: ["proprietaire", "administrateur", "gestionnaire_scolarite"],
  },
  // Contenu Pédagogique - Financier en consultation seule
  contenu_pedagogique: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "collaborateur", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant"],
  },
  // Devoirs - Financier en consultation seule
  devoirs: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant"],
  },
  // Notes - Financier en consultation seule
  notes: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant"],
  },
  // Assiduité - Financier en consultation seule
  assiduite: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant"],
  },
  // Progression - Collaborateur en consultation seule
  progression: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "enseignant", "stagiaire", "financier", "collaborateur"],
    edit: [],
  },
  // Restauration - Financier peut modifier
  restauration: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "financier"],
  },
  // Contrats - Financier peut modifier
  contrats: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "enseignant", "financier"],
    edit: ["proprietaire", "administrateur", "financier"],
  },
  // Administration - Pas d'accès pour Financier
  admin: {
    view: ["administrateur"],
    edit: ["administrateur"],
  },
  // Documentation - Tous peuvent consulter (sauf chauffeur qui a son portail dédié)
  documentation: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "direction_financiere", "financier", "commercial", "collaborateur", "enseignant", "stagiaire"],
    edit: [],
  },
  // Modules Catalogue - Financier en consultation seule
  modules_catalogue: {
    view: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite", "commercial", "financier"],
    edit: ["proprietaire", "administrateur", "responsable_scolarite", "gestionnaire_scolarite"],
  },
};

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [assignedProgrammes, setAssignedProgrammes] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (authLoading) return;

      setLoading(true);

      if (!user) {
        setRole(null);
        setAssignedProgrammes([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          const fetchedRole = (data?.role as UserRole) || null;
          setRole(fetchedRole);
          
          // Si c'est un gestionnaire, charger ses programmes assignés
          if (fetchedRole === "gestionnaire_scolarite") {
            const { data: programmes } = await supabase
              .from("programme_gestionnaires")
              .select("programme_id")
              .eq("gestionnaire_user_id", user.id);
            
            setAssignedProgrammes(programmes?.map(p => p.programme_id) || []);
          } else {
            setAssignedProgrammes([]);
          }
        }
      } catch (err) {
        console.error("Error in fetchUserRole:", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, authLoading]);

  const hasRole = useCallback(
    (requiredRole: UserRole) => {
      if (!role) return false;
      return role === requiredRole;
    },
    [role]
  );

  // Vérifie si l'utilisateur peut voir une section
  const canViewSection = useCallback(
    (section: string) => {
      if (!role) return false;
      const permissions = SECTION_PERMISSIONS[section];
      if (!permissions) return true; // Si pas de permissions définies, autoriser
      return permissions.view.includes(role);
    },
    [role]
  );

  // Vérifie si l'utilisateur peut modifier une section
  const canEditSection = useCallback(
    (section: string) => {
      if (!role) return false;
      const permissions = SECTION_PERMISSIONS[section];
      if (!permissions) return false;
      return permissions.edit.includes(role);
    },
    [role]
  );

  const canEdit = useCallback(() => {
    return role === "administrateur" || role === "gestionnaire_scolarite" || role === "responsable_scolarite" || role === "proprietaire";
  }, [role]);

  const canDelete = useCallback(() => {
    return role === "administrateur" || role === "proprietaire";
  }, [role]);

  const isAdmin = useCallback(() => {
    return role === "administrateur" || role === "proprietaire";
  }, [role]);

  const canManageFinances = useCallback(() => {
    return (
      role === "administrateur" ||
      role === "financier" ||
      role === "proprietaire" ||
      role === "direction_financiere"
    );
  }, [role]);

  const isProprietaire = useCallback(() => {
    return role === "proprietaire";
  }, [role]);

  const isResponsableScolarite = useCallback(() => {
    return role === "responsable_scolarite";
  }, [role]);

  const isDirectionFinanciere = useCallback(() => {
    return role === "direction_financiere";
  }, [role]);

  const isCommercial = useCallback(() => {
    return role === "commercial";
  }, [role]);

  const isFinancier = useCallback(() => {
    return role === "financier";
  }, [role]);

  const canManageScolarite = useCallback(() => {
    return (
      role === "administrateur" ||
      role === "responsable_scolarite" ||
      role === "gestionnaire_scolarite" ||
      role === "proprietaire"
    );
  }, [role]);

  // Vérifie si un gestionnaire peut gérer un programme spécifique
  const canManageProgramme = useCallback(
    (programmeId: string) => {
      if (!role) return false;
      // Admin, proprio, resp scolarité peuvent tout gérer
      if (["administrateur", "proprietaire", "responsable_scolarite"].includes(role)) {
        return true;
      }
      // Gestionnaire uniquement si assigné
      if (role === "gestionnaire_scolarite") {
        return assignedProgrammes.includes(programmeId);
      }
      return false;
    },
    [role, assignedProgrammes]
  );

  // Vérifie si c'est un commercial (consultation seule sur certaines sections)
  const isViewOnlyForSection = useCallback(
    (section: string) => {
      if (!role) return true;
      const permissions = SECTION_PERMISSIONS[section];
      if (!permissions) return false;
      return permissions.view.includes(role) && !permissions.edit.includes(role);
    },
    [role]
  );

  return {
    role,
    loading,
    assignedProgrammes,
    hasRole,
    canEdit,
    canDelete,
    isAdmin,
    canManageFinances,
    isProprietaire,
    isResponsableScolarite,
    isDirectionFinanciere,
    isCommercial,
    isFinancier,
    canManageScolarite,
    canManageProgramme,
    canViewSection,
    canEditSection,
    isViewOnlyForSection,
  };
};
