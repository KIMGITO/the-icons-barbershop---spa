/**
 * Auth Debug Script — inspects auth users + staff_profiles via service role.
 * Run: node scripts/debug-auth.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log('\n🔍 Auth Debug\n');

// 1. List auth users
const { data: users, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 50 });
if (usersErr) {
  console.error('❌ Failed to list users:', usersErr.message);
} else {
  console.log(`Found ${users.users.length} auth users:`);
  for (const u of users.users) {
    console.log(`  - ${u.email} | id=${u.id} | confirmed=${!!u.email_confirmed_at} | created=${u.created_at}`);
    console.log(`    app_meta=${JSON.stringify(u.app_metadata)} raw_meta=${JSON.stringify(u.raw_user_meta_data)}`);
  }
}

// 2. Check staff_profiles
const { data: profiles, error: profErr } = await admin
  .from('staff_profiles')
  .select('id, email, full_name, role, provider_id, must_change_password');
if (profErr) {
  console.error('❌ Failed to query staff_profiles:', profErr.message);
} else {
  console.log(`\nFound ${profiles.length} staff profiles:`);
  for (const p of profiles) {
    console.log(`  - ${p.email} | role=${p.role} | provider_id=${p.provider_id} | must_change=${p.must_change_password}`);
  }
}

// 3. Check service_providers
const { data: providers } = await admin
  .from('service_providers')
  .select('id, full_name, provider_type, status');
console.log(`\nFound ${providers?.length || 0} service providers:`);
for (const p of providers || []) {
  console.log(`  - ${p.full_name} | type=${p.provider_type} | status=${p.status} | id=${p.id}`);
}

// 4. Check if signup works at all (tests the handle_new_user trigger)
const testClient = createClient(url, process.env.VITE_SUPABASE_ANON_KEY);
const testEmail = `debug-test-${Date.now()}@theicons.co.ke`;
const { data: signUp, error: signUpErr } = await testClient.auth.signUp({
  email: testEmail,
  password: 'Test@12345',
  options: { data: { full_name: 'Debug Test', role: 'provider' } }
});
if (signUpErr) {
  console.error(`\n❌ Test signUp failed: ${signUpErr.message}`);
  console.error('   This confirms the handle_new_user trigger on auth.users is broken.');
} else {
  console.log(`\n✅ Test signUp succeeded: ${signUp.user?.id}`);
  // Cleanup
  if (signUp.user) {
    await admin.auth.admin.deleteUser(signUp.user.id);
    console.log('   (cleaned up test user)');
  }
}

// 5. Try admin login with detailed error
const { error: loginErr } = await testClient.auth.signInWithPassword({
  email: 'admin@theicons.co.ke',
  password: 'Admin@123'
});
console.log(`\nAdmin login error detail: ${JSON.stringify(loginErr, null, 2)}`);

// 6. Try deleting + recreating the admin user via Admin API
console.log('\n--- Attempting admin user repair via Admin API ---');
const adminId = '00000000-0000-0000-0000-0000000000ad';
const { error: delErr } = await admin.auth.admin.deleteUser(adminId);
if (delErr) {
  console.log(`Delete admin user failed: ${delErr.message}`);
} else {
  console.log('Deleted broken admin auth record.');
  const { data: recreated, error: recErr } = await admin.auth.admin.createUser({
    email: 'admin@theicons.co.ke',
    password: 'Admin@123',
    email_confirm: true,
    user_metadata: { full_name: 'Dennis Kimanthi', role: 'admin', provider_id: '00000000-0000-0000-0000-00000000000a' }
  });
  if (recErr) {
    console.log(`Recreate admin user failed: ${recErr.message}`);
  } else {
    console.log(`✅ Admin auth user recreated: ${recreated.user?.id}`);
  }
}
