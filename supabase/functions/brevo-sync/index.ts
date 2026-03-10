import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    // Initialize Supabase client for import action
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, prospect } = await req.json();

    console.log('Brevo sync request:', { action, prospect });

    if (action === 'create_contact' || action === 'update_contact') {
      // Create or update contact in Brevo
      const brevoContact = {
        email: prospect.email,
        attributes: {
          PRENOM: prospect.prenom || '',
          NOM: prospect.nom || '',
          TELEPHONE: prospect.telephone || '',
          ENTREPRISE: prospect.entreprise || '',
          POSTE: prospect.poste || '',
        },
        listIds: [2], // Default list ID (you may need to adjust)
      };

      const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify(brevoContact),
      });

      if (!brevoResponse.ok && brevoResponse.status !== 400) {
        const error = await brevoResponse.text();
        throw new Error(`Brevo API error: ${error}`);
      }

      const result = await brevoResponse.json().catch(() => ({}));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          brevo_contact_id: result.id || prospect.email,
          message: 'Contact synchronized with Brevo' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_quote_email') {
      // Send quotation email via Brevo
      const emailData = {
        to: [{ email: prospect.email, name: `${prospect.prenom} ${prospect.nom}` }],
        templateId: 1, // You'll need to create a template in Brevo
        params: {
          PRENOM: prospect.prenom,
          NOM: prospect.nom,
          NUMERO_DEVIS: prospect.numero_devis,
          MONTANT: prospect.montant_total,
        },
      };

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify(emailData),
      });

      if (!brevoResponse.ok) {
        const error = await brevoResponse.text();
        throw new Error(`Brevo email API error: ${error}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent via Brevo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'import_contacts') {
      // Import contacts from Brevo to database
      console.log('Starting Brevo contacts import...');
      
      let offset = 0;
      const limit = 50;
      let totalImported = 0;
      let totalUpdated = 0;
      let hasMore = true;

      while (hasMore) {
        // Fetch contacts from Brevo with pagination
        const brevoResponse = await fetch(
          `https://api.brevo.com/v3/contacts?limit=${limit}&offset=${offset}`,
          {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'api-key': BREVO_API_KEY,
            },
          }
        );

        if (!brevoResponse.ok) {
          const error = await brevoResponse.text();
          throw new Error(`Brevo API error: ${error}`);
        }

        const brevoData = await brevoResponse.json();
        const contacts = brevoData.contacts || [];
        
        console.log(`Fetched ${contacts.length} contacts from Brevo (offset: ${offset})`);

        // Process each contact
        for (const contact of contacts) {
          const prospectData = {
            email: contact.email,
            nom: contact.attributes?.NOM || contact.attributes?.LASTNAME || '',
            prenom: contact.attributes?.PRENOM || contact.attributes?.FIRSTNAME || '',
            telephone: contact.attributes?.TELEPHONE || contact.attributes?.SMS || '',
            entreprise: contact.attributes?.ENTREPRISE || contact.attributes?.COMPANY || '',
            poste: contact.attributes?.POSTE || '',
            brevo_contact_id: contact.id?.toString() || contact.email,
            statut: 'nouveau',
          };

          // Check if prospect already exists
          const { data: existing } = await supabase
            .from('prospects')
            .select('id, brevo_contact_id')
            .eq('email', prospectData.email)
            .maybeSingle();

          if (existing) {
            // Update existing prospect with Brevo ID if missing
            if (!existing.brevo_contact_id) {
              await supabase
                .from('prospects')
                .update({ brevo_contact_id: prospectData.brevo_contact_id })
                .eq('id', existing.id);
              totalUpdated++;
            }
          } else {
            // Insert new prospect
            const { error: insertError } = await supabase
              .from('prospects')
              .insert([prospectData]);

            if (insertError) {
              console.error(`Error inserting prospect ${prospectData.email}:`, insertError);
            } else {
              totalImported++;
            }
          }
        }

        // Check if there are more contacts to fetch
        hasMore = contacts.length === limit;
        offset += limit;
      }

      console.log(`Import completed: ${totalImported} new, ${totalUpdated} updated`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          imported: totalImported,
          updated: totalUpdated,
          message: `Importation terminée: ${totalImported} nouveaux contacts, ${totalUpdated} mis à jour` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in brevo-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});