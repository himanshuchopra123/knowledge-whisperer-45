import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  // Handle OAuth callback
  if (path === "callback") {
    return handleCallback(url);
  }

  // Handle initial auth request - generate OAuth URL
  try {
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    console.log("Auth header value:", authHeader ? authHeader.substring(0, 20) + "..." : "none");
    
    if (!authHeader) {
      console.log("No authorization header found");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    console.log("Supabase URL:", supabaseUrl);
    console.log("Anon key present:", !!supabaseAnonKey);

    const supabaseClient = createClient(
      supabaseUrl ?? "",
      supabaseAnonKey ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    console.log("User fetch result - user:", user?.id, "error:", userError?.message);
    
    if (userError || !user) {
      console.log("User authentication failed:", userError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "User not authenticated", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("NOTION_CLIENT_ID");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notion-auth/callback`;
    
    // Store user_id in state for callback
    const state = btoa(JSON.stringify({ user_id: user.id }));
    
    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    console.log("Generated Notion auth URL for user:", user.id);

    return new Response(
      JSON.stringify({ authUrl: notionAuthUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCallback(url: URL): Promise<Response> {
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Notion OAuth error:", error);
      return redirectWithError("Notion authorization was denied");
    }

    if (!code || !state) {
      return redirectWithError("Missing code or state parameter");
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.user_id;
    } catch {
      return redirectWithError("Invalid state parameter");
    }

    console.log("Processing OAuth callback for user:", userId);

    // Exchange code for access token
    const clientId = Deno.env.get("NOTION_CLIENT_ID");
    const clientSecret = Deno.env.get("NOTION_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notion-auth/callback`;

    const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return redirectWithError("Failed to exchange authorization code");
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange successful, workspace:", tokenData.workspace_name);

    // Store connection in database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await supabaseClient
      .from("notion_connections")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        bot_id: tokenData.bot_id,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error saving connection:", upsertError);
      return redirectWithError("Failed to save connection");
    }

    console.log("Notion connection saved successfully");

    // Redirect back to app with success
    const appUrl = Deno.env.get("APP_URL") || "https://qbdgmouvkzrrlxrtnieo.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}/settings?notion=connected`,
      },
    });
  } catch (error: any) {
    console.error("Callback error:", error);
    return redirectWithError(error.message);
  }
}

function redirectWithError(message: string): Response {
  const appUrl = Deno.env.get("APP_URL") || "https://qbdgmouvkzrrlxrtnieo.lovable.app";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${appUrl}/settings?notion_error=${encodeURIComponent(message)}`,
    },
  });
}
