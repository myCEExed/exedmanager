import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, Filter, UserCheck, UserX, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserWithRole {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: string;
  created_at?: string;
}

interface UserManagementProps {
  users: UserWithRole[];
  onUsersChange: (users: UserWithRole[]) => void;
}

const ROLES = [
  { value: "proprietaire", label: "Propriétaire" },
  { value: "administrateur", label: "Administrateur" },
  { value: "responsable_scolarite", label: "Responsable de Scolarité" },
  { value: "gestionnaire_scolarite", label: "Gestionnaire de Scolarité" },
  { value: "direction_financiere", label: "Direction Financière" },
  { value: "financier", label: "Financier" },
  { value: "commercial", label: "Commercial" },
  { value: "collaborateur", label: "Collaborateur" },
  { value: "enseignant", label: "Enseignant" },
  { value: "stagiaire", label: "Stagiaire" },
  { value: "chauffeur", label: "Chauffeur" },
];

const USERS_PER_PAGE = 25;

export const UserManagement = ({ users, onUsersChange }: UserManagementProps) => {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filter by role
      if (roleFilter === "pending" && user.role) return false;
      if (roleFilter === "assigned" && !user.role) return false;
      if (roleFilter !== "all" && roleFilter !== "pending" && roleFilter !== "assigned" && user.role !== roleFilter) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
        const email = (user.email || "").toLowerCase();
        if (!fullName.includes(searchLower) && !email.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, searchTerm]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [roleFilter, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const pendingUsersCount = users.filter((u) => !u.role).length;
  const assignedUsersCount = users.filter((u) => u.role).length;

  const handleRoleChange = async (userId: string, newRole: string, roleId?: string) => {
    if (newRole === "none") {
      if (roleId) {
        await handleDeleteRole(roleId, userId);
      }
      return;
    }

    if (roleId) {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("id", roleId);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le rôle.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: userId, 
          role: newRole as any
        } as any);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le rôle.",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Succès",
      description: "Le rôle a été mis à jour avec succès.",
    });

    // Refresh users list
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles && roles) {
      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: userRole?.role,
          role_id: userRole?.id,
          created_at: profile.created_at,
        };
      });
      onUsersChange(usersWithRoles);
    }
  };

  const handleDeleteRole = async (roleId: string, userId?: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rôle.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "Le rôle a été supprimé.",
    });

    onUsersChange(users.map((user) => 
      user.role_id === roleId ? { ...user, role: undefined, role_id: undefined } : user
    ));
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "proprietaire":
      case "administrateur":
      case "responsable_scolarite":
        return "default";
      case "gestionnaire_scolarite":
      case "direction_financiere":
      case "financier":
      case "commercial":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role?: string) => {
    const found = ROLES.find((r) => r.value === role);
    return found ? found.label : "En attente";
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>
                Gérez les rôles de tous les utilisateurs d'EXED Manager
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <UserX className="h-3 w-3" />
                {pendingUsersCount} en attente
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <UserCheck className="h-3 w-3" />
                {assignedUsersCount} assignés
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-orange-500" />
                    En attente d'affectation
                  </span>
                </SelectItem>
                <SelectItem value="assigned">
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    Rôle assigné
                  </span>
                </SelectItem>
                <SelectItem disabled value="separator">───────────────</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle actuel</TableHead>
                <TableHead>Modifier le rôle</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className={!user.role ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                    <TableCell>
                      <div className="font-medium">
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role ? getRoleBadgeVariant(user.role) : "outline"}
                        className={!user.role ? "border-orange-300 text-orange-600 bg-orange-50" : ""}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || "none"}
                        onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun rôle</SelectItem>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.role_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRole(user.role_id!)}
                          title="Supprimer le rôle"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination and summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredUsers.length > 0 ? (
              <>
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredUsers.length)} sur {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
                {filteredUsers.length !== users.length && ` (${users.length} au total)`}
              </>
            ) : (
              "Aucun utilisateur trouvé"
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
