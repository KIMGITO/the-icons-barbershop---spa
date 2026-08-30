# Deploying The Icons Barber & Spa to Vercel

This guide walks through deploying this Vite + React 19 single-page application to **Vercel**.

> **Important:** This repository also depends on a **Supabase** backend (database, auth, storage, and Edge Functions such as M-Pesa STK push, payment callbacks, and SMS). Vercel only hosts the frontend. The production UI will not function correctly until the Supabase project + Edge Functions are also deployed. See the [Production Checklist](#4-production-checklist-supabase-backend) below.

---

## 1. Prerequisites

- A [Vercel account](https://vercel.com) (login with GitHub is easiest)
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
  - Current remote is `git@github.com:KIMGITO/the-icons-barbershop.git`
- Node.js 18+ and the Vercel CLI **or** a browser (choose one method)
- `.env` values for Supabase (ask a teammate or check your Supabase dashboard):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## 2. Option A — Deploy via the Vercel Dashboard (no CLI)

1. Go to **https://vercel.com/new**
2. Select **Import Git Repository** and pick `the-icons-barbershop`.
3. Configure the project:

   | Setting | Value |
   | --- | --- |
   | **Framework Preset** | Vite (auto-detected) |
   | **Root Directory** | `/` (project root) |
   | **Build Command** | `npm run build` (or `bun run build`) |
   | **Output Directory** | `dist` (auto-detected) |
   | **Install Command** | `npm install` (or `bun install`) |
   | **Node Version** | 20.x (recommended) |

4. Under **Environment Variables**, add:

   ```
   VITE_SUPABASE_URL = https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY = <your-anon-key>
   ```

   > Vercel automatically exposes variables prefixed with `VITE_` to the client bundle. Any non-`VITE_` secrets used server-side by Supabase Edge Functions are **not** needed here.

5. Click **Deploy** and wait for the build to finish.

---

## 3. Option B — Deploy via the Vercel CLI

```bash
# 1. Install the CLI (once)
npm i -g vercel

# 2. From the project root, log in
vercel login

# 3. Preview deployment (upload current code, no Git required)
vercel

# 4. Production deployment
vercel --prod
```

### CLI environment variables

Create a local `.env.production` or supply values interactively:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Then deploy:

```bash
vercel --prod
```

---

## 4. SPA Routing (client-side routes)

This app uses client-side routing (e.g. `/services`, `/barbers`, `/products`, portal routes). On Vercel you must add a **rewrite** so every path serves `index.html`, otherwise deep links return 404.

Place this `vercel.json` at the project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Commit and redeploy. After this, direct visits to paths like `https://your-app.vercel.app/barbers/samuel-king-mwangi` will load the SPA correctly.

---

## 5. Production Checklist — Supabase Backend

The static site is only half of this product. For booking + payments to work in production, deploy the Supabase side:

1. **Create/link a Supabase project**

   ```bash
   npx supabase init
   npx supabase link --project-ref <your-project-ref>
   ```

2. **Run the migrations** (all files in `supabase/migrations/`):

   ```bash
   npx supabase db push
   ```

   This creates all tables, RLS policies, triggers, RPCs (`get_booked_slots`, `create_booking`, `get_available_slots`, etc.), and seed data.

3. **Deploy the Edge Functions** (M-Pesa & SMS):

   ```bash
   npx supabase functions deploy \
     mpesa-stk-push \
     mpesa-callback \
     mpesa-status \
     send-sms \
     create-staff \
     manage-services \
     update-password
   ```

4. **Set Supabase secrets** for the Edge Functions (in Supabase dashboard → Edge Functions → Secrets, or via CLI):

   ```
   MPESA_CONSUMER_KEY
   MPESA_CONSUMER_SECRET
   MPESA_PASSKEY
   MPESA_SHORTCODE
   MPESA_TILL_NUMBER
   MPESA_CALLBACK_URL   # https://<project-ref>.supabase.co/functions/v1/mpesa-callback
   SMS_API_KEY
   ```

5. **Storage buckets** — the migrations create/configure the `avatars`, `services`, and `business` buckets referenced in `supabase/migrations/0004_policies_storage.sql`.

6. **Auth** — if you use the portal (staff/admin), configure email/phone auth providers in Supabase Auth settings and verify the RLS policies apply to your admin users.

7. **Public URL** — go to Supabase dashboard → **API** and copy the URL + `anon` key into the Vercel environment variables above.

---

## 6. After Deployment

- **Preview:** the dashboard deployment and a `vercel` (non-`--prod`) CLI deploy create a `*.vercel.app` preview URL.
- **Production:** either the Git import default branch or `vercel --prod` produces `https://<project>.vercel.app`.
- **Custom domain:** Dashboard → your project → **Settings → Domains** → add `www.yourdomain.com`.
- **Continuous deployment:** merges to the default branch auto-deploy. Deployments are automatic for every PR (with a unique preview URL).

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Failed to load data from database" in the console | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are wrong, missing, or the Supabase project is not pushed yet. Check Vercel → Settings → Environment Variables and redeploy. |
| Direct URL to `/barbers/...` gives 404 | The `vercel.json` SPA rewrite is missing — add it and redeploy. |
| M-Pesa prompt never arrives | Edge Functions not deployed, or `MPESA_*` secrets not set in Supabase. Verify the callback function URL is reachable. |
| Build fails on Vercel | Set the **Install Command** to `npm install` and **Node Version** to 20.x. If you use Bun locally, keep `bun.lock` but still use `npm install` on Vercel, or switch Vercel's install command to `bun install`. |
| Supabase "not configured" fallback mode in production | The app silently falls back to localStorage seed data when env vars are absent. Set the variables on Vercel to enable the real database. |

---

## 8. Quick Reference — Files That Matter

| File | Purpose |
| --- | --- |
| `vite.config.ts` | Build configuration (no changes needed for Vercel) |
| `src/lib/supabase.ts` | Reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; mock fallback when absent |
| `public/robots.txt`, `public/sitemap.xml` | SEO files auto-served from the `public/` dir |
| `supabase/migrations/` | Database schema + RLS + RPCs (run with `supabase db push`) |
| `supabase/functions/` | Backend Edge Functions (M-Pesa, SMS, etc.) |