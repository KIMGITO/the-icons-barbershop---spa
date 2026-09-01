import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

// Service role client bypasses RLS so test cleanup actually deletes rows.
const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const { data: leftovers, error } = await admin
    .from('bookings')
    .select('id, reference_number, customer_name, start_ts, status')
    .in('customer_phone', ['+254700000010', '+254700000001', '+254700000002']);
  console.log('leftover test bookings:', JSON.stringify(leftovers || [], null, 2), error?.message || '');
  for (const b of leftovers || []) {
    await admin.from('booking_services').delete().eq('booking_id', b.id);
    await admin.from('booking_resources').delete().eq('booking_id', b.id);
    const { error: delErr } = await admin.from('bookings').delete().eq('id', b.id);
    console.log(`deleted ${b.reference_number}:`, delErr ? delErr.message : 'ok');
  }
  await admin.from('customers').delete().eq('phone', '+254700000010');
})();
