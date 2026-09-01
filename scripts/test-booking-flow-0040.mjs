/**
 * Booking Flow Verification — Migration 0040
 * ==========================================
 * Verifies against the REAL remote Supabase:
 *   1. provider_services is the single source of truth:
 *      inserting a provider_services row (what happens when a
 *      service is created with providers selected) automatically
 *      updates service_providers.services_offered_ids — the
 *      provider can offer the service WITHOUT being edited again.
 *   2. get_qualified_staff reads the canonical provider_services.
 *   3. check_and_reserve accepts p_service_ids (multi-service
 *      booking) and prices the slot across ALL services.
 *   4. check_and_reserve matches staff by free-window containment,
 *      so a start time OFF the 15-minute grid still books.
 *   5. Unqualified provider is rejected with ROLE_UNAVAILABLE.
 *
 * Run: node scripts/test-booking-flow-0040.mjs
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

const supabase = createClient(url, anonKey);

// Service role client bypasses RLS so test cleanup actually deletes rows.
const admin = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  console.log('\n🧪 Booking Flow Verification (migration 0040)\n');

  // Sign in as admin (RLS allows admin to manage provider_services/services)
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@theicons.co.ke',
    password: 'Admin@123'
  });
  if (authErr || !auth.user) {
    console.error('❌ Admin login failed — cannot run tests:', authErr?.message);
    process.exit(1);
  }

  // Get an active provider + two active services
  const [{ data: providers }, { data: services }] = await Promise.all([
    supabase.from('service_providers').select('id, full_name, provider_type, services_offered_ids').eq('status', 'active').limit(5),
    supabase.from('services').select('id, name, duration_minutes, buffer_minutes, price_ksh').eq('status', 'active').order('name').limit(5)
  ]);

  if (!providers?.length || !services?.length) {
    console.error('❌ Need at least one active provider and service to test.');
    process.exit(1);
  }
  const provider = providers[0];
  const serviceA = services[0];
  const serviceB = services[1] || services[0];
  console.log(`   Provider: ${provider.full_name} | Service A: ${serviceA.name} | Service B: ${serviceB.name}`);

  // ============================================================
  // TEST 1: Service created with providers selected → provider
  //         automatically updated (single source of truth)
  // ============================================================
  const { data: created, error: createErr } = await supabase
    .from('services')
    .insert({
      slug: 'test-flow-0040-' + Date.now(),
      name: 'TEST 0040 Flow Service',
      category: 'haircuts',
      description: 'Temporary test service',
      short_description: 'Temporary test service',
      price_ksh: 1000,
      duration_minutes: 30,
      buffer_minutes: 0,
      status: 'active',
      business_id: '00000000-0000-0000-0000-000000000001'
    })
    .select()
    .single();

  log('Create test service', !createErr && !!created, createErr?.message);

  if (created) {
    // This is exactly what the manage-services edge function does
    // when a service is created with providers selected:
    const { error: linkErr } = await supabase
      .from('provider_services')
      .insert({ service_id: created.id, provider_id: provider.id });
    log('Link provider via provider_services (service creation flow)', !linkErr, linkErr?.message);

    // Trigger A must have updated service_providers.services_offered_ids
    const { data: freshProvider } = await supabase
      .from('service_providers')
      .select('services_offered_ids')
      .eq('id', provider.id)
      .single();
    const autoUpdated = (freshProvider?.services_offered_ids || []).includes(created.id);
    log(
      'Provider auto-updated (services_offered_ids) without editing provider',
      autoUpdated,
      autoUpdated ? 'trigger synced capability' : 'services_offered_ids missing new service'
    );

    // get_qualified_staff must now include the provider
    const { data: qualified } = await supabase.rpc('get_qualified_staff', { p_service_id: created.id });
    log(
      'get_qualified_staff sees the new service→provider link',
      (qualified || []).some(q => q.staff_id === provider.id),
      `${qualified?.length || 0} qualified`
    );

    // ============================================================
    // TEST 2: Multi-service booking via p_service_ids
    // ============================================================
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: slots } = await supabase.rpc('get_available_slots', {
      p_service_id: serviceA.id,
      p_date: dateStr,
      p_preferred_staff_ids: [provider.id]
    });

    if (slots?.length) {
      const startTs = slots[0].start_ts;
      const { data: multi, error: multiErr } = await supabase.rpc('check_and_reserve', {
        p_customer_id: null,
        p_service_id: serviceA.id,
        p_desired_start_ts: startTs,
        p_preferred_staff_ids: [provider.id],
        p_check_only: false,
        p_customer_name: 'Multi Service Test',
        p_customer_phone: '+254700000010',
        p_customer_email: 'test0040@example.com',
        p_special_requests: 'Multi-service test booking',
        p_require_payment: false,
        p_service_ids: [serviceA.id, created.id]
      });

      const multiOk = !multiErr && multi?.success === true;
      log(
        'Multi-service booking (p_service_ids) succeeds',
        multiOk,
        multiErr?.message || (multiOk ? `ref=${multi.reference_number}, total=${multi.total_price_ksh}, deposit=${multi.deposit_paid_ksh}` : `error=${multi?.error}`)
      );

      if (multiOk) {
        // Verify booking_services has one row per service
        const { data: bsRows } = await supabase
          .from('booking_services')
          .select('service_id')
          .eq('booking_id', multi.booking_id);
        log(
          'booking_services contains one row per selected service',
          (bsRows || []).length === 2,
          `${bsRows?.length || 0} rows`
        );

        // Verify totals = sum of both services, deposit = ceil(50%)
        const expectedTotal = Number(serviceA.price_ksh) + Number(created.price_ksh);
        const expectedDeposit = Math.ceil(expectedTotal * 0.5);
        log(
          'Totals priced across ALL services (50% deposit)',
          Number(multi.total_price_ksh) === expectedTotal && Number(multi.deposit_paid_ksh) === expectedDeposit,
          `total=${multi.total_price_ksh} (expected ${expectedTotal}), deposit=${multi.deposit_paid_ksh} (expected ${expectedDeposit})`
        );

        // Cleanup test booking (service role — RLS would silently block deletes)
        await admin.from('booking_services').delete().eq('booking_id', multi.booking_id);
        await admin.from('booking_resources').delete().eq('booking_id', multi.booking_id);
        await admin.from('bookings').delete().eq('id', multi.booking_id);
        await admin.from('customers').delete().eq('phone', '+254700000010');
      }
    } else {
      console.log('ℹ️  Skipping multi-service booking test (no slots for provider on', dateStr + ')');
    }

    // ============================================================
    // TEST 3: Off-grid start time accepted (window containment)
    // ============================================================
    if (slots?.length >= 2) {
      // Take a slot start and add 7 minutes → NOT on the 15-min grid
      const offGrid = new Date(new Date(slots[1].start_ts).getTime() + 7 * 60000).toISOString();
      const { data: offGridRes } = await supabase.rpc('check_and_reserve', {
        p_customer_id: null,
        p_service_id: serviceA.id,
        p_desired_start_ts: offGrid,
        p_preferred_staff_ids: [provider.id],
        p_check_only: true
      });
      log(
        'Off-grid typed start time accepted (window containment)',
        offGridRes?.success === true,
        `start=${offGrid} → ${offGridRes?.success ? 'available' : 'error=' + offGridRes?.error}`
      );
    }

    // ============================================================
    // TEST 4: Unqualified provider rejected with ROLE_UNAVAILABLE
    // ============================================================
    // Remove the link we just created, then the provider is no
    // longer qualified for the test service.
    const { error: delErr } = await supabase
      .from('provider_services')
      .delete()
      .eq('service_id', created.id)
      .eq('provider_id', provider.id);
    const { data: unqualCheck } = await supabase.rpc('check_and_reserve', {
      p_customer_id: null,
      p_service_id: created.id,
      p_desired_start_ts: new Date(Date.now() + 86400000 * 3).toISOString(),
      p_preferred_staff_ids: [provider.id],
      p_check_only: true
    });
    log(
      'Unqualified provider rejected with ROLE_UNAVAILABLE',
      !delErr && unqualCheck?.success === false && unqualCheck?.error === 'ROLE_UNAVAILABLE',
      `error=${unqualCheck?.error}`
    );

    // Cleanup test service (cascade removes provider_services + requirements)
    const { error: delSvcErr } = await admin.from('services').delete().eq('id', created.id);
    log('Cleanup test service', !delSvcErr, delSvcErr?.message);
  }

  await supabase.auth.signOut();

  console.log('\n📊 Summary');
  const passed = results.filter(r => r.pass).length;
  console.log(`${passed}/${results.length} tests passed\n`);
  process.exit(passed === results.length ? 0 : 1);
})();
