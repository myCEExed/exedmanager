import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Users, Plus, Filter, Tag, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DiscussionTag {
  id: string;
  nom: string;
  couleur: string;
  type_tag: string;
  classe_id: string | null;
  programme_id: string | null;
}

interface Discussion {
  id: string;
  titre: string;
  type_discussion: string;
  created_at: string;
  classe_id: string;
  classes: { nom: string; sous_code: string };
  tags?: DiscussionTag[];
}

interface Message {
  id: string;
  contenu: string;
  created_at: string;
  user_id: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
}

export default function Discussions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Tags et filtres
  const [allTags, setAllTags] = useState<DiscussionTag[]>([]);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Nouveau formulaire de discussion
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    titre: "",
    classe_id: "",
    type_discussion: "general",
    selectedTags: [] as string[]
  });
  const [classes, setClasses] = useState<Classe[]>([]);
  
  // Création de nouveaux tags
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    filterDiscussions();
  }, [discussions, selectedFilterTags]);

  const loadData = async () => {
    await Promise.all([
      loadDiscussions(),
      loadTags(),
      loadClasses()
    ]);
    setLoading(false);
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from("discussion_tags")
        .select("*")
        .order("type_tag", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      console.error("Error loading tags:", error);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, nom, sous_code")
        .order("nom");

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error("Error loading classes:", error);
    }
  };

  const loadDiscussions = async () => {
    try {
      const { data: discussionsData, error } = await supabase
        .from("discussions")
        .select(`
          *,
          classes (nom, sous_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Charger les tags pour chaque discussion
      const discussionsWithTags = await Promise.all(
        (discussionsData || []).map(async (discussion) => {
          const { data: tagLinks } = await supabase
            .from("discussions_tags")
            .select("tag_id")
            .eq("discussion_id", discussion.id);

          if (tagLinks && tagLinks.length > 0) {
            const tagIds = tagLinks.map(t => t.tag_id);
            const { data: tags } = await supabase
              .from("discussion_tags")
              .select("*")
              .in("id", tagIds);
            
            return { ...discussion, tags: tags || [] };
          }
          return { ...discussion, tags: [] };
        })
      );

      setDiscussions(discussionsWithTags);
    } catch (error: any) {
      console.error("Error loading discussions:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterDiscussions = () => {
    if (selectedFilterTags.length === 0) {
      setFilteredDiscussions(discussions);
      return;
    }

    const filtered = discussions.filter(discussion => {
      const discussionTagIds = discussion.tags?.map(t => t.id) || [];
      return selectedFilterTags.some(tagId => discussionTagIds.includes(tagId));
    });
    setFilteredDiscussions(filtered);
  };

  const loadMessages = async (discussionId: string) => {
    try {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select("*")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Set up realtime subscription for new messages
      const channel = supabase
        .channel(`discussion:${discussionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "discussion_messages",
            filter: `discussion_id=eq.${discussionId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    loadMessages(discussion.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDiscussion || !user) return;

    try {
      const { error } = await supabase
        .from("discussion_messages")
        .insert([
          {
            discussion_id: selectedDiscussion.id,
            user_id: user.id,
            contenu: newMessage.trim(),
          },
        ]);

      if (error) throw error;

      setNewMessage("");
      toast({
        title: "Message envoyé",
        description: "Votre message a été publié",
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour le tag",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTag(true);
    try {
      const { data, error } = await supabase
        .from("discussion_tags")
        .insert([
          {
            nom: newTagName.trim(),
            couleur: newTagColor,
            type_tag: "thematique"
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Ajouter le nouveau tag à la liste et le sélectionner automatiquement
      setAllTags(prev => [...prev, data]);
      setNewDiscussion(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, data.id]
      }));
      
      setNewTagName("");
      setNewTagColor("#6366f1");
      
      toast({
        title: "Tag créé",
        description: `Le tag "${data.nom}" a été créé et sélectionné`,
      });
    } catch (error: any) {
      console.error("Error creating tag:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.titre.trim() || !newDiscussion.classe_id || newDiscussion.selectedTags.length === 0) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs et sélectionner au moins un tag",
        variant: "destructive",
      });
      return;
    }

    try {
      // Créer la discussion
      const { data: discussionData, error: discussionError } = await supabase
        .from("discussions")
        .insert([
          {
            titre: newDiscussion.titre.trim(),
            classe_id: newDiscussion.classe_id,
            type_discussion: newDiscussion.type_discussion,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (discussionError) throw discussionError;

      // Ajouter les tags
      const tagLinks = newDiscussion.selectedTags.map(tagId => ({
        discussion_id: discussionData.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabase
        .from("discussions_tags")
        .insert(tagLinks);

      if (tagsError) throw tagsError;

      // Ajouter le créateur comme participant
      await supabase
        .from("discussion_participants")
        .insert([
          {
            discussion_id: discussionData.id,
            user_id: user?.id,
          },
        ]);

      toast({
        title: "Discussion créée",
        description: "La nouvelle discussion a été créée avec succès",
      });

      setDialogOpen(false);
      setNewDiscussion({ titre: "", classe_id: "", type_discussion: "general", selectedTags: [] });
      loadDiscussions();
    } catch (error: any) {
      console.error("Error creating discussion:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFilterTag = (tagId: string) => {
    setSelectedFilterTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleNewDiscussionTag = (tagId: string) => {
    setNewDiscussion(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }));
  };

  const getTagsByType = (type: string) => allTags.filter(t => t.type_tag === type);

  const getAuthorName = (message: Message) => {
    return message.user_id === user?.id ? "Vous" : "Participant";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discussions</h1>
          <p className="text-muted-foreground">
            Forums de discussion par classe et thématique
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {selectedFilterTags.length > 0 && (
              <Badge variant="secondary" className="ml-2">{selectedFilterTags.length}</Badge>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Créer une nouvelle discussion</DialogTitle>
                <DialogDescription>
                  Remplissez les informations et sélectionnez au moins un tag (obligatoire)
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 max-h-[55vh]">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titre">Titre de la discussion *</Label>
                  <Input
                    id="titre"
                    value={newDiscussion.titre}
                    onChange={(e) => setNewDiscussion(prev => ({ ...prev, titre: e.target.value }))}
                    placeholder="Ex: Questions sur le module 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classe">Classe associée *</Label>
                  <Select
                    value={newDiscussion.classe_id}
                    onValueChange={(value) => setNewDiscussion(prev => ({ ...prev, classe_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>
                          {classe.nom} ({classe.sous_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type de discussion</Label>
                  <Select
                    value={newDiscussion.type_discussion}
                    onValueChange={(value) => setNewDiscussion(prev => ({ ...prev, type_discussion: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Général</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="annonce">Annonce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags (au moins un obligatoire) *
                  </Label>
                  
                  {getTagsByType('classe').length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Classes</p>
                      <div className="flex flex-wrap gap-2">
                        {getTagsByType('classe').map(tag => (
                          <Badge
                            key={tag.id}
                            variant={newDiscussion.selectedTags.includes(tag.id) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            style={newDiscussion.selectedTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                            onClick={() => toggleNewDiscussionTag(tag.id)}
                          >
                            {tag.nom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {getTagsByType('programme').length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Programmes</p>
                      <div className="flex flex-wrap gap-2">
                        {getTagsByType('programme').map(tag => (
                          <Badge
                            key={tag.id}
                            variant={newDiscussion.selectedTags.includes(tag.id) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            style={newDiscussion.selectedTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                            onClick={() => toggleNewDiscussionTag(tag.id)}
                          >
                            {tag.nom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {getTagsByType('thematique').length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Thématiques</p>
                      <div className="flex flex-wrap gap-2">
                        {getTagsByType('thematique').map(tag => (
                          <Badge
                            key={tag.id}
                            variant={newDiscussion.selectedTags.includes(tag.id) ? "default" : "outline"}
                            className="cursor-pointer hover:opacity-80"
                            style={newDiscussion.selectedTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                            onClick={() => toggleNewDiscussionTag(tag.id)}
                          >
                            {tag.nom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Créer un nouveau tag */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Créer un nouveau tag</p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Nom du tag..."
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateTag();
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-1">
                        {["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"].map(color => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${newTagColor === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewTagColor(color)}
                          />
                        ))}
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || isCreatingTag}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {newTagName.trim() && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Aperçu: </span>
                        <Badge style={{ backgroundColor: newTagColor, color: 'white' }}>
                          {newTagName}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {newDiscussion.selectedTags.length === 0 && (
                    <p className="text-sm text-destructive">Veuillez sélectionner au moins un tag</p>
                  )}
                </div>
              </div>
              </div>
              <DialogFooter className="flex-shrink-0 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreateDiscussion}
                  disabled={!newDiscussion.titre.trim() || !newDiscussion.classe_id || newDiscussion.selectedTags.length === 0}
                >
                  Créer la discussion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtrer par tags
              </CardTitle>
              {selectedFilterTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedFilterTags([])}>
                  <X className="w-4 h-4 mr-1" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {getTagsByType('classe').length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Classes</p>
                <div className="flex flex-wrap gap-2">
                  {getTagsByType('classe').map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedFilterTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80"
                      style={selectedFilterTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                      onClick={() => toggleFilterTag(tag.id)}
                    >
                      {tag.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {getTagsByType('programme').length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Programmes</p>
                <div className="flex flex-wrap gap-2">
                  {getTagsByType('programme').map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedFilterTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80"
                      style={selectedFilterTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                      onClick={() => toggleFilterTag(tag.id)}
                    >
                      {tag.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {getTagsByType('thematique').length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Thématiques</p>
                <div className="flex flex-wrap gap-2">
                  {getTagsByType('thematique').map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedFilterTags.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80"
                      style={selectedFilterTags.includes(tag.id) ? { backgroundColor: tag.couleur } : {}}
                      onClick={() => toggleFilterTag(tag.id)}
                    >
                      {tag.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Discussions
              {filteredDiscussions.length !== discussions.length && (
                <Badge variant="secondary">{filteredDiscussions.length}/{discussions.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredDiscussions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {discussions.length === 0 
                      ? "Aucune discussion disponible" 
                      : "Aucune discussion ne correspond aux filtres"
                    }
                  </p>
                ) : (
                  filteredDiscussions.map((discussion) => (
                    <div
                      key={discussion.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDiscussion?.id === discussion.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => handleSelectDiscussion(discussion)}
                    >
                      <div className="font-medium">{discussion.titre}</div>
                      <div className="text-xs opacity-70 mb-2">
                        {discussion.classes?.nom}
                      </div>
                      {discussion.tags && discussion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {discussion.tags.slice(0, 3).map(tag => (
                            <Badge 
                              key={tag.id} 
                              variant="secondary" 
                              className="text-xs px-1.5 py-0"
                              style={{ backgroundColor: tag.couleur, color: 'white' }}
                            >
                              {tag.nom.replace('Classe: ', '').replace('Programme: ', '').slice(0, 15)}
                            </Badge>
                          ))}
                          {discussion.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              +{discussion.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {selectedDiscussion ? selectedDiscussion.titre : "Sélectionnez une discussion"}
            </CardTitle>
            {selectedDiscussion && (
              <CardDescription className="space-y-2">
                <div>Classe: {selectedDiscussion.classes?.nom}</div>
                {selectedDiscussion.tags && selectedDiscussion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDiscussion.tags.map(tag => (
                      <Badge 
                        key={tag.id} 
                        variant="secondary"
                        style={{ backgroundColor: tag.couleur, color: 'white' }}
                      >
                        {tag.nom}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedDiscussion ? (
              <div className="text-center text-muted-foreground py-12">
                Sélectionnez une discussion pour voir les messages
              </div>
            ) : (
              <>
                <ScrollArea className="h-[450px] mb-4 border rounded-lg p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        Aucun message dans cette discussion
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.user_id === user?.id
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-muted"
                          } max-w-[80%] ${message.user_id === user?.id ? "ml-auto" : ""}`}
                        >
                          <p className="text-xs font-medium opacity-80 mb-1">
                            {message.user_id === user?.id ? "Vous" : getAuthorName(message)}
                          </p>
                          <p className="text-sm">{message.contenu}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(message.created_at), "d MMM yyyy HH:mm", {
                              locale: fr,
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Écrivez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
