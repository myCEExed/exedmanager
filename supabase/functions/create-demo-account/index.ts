import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration des comptes démo par rôle
const DEMO_ACCOUNTS: Record<string, { email: string; firstName: string; lastName: string }> = {
  proprietaire: { email: 'demo.proprietaire@exed.demo', firstName: 'Pierre', lastName: 'Propriétaire' },
  responsable_scolarite: { email: 'demo.resp.scolarite@exed.demo', firstName: 'Sophie', lastName: 'Responsable' },
  gestionnaire_scolarite: { email: 'demo.gest.scolarite@exed.demo', firstName: 'Lucas', lastName: 'Gestionnaire' },
  direction_financiere: { email: 'demo.dir.financiere@exed.demo', firstName: 'Claire', lastName: 'Directrice' },
  financier: { email: 'demo.financier@exed.demo', firstName: 'Marc', lastName: 'Comptable' },
  commercial: { email: 'demo.commercial@exed.demo', firstName: 'Julie', lastName: 'Commerciale' },
  collaborateur: { email: 'demo.collaborateur@exed.demo', firstName: 'Thomas', lastName: 'Collaborateur' },
  enseignant: { email: 'demo.enseignant@exed.demo', firstName: 'Jean', lastName: 'Formateur' },
  stagiaire: { email: 'demo.stagiaire@exed.demo', firstName: 'Marie', lastName: 'Étudiante' },
  chauffeur: { email: 'demo.chauffeur@exed.demo', firstName: 'Ahmed', lastName: 'Conducteur' },
}

const VALID_ROLES = Object.keys(DEMO_ACCOUNTS)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { role } = await req.json()
    
    if (!role || !VALID_ROLES.includes(role)) {
      throw new Error(`Role must be one of: ${VALID_ROLES.join(', ')}`)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const accountConfig = DEMO_ACCOUNTS[role]
    const email = accountConfig.email
    const password = 'DemoExed2025!'
    const firstName = accountConfig.firstName
    const lastName = accountConfig.lastName

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser?.users.find(u => u.email === email)

    let userId: string

    if (userExists) {
      userId = userExists.id
      console.log(`User ${email} already exists`)
    } else {
      // Créer l'utilisateur
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName }
      })

      if (createError) throw createError
      userId = newUser.user.id

      // Créer le profil
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName
        })

      if (profileError && profileError.code !== '23505') throw profileError

      // Assigner le rôle
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role
        })

      if (roleError && roleError.code !== '23505') throw roleError

      // Récupérer les IDs nécessaires pour certains rôles
      const { data: classe } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('sous_code', 'CL-2025-DEMO')
        .single()

      const { data: modules } = await supabaseAdmin
        .from('modules')
        .select('id')
        .like('code', 'MOD-DEMO-%')

      const { data: programmes } = await supabaseAdmin
        .from('programmes')
        .select('id')
        .limit(2)

      // Configuration spécifique par rôle
      if (role === 'enseignant') {
        // Créer l'enseignant
        const { data: existingEnseignant } = await supabaseAdmin
          .from('enseignants')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        let enseignantId: string

        if (existingEnseignant) {
          enseignantId = existingEnseignant.id
        } else {
          const { data: newEnseignant, error: enseignantError } = await supabaseAdmin
            .from('enseignants')
            .insert({
              email,
              nom: lastName,
              prenom: firstName,
              user_id: userId,
              telephone: '+212 6 00 00 00 00',
              pays_residence: 'France'
            })
            .select('id')
            .single()

          if (enseignantError) throw enseignantError
          enseignantId = newEnseignant.id
        }

        // Affecter aux modules
        if (modules && modules.length > 0) {
          for (const module of modules.slice(0, 3)) {
            await supabaseAdmin
              .from('affectations')
              .insert({
                enseignant_id: enseignantId,
                module_id: module.id,
                confirmee: true
              })
              .select()
          }
        }

        // Créer quelques ressources pédagogiques
        if (modules && modules.length > 0) {
          await supabaseAdmin
            .from('ressources_pedagogiques')
            .insert([
              {
                titre: 'Introduction au Leadership',
                type_ressource: 'video',
                module_id: modules[0].id,
                classe_id: classe?.id,
                url: 'https://www.youtube.com/watch?v=example',
                duree_minutes: 45,
                obligatoire: true,
                uploaded_by: userId,
                description: 'Vidéo d\'introduction aux concepts clés du leadership'
              },
              {
                titre: 'Guide du formateur',
                type_ressource: 'pdf',
                module_id: modules[0].id,
                classe_id: classe?.id,
                url: 'https://example.com/guide.pdf',
                obligatoire: false,
                uploaded_by: userId,
                description: 'Document de référence pour les formateurs'
              }
            ])
        }

        // Créer quelques devoirs
        if (modules && modules.length > 0) {
          await supabaseAdmin
            .from('devoirs')
            .insert([
              {
                titre: 'Analyse de cas : Leadership en action',
                description: 'Analysez un cas pratique de leadership',
                type_devoir: 'etude_de_cas',
                module_id: modules[0].id,
                classe_id: classe?.id,
                date_ouverture: '2025-01-15',
                date_limite: '2025-01-24',
                points_max: 20,
                created_by: userId,
                accepte_fichiers: true,
                formats_acceptes: ['pdf', 'docx']
              }
            ])
        }

      } else if (role === 'stagiaire') {
        // Créer le stagiaire
        const { data: existingStagiaire } = await supabaseAdmin
          .from('stagiaires')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        let stagiaireId: string

        if (existingStagiaire) {
          stagiaireId = existingStagiaire.id
        } else {
          const { data: newStagiaire, error: stagiaireError } = await supabaseAdmin
            .from('stagiaires')
            .insert({
              email,
              nom: lastName,
              prenom: firstName,
              user_id: userId,
              telephone: '+212 6 11 11 11 11',
              pays: 'Maroc',
              ville: 'Casablanca'
            })
            .select('id')
            .single()

          if (stagiaireError) throw stagiaireError
          stagiaireId = newStagiaire.id
        }

        // Inscrire à la classe
        if (classe) {
          await supabaseAdmin
            .from('inscriptions')
            .insert({
              stagiaire_id: stagiaireId,
              classe_id: classe.id,
              statut: 'en_cours',
              date_inscription: '2025-01-10'
            })
            .select()
        }

        // Créer une progression sur quelques modules
        if (modules && modules.length > 0) {
          for (const module of modules.slice(0, 2)) {
            await supabaseAdmin
              .from('progression_stagiaires')
              .insert({
                stagiaire_id: stagiaireId,
                module_id: module.id,
                pourcentage_completion: Math.floor(Math.random() * 60) + 20,
                statut: 'en_cours',
                temps_passe_minutes: Math.floor(Math.random() * 180) + 60
              })
          }
        }
      } else if (role === 'chauffeur') {
        // Créer le chauffeur
        const { data: existingChauffeur } = await supabaseAdmin
          .from('chauffeurs')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (!existingChauffeur) {
          await supabaseAdmin
            .from('chauffeurs')
            .insert({
              email,
              nom: lastName,
              prenom: firstName,
              user_id: userId,
              telephone: '+212 6 22 22 22 22',
              disponible: true
            })
        }
      } else if (role === 'gestionnaire_scolarite' && programmes && programmes.length > 0) {
        // Affecter le gestionnaire à un programme
        await supabaseAdmin
          .from('programme_gestionnaires')
          .insert({
            programme_id: programmes[0].id,
            gestionnaire_user_id: userId
          })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        password,
        role,
        message: `Compte ${role} créé avec succès`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
