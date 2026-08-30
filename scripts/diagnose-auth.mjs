/**
 * Auth Schema Diagnostic — runs directly against remote Postgres.
 * Run: node scripts/diagnose-auth.mjs
 */
import { Client } from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const poolerUrl = readFileSync('supabase/.temp/pooler-url', 'utf8').trim();

const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

async function q(label, sql) {
  try {
    const res = await client.query(sql);
    console.log(`\n--- ${label} ---`);
    if (res.rows.length === 0) console.log('(no rows)');
    else for (const row of res.rows) console.log(JSON.stringify(row));
  } catch (e) {
    console.log(`\n--- ${label} --- ERROR: ${e.message}`);
  }
}

(async () => {
  await client.connect();
  console.log('✅ Connected to remote DB');

  // 1. Triggers on auth.users
  await q('Triggers on auth.users', `select tgname, tgenabled, pg_get_triggerdef(oid) as def from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal`);

  // 2. handle_new_user function source
  await q('handle_new_user definition', `select prosrc from pg_proc where proname = 'handle_new_user'`);

  // 3. Check auth.users columns for anomalies
  await q('Admin auth record', `select id, email, instance_id, aud, role, email_confirmed_at is not null as confirmed, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, concat(encrypted_password, '') is not null as has_password from auth.users where email = 'admin@theicons.co.ke'`);

  // 4. Check auth schema tables exist
  await client.query(`set search_path = auth, public`);
  await q('auth tables', `select table_name from information_schema.tables where table_schema = 'auth' order by table_name`);

  // 5. Try the trigger manually: simulate what GoTrue does on login
  await q('Test: select from auth.users (as GoTrue would)', `select id, email, role, aud from auth.users limit 5`);

  // 6. Check identities table
  await client.query(`set search_path = auth, public`);
  await q('auth.identities for admin', `select provider_id, provider, id from auth.identities where user_id = (select id from auth.users where email = 'admin@theicons.co.ke')`);

  // 7. Check for invalid objects in db
  await client.query(`set search_path = public`);
  await q('Invalid objects', `select n.nspname, c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relispartition = false and c.relkind in ('v','m') and not c.relispopulated is not true limit 5`);

  await client.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });