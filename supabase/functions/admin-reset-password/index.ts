import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { email, password, service_key } = await req.json();

    // Allow call with service_role_key OR with admin auth
    if (service_key === serviceKey) {
      // Direct admin call - proceed
    } else {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const anonClient = createClient(supabaseUrl, anonKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const adminClient2 = createClient(supabaseUrl, serviceKey);
      const { data: profile } = await adminClient2.from('profiles').select('is_admin').eq('user_id', user.id).single();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: 'Not admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find target user
    const { data: targetProfile } = await adminClient.from('profiles').select('user_id').eq('email', email).single();
    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'User not found: ' + email }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetProfile.user_id, { password });
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, email }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
