import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  await supabase.auth.signInWithPassword({ email: 'admin@theicons.co.ke', password: 'Admin@123' });
  const { data: providers } = await supabase.from('service_providers').select('id, full_name').eq('status', 'active').limit(1);
  const { data: books, error } = await supabase
    .from('bookings')
    .select('id, reference_number, date, time_slot, end_time, duration_minutes, start_ts, end_ts, status')
    .eq('provider_id', providers[0].id)
    .gte('date', '2026-09-01')
    .order('date');
  console.log('Provider:', providers[0].full_name);
  console.log(JSON.stringify(books || [], null, 2), error?.message || '');
  await supabase.auth.signOut();
})();
