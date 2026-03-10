import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé. Veuillez vous connecter." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé. Veuillez vous connecter." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's actual role from database
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching user role:", roleError);
    }

    const userRole = roleData?.role || "utilisateur";
    
    // Configuration de l'API LLM (compatible OpenAI)
    // Variables d'environnement à configurer sur votre serveur :
    // - LLM_API_URL : URL de votre API (ex: http://localhost:11434/v1 pour Ollama)
    // - LLM_API_KEY : Clé API (optionnelle pour Ollama local)
    // - LLM_MODEL : Modèle à utiliser (ex: llama3.2, mistral, codellama)
    
    const LLM_API_URL = Deno.env.get("LLM_API_URL") || "http://localhost:11434/v1/chat/completions";
    const LLM_API_KEY = Deno.env.get("LLM_API_KEY") || "";
    const LLM_MODEL = Deno.env.get("LLM_MODEL") || "llama3.2";
    
    // Fallback sur Lovable AI si configuré (pour compatibilité)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useLovableAI = !Deno.env.get("LLM_API_URL") && LOVABLE_API_KEY;
    
    const apiUrl = useLovableAI 
      ? "https://ai.gateway.lovable.dev/v1/chat/completions" 
      : LLM_API_URL;
    
    const apiKey = useLovableAI ? LOVABLE_API_KEY : LLM_API_KEY;
    const model = useLovableAI ? "google/gemini-2.5-flash" : LLM_MODEL;

    // Créer un prompt système adapté au rôle de l'utilisateur
    const systemPrompt = `Tu es un assistant virtuel pour EXED Manager 365, une application de gestion des formations continues pour CentraleSupélec EXED Campus Casablanca.

Rôle de l'utilisateur : ${userRole || "utilisateur"}

CONTEXTE DE L'APPLICATION :
- Gestion des programmes de formation (INTER et INTRA)
- Gestion des classes et modules de formation
- Gestion des enseignants et stagiaires
- Facturation et recouvrements
- Documents et messages
- Statistiques et performance financière

MODULES PAR RÔLE :
- Propriétaire : Accès complet à tous les modules
- Administrateur : Accès complet sauf certains paramètres
- Gestionnaire Scolarité : Programmes, classes, modules, enseignants, stagiaires, documents, messages
- Financier : Factures, recouvrements, performance financière
- Enseignant : Documents, messages, son portail
- Stagiaire : Son parcours, documents, messages

FONCTIONNALITÉS CLÉS :
1. Programmes : Créer des programmes INTER (ouverts) ou INTRA (clients spécifiques)
2. Classes : Organiser les sessions de formation par classe
3. Modules : Planifier les modules avec dates et enseignants
4. Factures : Gérer la facturation avec statuts (envoyée, partielle, payée)
5. Recouvrements : Suivre les paiements et relances
6. Documents : Partager des fichiers par classe
7. Export/Import Excel : Disponible pour la plupart des données

INSTRUCTIONS :
- Réponds en français de manière claire et concise
- Adapte tes réponses au rôle de l'utilisateur
- Si une fonctionnalité n'est pas accessible au rôle, explique poliment
- Pour les questions techniques, guide étape par étape
- Suggère des bonnes pratiques quand c'est pertinent
- Si tu ne sais pas, dis-le honnêtement

EXEMPLES DE QUESTIONS FRÉQUENTES :
- Comment créer un programme ?
- Comment affecter un enseignant à un module ?
- Comment générer une facture ?
- Où voir les statistiques financières ?
- Comment inscrire des stagiaires ?`;

    // Préparer les headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Ajouter l'autorisation seulement si une clé API est fournie
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Crédits épuisés. Veuillez contacter l'administrateur." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("LLM API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la communication avec l'assistant. Vérifiez la configuration du serveur LLM." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in assistant-chat:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur inconnue. Vérifiez que le serveur LLM est accessible." 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
