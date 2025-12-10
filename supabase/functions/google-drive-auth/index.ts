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
    
    if (!authHeader) {
      console.log("No authorization header found");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.log("User authentication failed:", userError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "User not authenticated", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User authenticated:", user.id);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-drive-auth/callback`;
    
    // Store user_id in state for callback
    const state = btoa(JSON.stringify({ user_id: user.id }));
    
    // Google OAuth URL with drive.readonly scope
    const scope = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email";
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;

    console.log("Generated Google auth URL for user:", user.id);

    return new Response(
      JSON.stringify({ authUrl: googleAuthUrl }),
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
      console.error("Google OAuth error:", error);
      return redirectWithError("Google authorization was denied");
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
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-drive-auth/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return redirectWithError("Failed to exchange authorization code");
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange successful");

    // Get user email from Google
    let userEmail = "";
    try {
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email || "";
        console.log("Got user email:", userEmail);
      }
    } catch (e) {
      console.error("Error getting user info:", e);
    }

    // Calculate token expiry
    const tokenExpiry = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Store connection in database using service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: upsertError } = await supabaseClient
      .from("google_drive_connections")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expiry: tokenExpiry,
        email: userEmail,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error saving connection:", upsertError);
      return redirectWithError("Failed to save connection");
    }

    console.log("Google Drive connection saved successfully");

    // Redirect back to app with success
    const appUrl = Deno.env.get("APP_URL") || "https://qbdgmouvkzrrlxrtnieo.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}/settings?google=connected`,
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
      Location: `${appUrl}/settings?google_error=${encodeURIComponent(message)}`,
    },
  });
}
