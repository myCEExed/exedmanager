import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  type: "enseignant" | "stagiaire" | "chauffeur";
  firstName: string;
  lastName: string;
  token: string;
  customMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has admin or gestionnaire role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'administrateur'
    });
    
    const { data: isGestionnaire } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'gestionnaire_scolarite'
    });

    if (!isAdmin && !isGestionnaire) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, type, firstName, lastName, token: inviteToken, customMessage }: InvitationRequest = await req.json();

    // Validate input
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type !== 'enseignant' && type !== 'stagiaire' && type !== 'chauffeur') {
      return new Response(JSON.stringify({ error: 'Invalid invitation type' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize custom message (limit length and remove potential HTML)
    const sanitizedMessage = customMessage 
      ? customMessage.slice(0, 1000).replace(/<[^>]*>/g, '').trim()
      : '';

    const invitationUrl = `${req.headers.get("origin") || "https://yourdomain.com"}/invitation/${inviteToken}`;
    
    const getSubject = () => {
      switch (type) {
        case "enseignant":
          return "Invitation à rejoindre EXED Manager 365 - Portail Enseignant";
        case "stagiaire":
          return "Invitation à rejoindre EXED Manager 365 - Portail Stagiaire";
        case "chauffeur":
          return "Invitation à rejoindre EXED Manager 365 - Portail Chauffeur";
      }
    };
    const subject = getSubject();
    
    const getTypeLabel = () => {
      switch (type) {
        case "enseignant":
          return "enseignant";
        case "stagiaire":
          return "stagiaire";
        case "chauffeur":
          return "chauffeur";
      }
    };
    const typeLabel = getTypeLabel();

    // Build custom message HTML if provided
    const customMessageHtml = sanitizedMessage 
      ? `
        <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <p style="margin: 0; font-style: italic; color: #444;">${sanitizedMessage.replace(/\n/g, '<br>')}</p>
        </div>
      `
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>EXED Manager 365</h1>
              <p>Invitation ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}</p>
            </div>
            <div class="content">
              <h2>Bonjour ${firstName} ${lastName},</h2>
              <p>Vous avez été invité(e) à rejoindre <strong>EXED Manager 365</strong> en tant que <strong>${typeLabel}</strong>.</p>
              
              ${customMessageHtml}
              
              <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>
              
              <center>
                <a href="${invitationUrl}" class="button">Accepter l'invitation</a>
              </center>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${invitationUrl}">${invitationUrl}</a>
              </p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Ce lien est valide pendant 7 jours.
              </p>
            </div>
            <div class="footer">
              <p>EXED Manager 365 - Gestion de formations executives</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EXED Manager <onboarding@resend.dev>",
        to: [email],
        subject,
        html: htmlContent,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
