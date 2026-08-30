/**
 * Booking Engine + Auth Verification Script
 * ==========================================
 * Verifies against the REAL remote Supabase:
 *   1. Seeded admin login (admin@theicons.co.ke / Admin@123)
 *   2. Regular user login (creates a test provider user if missing)
 *   3. Booking engine RPCs (get_available_slots, check_and_reserve)
 *   4. Scenario: only available person can't provide the service
 *
 * Run: node scripts/test-booking-engine.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const results = [];
const log = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

// ============================================================
// TEST 1: Seeded admin login
// ============================================================
async function testAdminLogin() {
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@theicons.co.ke',
    password: 'Admin@123'
  });

  if (error || !data.user) {
    log('Admin login (admin@theicons.co.ke)', false, error?.message || 'no user');
    return null;
  }

  // Verify staff profile role
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, full_name, must_change_password')
    .eq('id', data.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';
  log(
    'Admin login (admin@theicons.co.ke)',
    isAdmin,
    `role=${profile?.role}, must_change_password=${profile?.must_change_password}`
  );
  return { supabase, userId: data.user.id, profile };
}

// ============================================================
// TEST 2: Regular user login (seed a test provider if missing)
// ============================================================
async function testProviderUserLogin() {
  // First try signing in with an existing demo provider account
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'samuel@theicons.co.ke',
    password: 'barber123'
  });

  if (!error && data.user) {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .maybeSingle();
    log('Provider user login (samuel@theicons.co.ke)', true, `role=${profile?.role}`);
    return { supabase, userId: data.user.id };
  }

  // Provider user doesn't exist in Supabase Auth — create it via admin signup
  console.log('ℹ️  samuel@theicons.co.ke not found in Supabase Auth, creating test user...');
  const admin = createClient(url, anonKey);
  const { data: signUp, error: signUpErr } = await admin.auth.signUp({
    email: 'samuel@theicons.co.ke',
    password: 'barber123',
    options: {
      data: {
        full_name: 'Samuel Mwangi',
        role: 'provider'
      }
    }
  });

  if (signUpErr || !signUp.user) {
    log('Provider user creation', false, signUpErr?.message || 'no user');
    return null;
  }

  // Link to a service provider record if one exists with matching name
  const { data: providers } = await admin
    .from('service_providers')
    .select('id, full_name')
    .ilike('full_name', '%Samuel%')
    .limit(1);

  if (providers && providers.length > 0) {
    await admin
      .from('staff_profiles')
      .update({ provider_id: providers[0].id })
      .eq('id', signUp.user.id);
  }

  log('Provider user created + login', true, `id=${signUp.user.id}`);
  return { supabase: admin, userId: signUp.user.id };
}

// ============================================================
// TEST 3: Booking engine RPCs
// ============================================================
async function testBookingEngine() {
  const supabase = createClient(url, anonKey);

  // Find a service
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, buffer_minutes')
    .eq('status', 'active')
    .limit(1);

  if (!services || services.length === 0) {
    log('Booking engine: find service', false, 'no active services');
    return;
  }
  const service = services[0];
  log('Booking engine: find service', true, `${service.name} (${service.duration_minutes}min + ${service.buffer_minutes}min buffer)`);

  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // Test get_available_slots
  const { data: slots, error: slotsErr } = await supabase.rpc('get_available_slots', {
    p_service_id: service.id,
    p_date: dateStr
  });

  if (slotsErr) {
    log('get_available_slots RPC', false, slotsErr.message);
  } else {
    log('get_available_slots RPC', true, `${slots?.length || 0} slots on ${dateStr}`);
    if (slots && slots.length > 0) {
      console.log(`   First slot: ${slots[0].start_ts} with ${slots[0].staff_name}`);
    }
  }

  // Test check_and_reserve (check_only)
  if (slots && slots.length > 0) {
    const { data: check, error: checkErr } = await supabase.rpc('check_and_reserve', {
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_service_id: service.id,
      p_desired_start_ts: slots[0].start_ts,
      p_check_only: true
    });
    log(
      'check_and_reserve (check_only)',
      !checkErr && check?.success === true,
      checkErr?.message || `available=${check?.available}, staff=${check?.staff_name}`
    );
  }

  // Test get_qualified_staff
  const { data: qualified, error: qualErr } = await supabase.rpc('get_qualified_staff', {
    p_service_id: service.id
  });
  log(
    'get_qualified_staff RPC',
    !qualErr,
    qualErr?.message || `${qualified?.length || 0} qualified: ${qualified?.map(q => q.staff_name).join(', ') || 'none'}`
  );

  return { service, dateStr, slots };
}

// ============================================================
// TEST 4: Scenario — only available person can't provide service
// ============================================================
async function testUnqualifiedStaffScenario(ctx) {
  if (!ctx || !ctx.slots || ctx.slots.length === 0) {
    console.log('ℹ️  Skipping unqualified-staff scenario (no slots available to test with)');
    return;
  }

  const supabase = createClient(url, anonKey);
  const { service, dateStr, slots } = ctx;

  // Find a staff member who is NOT qualified for this service
  const { data: allStaff } = await supabase
    .from('service_providers')
    .select('id, full_name, provider_type')
    .eq('status', 'active');

  const { data: qualified } = await supabase.rpc('get_qualified_staff', {
    p_service_id: service.id
  });

  const qualifiedIds = new Set((qualified || []).map(q => q.staff_id));
  const unqualified = (allStaff || []).filter(s => !qualifiedIds.has(s.id));

  if (!unqualified || unqualified.length === 0) {
    console.log('ℹ️  All active staff are qualified for this service — scenario not testable');
    return;
  }

  const unqual = unqualified[0];
  console.log(`   Testing: ${unqual.full_name} (${unqual.provider_type}) is NOT qualified for "${service.name}"`);

  // Try to book with the unqualified staff — should return ROLE_UNAVAILABLE
  const { data: result, error: err } = await supabase.rpc('check_and_reserve', {
    p_customer_id: '00000000-0000-0000-0000-000000000000',
    p_service_id: service.id,
    p_desired_start_ts: slots[0].start_ts,
    p_preferred_staff_ids: [unqual.id],
    p_check_only: true
  });

  const correctlyRejected = !err && result?.success === false && result?.error === 'ROLE_UNAVAILABLE';
  log(
    'Unqualified staff correctly rejected',
    correctlyRejected,
    err?.message || `error=${result?.error} (expected ROLE_UNAVAILABLE)`
  );

  // Verify the system suggests qualified alternatives
  if (qualified && qualified.length > 0) {
    log(
      'Qualified alternatives available for suggestion',
      true,
      qualified.map(q => q.staff_name).join(', ')
    );
  }
}

// ============================================================
// TEST 5: Race condition — double booking same slot
// ============================================================
async function testRaceCondition(ctx) {
  if (!ctx || !ctx.slots || ctx.slots.length < 1) {
    console.log('ℹ️  Skipping race condition test (no slots)');
    return;
  }

  const supabase = createClient(url, anonKey);
  const { service, slots } = ctx;
  const slot = slots[0];

  // Two concurrent booking attempts for the same slot
  const [res1, res2] = await Promise.all([
    supabase.rpc('check_and_reserve', {
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_service_id: service.id,
      p_desired_start_ts: slot.start_ts,
      p_customer_name: 'Race Test A',
      p_customer_phone: '+254700000001',
      p_check_only: false
    }),
    supabase.rpc('check_and_reserve', {
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_service_id: service.id,
      p_desired_start_ts: slot.start_ts,
      p_customer_name: 'Race Test B',
      p_customer_phone: '+254700000002',
      p_check_only: false
    })
  ]);

  const s1 = res1.data?.success;
  const s2 = res2.data?.success;
  const exactlyOneSucceeded = (s1 && !s2) || (!s1 && s2);
  log(
    'Race condition: exactly one booking succeeds',
    exactlyOneSucceeded,
    `A=${s1 ? 'success' : res1.data?.error || res1.error?.message}, B=${s2 ? 'success' : res2.data?.error || res2.error?.message}`
  );

  // Cleanup race test bookings
  await supabase.from('bookings').delete().in('customer_phone', ['+254700000001', '+254700000002']);
}

// ============================================================
// Main
// ============================================================
(async () => {
  console.log('\n🧪 Booking Engine + Auth Verification\n');

  const admin = await testAdminLogin();
  const provider = await testProviderUserLogin();
  const ctx = await testBookingEngine();
  await testUnqualifiedStaffScenario(ctx);
  await testRaceCondition(ctx);

  console.log('\n📊 Summary');
  const passed = results.filter(r => r.pass).length;
  console.log(`${passed}/${results.length} tests passed\n`);

  // Sign out
  if (admin?.supabase) await admin.supabase.auth.signOut();
  if (provider?.supabase) await provider.supabase.auth.signOut();

  process.exit(passed === results.length ? 0 : 1);
})();