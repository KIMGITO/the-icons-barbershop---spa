/**
 * Final end-to-end verification of the booking + auth system.
 * Run: node scripts/verify-final.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const admin = createClient(url, adminKey, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

(async () => {
  console.log('\n🧪 FINAL VERIFICATION\n');

  // 1. Admin login
  const { data: adminData, error: adminErr } = await anon.auth.signInWithPassword({
    email: 'admin@theicons.co.ke', password: 'Admin@123'
  });
  check('Admin login (admin@theicons.co.ke / Admin@123)', !adminErr && !!adminData.session,
    adminErr ? adminErr.message : 'session=' + !!adminData.session);

  // 2. Admin staff_profiles linkage
  if (adminData?.session) {
    const svc = createClient(url, anonKey);
    svc.auth.setSession(adminData.session);
    const { data: p, error: perr } = await svc.from('staff_profiles').select('role,full_name,provider_id,must_change_password').eq('id', adminData.user.id).maybeSingle();
    check('Admin staff_profiles linkage (role=admin)', p?.role === 'admin', p ? `role=${p.role} mustChange=${p.must_change_password}` : ('ERR ' + perr?.message));
  }

  // 3. Admin can call an RPC (session validity + grants)
  if (adminData?.session) {
    const svc = createClient(url, anonKey);
    svc.auth.setSession(adminData.session);
    const { data: d, error: e } = await svc.rpc('get_available_slots', { p_service_id: '00000000-0000-0000-0000-000000000005', p_date: '2026-08-29' });
    check('Admin session can call get_available_slots RPC', !e && Array.isArray(d), e ? e.message : `slots=${d?.length || 0}`);
  }

  // 4. Public signup (defensive trigger must not break it)
  const ts = Date.now();
  const { data: su, error: suErr } = await anon.auth.signUp({
    email: `cust-${ts}@example.com`, password: 'Pass@12345',
    options: { email_confirm: true, data: { full_name: 'Cust Test' } }
  });
  check('Public signup (cust user)', !suErr && !!su.user, suErr ? suErr.message : 'uid=' + su.user?.id);

  // 5. Customer login
  if (su.user) {
    await new Promise(r => setTimeout(r, 1500));
    const { data: cl, error: clErr } = await anon.auth.signInWithPassword({
      email: `cust-${ts}@example.com`, password: 'Pass@12345'
    });
    check('Customer login after signup', !clErr && !!cl.session, clErr ? clErr.message : 'session ok');
    await admin.auth.admin.deleteUser(su.user.id);
  }

  // 6. Provider creation via Admin (staff_profile auto-created by trigger)
  const { data: sp, error: spErr } = await admin.auth.admin.createUser({
    email: `prov-${ts}@example.com`, password: 'Prov@12345', email_confirm: true,
    user_metadata: { full_name: 'Test Prov', role: 'provider', provider_id: '00000000-0000-0000-0000-00000000000a' }
  });
  check('Provider user creation (trigger must not break)', !spErr && !!sp.user, spErr ? spErr.message : 'uid=' + sp.user?.id);

  // 7. Provider staff_profile linkage + login
  if (sp.user) {
    const { data: prof } = await admin.from('staff_profiles').select('role,full_name,provider_id').eq('id', sp.user.id).maybeSingle();
    check('Provider staff_profile auto-created (role=provider)', prof?.role === 'provider', prof ? JSON.stringify(prof) : 'NO PROFILE');
    await new Promise(r => setTimeout(r, 1500));
    const { data: pl, error: plErr } = await anon.auth.signInWithPassword({ email: `prov-${ts}@example.com`, password: 'Prov@12345' });
    check('Provider login', !plErr && !!pl.session, plErr ? plErr.message : 'ok');
    await admin.auth.admin.deleteUser(sp.user.id);
  }

  console.log(`\n📊 ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
