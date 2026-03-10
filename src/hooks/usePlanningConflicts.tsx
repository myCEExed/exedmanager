import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ModulePlanning {
  id: string;
  titre: string;
  code: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_heures: number | null;
  salle: string | null;
  type_lieu: string | null;
  lieu_hors_site: string | null;
  classe_id: string;
  classe: {
    id: string;
    nom: string;
    sous_code: string;
    programme_id: string;
    programmes: {
      id: string;
      titre: string;
      code: string;
    } | null;
  } | null;
  affectations: {
    id: string;
    confirmee: boolean | null;
    enseignant_id: string;
    enseignants: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      photo_url: string | null;
    } | null;
  }[];
}

export interface Conflict {
  id: string;
  type: "enseignant" | "stagiaire";
  severity: "high" | "medium";
  entity: {
    id: string;
    nom: string;
    prenom: string;
    email?: string;
  };
  modules: ModulePlanning[];
  overlapStart: string;
  overlapEnd: string;
  message: string;
}

export const usePlanningConflicts = () => {
  const [modules, setModules] = useState<ModulePlanning[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          titre,
          code,
          date_debut,
          date_fin,
          duree_heures,
          salle,
          type_lieu,
          lieu_hors_site,
          classe_id,
          classes:classe_id (
            id,
            nom,
            sous_code,
            programme_id,
            programmes:programme_id (
              id,
              titre,
              code
            )
          ),
          affectations (
            id,
            confirmee,
            enseignant_id,
            enseignants (
              id,
              nom,
              prenom,
              email,
              photo_url
            )
          )
        `)
        .not("date_debut", "is", null)
        .order("date_debut", { ascending: true });

      if (error) throw error;
      
      const formattedModules = (data || []).map((m: any) => ({
        ...m,
        classe: m.classes
      }));
      
      setModules(formattedModules);
      detectConflicts(formattedModules);
    } catch (error) {
      console.error("Erreur lors du chargement des modules:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const detectConflicts = async (modulesData: ModulePlanning[]) => {
    const detectedConflicts: Conflict[] = [];
    
    // 1. Detect teacher conflicts
    const teacherModules: Record<string, ModulePlanning[]> = {};
    
    modulesData.forEach((module) => {
      if (!module.date_debut || !module.date_fin) return;
      
      module.affectations.forEach((aff) => {
        if (!aff.enseignants) return;
        const teacherId = aff.enseignant_id;
        if (!teacherModules[teacherId]) {
          teacherModules[teacherId] = [];
        }
        teacherModules[teacherId].push(module);
      });
    });

    Object.entries(teacherModules).forEach(([teacherId, teacherMods]) => {
      if (teacherMods.length < 2) return;
      
      for (let i = 0; i < teacherMods.length; i++) {
        for (let j = i + 1; j < teacherMods.length; j++) {
          const m1 = teacherMods[i];
          const m2 = teacherMods[j];
          
          if (!m1.date_debut || !m1.date_fin || !m2.date_debut || !m2.date_fin) continue;
          
          const start1 = new Date(m1.date_debut);
          const end1 = new Date(m1.date_fin);
          const start2 = new Date(m2.date_debut);
          const end2 = new Date(m2.date_fin);
          
          // Check overlap
          if (start1 < end2 && start2 < end1) {
            const overlapStart = start1 > start2 ? start1 : start2;
            const overlapEnd = end1 < end2 ? end1 : end2;
            
            const teacher = m1.affectations.find(a => a.enseignant_id === teacherId)?.enseignants;
            if (!teacher) continue;
            
            detectedConflicts.push({
              id: `teacher-${teacherId}-${m1.id}-${m2.id}`,
              type: "enseignant",
              severity: "high",
              entity: {
                id: teacher.id,
                nom: teacher.nom,
                prenom: teacher.prenom,
                email: teacher.email
              },
              modules: [m1, m2],
              overlapStart: overlapStart.toISOString(),
              overlapEnd: overlapEnd.toISOString(),
              message: `${teacher.prenom} ${teacher.nom} est affecté à deux modules en même temps`
            });
          }
        }
      }
    });

    // 2. Detect student conflicts
    try {
      // Get all inscriptions with student info
      const { data: inscriptions, error } = await supabase
        .from("inscriptions")
        .select(`
          stagiaire_id,
          classe_id,
          stagiaires (
            id,
            nom,
            prenom,
            email
          )
        `);

      if (error) throw error;

      // Group classes by student
      const studentClasses: Record<string, { stagiaire: any; classeIds: string[] }> = {};
      
      (inscriptions || []).forEach((insc: any) => {
        if (!insc.stagiaires) return;
        const studentId = insc.stagiaire_id;
        if (!studentClasses[studentId]) {
          studentClasses[studentId] = {
            stagiaire: insc.stagiaires,
            classeIds: []
          };
        }
        studentClasses[studentId].classeIds.push(insc.classe_id);
      });

      // For students in multiple classes, check module overlaps
      Object.entries(studentClasses).forEach(([studentId, { stagiaire, classeIds }]) => {
        if (classeIds.length < 2) return;
        
        // Get modules for each class
        const studentModules = modulesData.filter(m => 
          m.classe_id && classeIds.includes(m.classe_id)
        );
        
        if (studentModules.length < 2) return;
        
        for (let i = 0; i < studentModules.length; i++) {
          for (let j = i + 1; j < studentModules.length; j++) {
            const m1 = studentModules[i];
            const m2 = studentModules[j];
            
            // Only check if different classes
            if (m1.classe_id === m2.classe_id) continue;
            if (!m1.date_debut || !m1.date_fin || !m2.date_debut || !m2.date_fin) continue;
            
            const start1 = new Date(m1.date_debut);
            const end1 = new Date(m1.date_fin);
            const start2 = new Date(m2.date_debut);
            const end2 = new Date(m2.date_fin);
            
            // Check overlap
            if (start1 < end2 && start2 < end1) {
              const overlapStart = start1 > start2 ? start1 : start2;
              const overlapEnd = end1 < end2 ? end1 : end2;
              
              detectedConflicts.push({
                id: `student-${studentId}-${m1.id}-${m2.id}`,
                type: "stagiaire",
                severity: "medium",
                entity: {
                  id: stagiaire.id,
                  nom: stagiaire.nom,
                  prenom: stagiaire.prenom,
                  email: stagiaire.email
                },
                modules: [m1, m2],
                overlapStart: overlapStart.toISOString(),
                overlapEnd: overlapEnd.toISOString(),
                message: `${stagiaire.prenom} ${stagiaire.nom} a deux modules qui se chevauchent`
              });
            }
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de la détection des conflits stagiaires:", error);
    }

    setConflicts(detectedConflicts);
  };

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  return {
    modules,
    conflicts,
    loading,
    refresh: loadModules
  };
};
