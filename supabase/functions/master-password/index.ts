import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const SALT = "graocontrol_master_v1_";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use anon key client to verify user token
    const anonClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, password } = await req.json();

    if (action === 'set') {
      if (!password || password.length < 4) {
        return new Response(JSON.stringify({ error: 'Senha deve ter pelo menos 4 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const hash = await hashPassword(password, SALT);
      const { error } = await supabase
        .from('profiles')
        .update({ master_password_hash: hash })
        .eq('user_id', user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify') {
      if (!password) {
        return new Response(JSON.stringify({ error: 'Senha não informada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('master_password_hash')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        return new Response(JSON.stringify({ error: 'Perfil não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!profile.master_password_hash) {
        return new Response(JSON.stringify({ error: 'Senha master não configurada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const hash = await hashPassword(password, SALT);
      const valid = hash === profile.master_password_hash;

      return new Response(JSON.stringify({ valid }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'check') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('master_password_hash')
        .eq('user_id', user.id)
        .single();

      return new Response(JSON.stringify({ hasPassword: !!profile?.master_password_hash }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
