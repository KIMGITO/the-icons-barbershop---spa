/**
 * Auth fix verification: tests signup + login via GoTrue after the defensive
 * trigger fix. Captures trigger diagnostics to confirm root cause.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ override: true });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const admin = createClient(url, adminKey, { auth: { persistSession: false } });

function log(label, msg) { console.log(`[${label}] ${msg}`); }

(async () => {
  // 1. Signup with several email formats
  const tests = [
    { name: 'signup-x-io', email: `st1@theicons.co.ke`, password: 'Test@12345', meta: { full_name: 'S Test', role: 'provider' } },
    { name: 'signup-test-com', email: `staff123@test.com`, password: 'Test@12345', meta: { full_name: 'S Test', role: 'provider' } },
  ];

  for (const t of tests) {
    const { data, error } = await anon.auth.signUp({ email: t.email, password: t.password, options: { data: t.meta, email_confirm: true } });
    if (error) log(t.name, 'SIGNUP ERROR: ' + error.message);
    else log(t.name, 'SIGNUP OK: ' + data.user?.id);
  }

  // 2. Admin login
  const { data: ad, error: adErr } = await anon.auth.signInWithPassword({ email: 'admin@theicons.co.ke', password: 'Admin@123' });
  if (adErr) log('admin_login', 'LOGIN ERROR: ' + JSON.stringify(adErr));
  else log('admin_login', 'LOGIN OK: ' + ad.user?.id);

  // 3. Read trigger diagnostics for rows 99/101
  const { data: diag, error: dErr } = await admin.from('auth_diagnostics').select('*').in('id', [99, 101]);
  if (dErr) log('diag', 'ERR: ' + dErr.message);
  else { log('diag', 'rows: ' + diag.length); for (const r of diag) log('  diag-'+r.id, '['+r.label+'] '+r.detail); }

  // 4. Cleanup any test signups
  for (const r of diag || []) {}
  const { data: cleanup } = await admin.auth.admin.listUsers({ perPage: 100 });
  for (const u of (cleanup?.users || [])) {
    if (u.email && (u.email.includes('st1@') || u.email.includes('staff123@'))) {
      await admin.auth.admin.deleteUser(u.id);
      log('cleanup', 'deleted ' + u.email);
    }
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
