// update-password Edge Function — Forced password change + clears must_change_password flag
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400, headers: corsHeaders });

    const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });

    await admin.from('staff_profiles').update({ must_change_password: false }).eq('id', user.id);

    return Response.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});
