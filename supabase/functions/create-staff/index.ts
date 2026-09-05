// create-staff Edge Function — Admin creates new staff users + optional provider profile
// Only authenticated admin users can invoke this (enforced via custom claim check)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const DEFAULT_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    const { data: profile } = await admin.from('staff_profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403, headers: corsHeaders });

    const {
      email, password: providedPassword, fullName, role, providerId, phone,
      providerFirstName, providerLastName, providerType, bio, avatarUrl, yearsExperience
    } = await req.json();

    const password = providedPassword || 'Welcome@Icons2024';

    if (!email || !fullName) {
      return Response.json({ error: 'email, fullName required' }, { status: 400, headers: corsHeaders });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400, headers: corsHeaders });
    }

    // Create provider profile if details provided
    let createdProviderId = providerId || null;
    if (providerFirstName && providerLastName) {
      const slug = `${providerFirstName.toLowerCase()}-${providerLastName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '-');
      const { data: newProvider, error: providerErr } = await admin.from('service_providers').insert({
        slug,
        first_name: providerFirstName,
        last_name: providerLastName,
        full_name: fullName,
        email,
        phone,
        provider_type: providerType || 'barber',
        bio: bio || null,
        avatar_url: avatarUrl || null,
        status: 'active',
        years_experience: yearsExperience || null,
        business_id: DEFAULT_BUSINESS_ID
      }).select().single();

      if (providerErr) {
        return Response.json({ error: `Failed to create provider: ${providerErr.message}` }, { status: 400, headers: corsHeaders });
      }
      createdProviderId = newProvider.id;
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'provider',
        provider_id: createdProviderId,
        phone: phone || null
      }
    });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    if (created?.user) {
      await admin.from('staff_profiles').update({
        role: role || 'provider',
        provider_id: createdProviderId,
        must_change_password: true,
        phone: phone || null
      }).eq('id', created.user.id);

      // Send Invitation Email
      const { data: invRes, error: invErr } = await admin.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Welcome to The Icons Barber & Spa',
          emailType: 'invitation',
          content: `
            <p>Hi ${fullName},</p>
            <p>You have been added as a <strong>${role || 'provider'}</strong> at The Icons Barber & Spa.</p>
            <p>You can now log in to the staff portal using your email and the password provided by your administrator${!providedPassword ? ' (Default: <strong>Welcome@Icons2024</strong>)' : ''}.</p>
            <p>For security, you will be required to change your password upon your first login.</p>
          `,
          cta: {
            text: 'Login to Portal',
            url: `${req.headers.get('origin') || 'https://theicons.co.ke'}/portal/login`
          }
        }
      });
      if (invErr) console.error('Failed to send invitation email:', invErr);
    }

    return Response.json({
      success: true,
      userId: created.user?.id,
      providerId: createdProviderId
    }, { status: 200, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});