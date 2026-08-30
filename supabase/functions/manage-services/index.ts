// manage-services Edge Function — Admin CRUD for Salon Services
// Only authenticated admin users can invoke this (enforced via session token & profile role check)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    // 1. Authenticate caller using token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return Response.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401, headers: corsHeaders });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return Response.json({ error: 'Unauthorized: Invalid token' }, { status: 401, headers: corsHeaders });
    
    // 2. Check if user is Admin in staff_profiles
    const { data: profile, error: profileErr } = await admin
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileErr || !profile || profile.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access only' }, { status: 403, headers: corsHeaders });
    }

    // 3. Process Request payload
    const body = await req.json();
    const { action } = body;
    
    if (action === 'create') {
      const { payload, providerIds } = body;
      
      const { data: createdService, error: insertErr } = await admin
        .from('services')
        .insert({
          slug: payload.slug,
          name: payload.name,
          category: payload.category,
          category_id: payload.categoryId,
          description: payload.description,
          short_description: payload.shortDescription,
          full_description: payload.fullDescription || payload.shortDescription,
          duration_minutes: payload.durationMinutes,
          buffer_minutes: payload.bufferMinutes || 10,
          price_ksh: payload.priceKsh,
          features: payload.features || [],
          image_url: payload.imageUrl || '',
          status: payload.status || 'active',
          is_popular: payload.isPopular || false,
          recommended_for: payload.recommendedFor || '',
          business_id: '00000000-0000-0000-0000-000000000001' // default business
        })
        .select()
        .single();

      if (insertErr) {
        return Response.json({ error: `Insert error: ${insertErr.message}` }, { status: 400, headers: corsHeaders });
      }

      // Associate providers if providerIds list is sent
      if (providerIds && providerIds.length > 0) {
        const rows = providerIds.map((providerId: string) => ({
          service_id: createdService.id,
          provider_id: providerId
        }));
        
        const { error: relErr } = await admin.from('provider_services').insert(rows);
        if (relErr) {
          // Rollback created service if relation insert fails
          await admin.from('services').delete().eq('id', createdService.id);
          return Response.json({ error: `Provider association error: ${relErr.message}` }, { status: 400, headers: corsHeaders });
        }
      }

      return Response.json({ success: true, data: createdService }, { status: 200, headers: corsHeaders });

    } else if (action === 'update') {
      const { id, updates, providerIds } = body;
      if (!id) return Response.json({ error: 'Missing service ID for update' }, { status: 400, headers: corsHeaders });
      
      const dbUpdates: any = {};
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.shortDescription !== undefined) dbUpdates.short_description = updates.shortDescription;
      if (updates.fullDescription !== undefined) dbUpdates.full_description = updates.fullDescription;
      if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
      if (updates.bufferMinutes !== undefined) dbUpdates.buffer_minutes = updates.bufferMinutes;
      if (updates.priceKsh !== undefined) dbUpdates.price_ksh = updates.priceKsh;
      if (updates.features !== undefined) dbUpdates.features = updates.features;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.isPopular !== undefined) dbUpdates.is_popular = updates.isPopular;
      if (updates.recommendedFor !== undefined) dbUpdates.recommended_for = updates.recommendedFor;

      const { data: updatedService, error: updateErr } = await admin
        .from('services')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        return Response.json({ error: `Update error: ${updateErr.message}` }, { status: 400, headers: corsHeaders });
      }

      // Update provider associations if requested
      if (providerIds !== undefined) {
        // Remove old associations
        const { error: delErr } = await admin
          .from('provider_services')
          .delete()
          .eq('service_id', id);
          
        if (delErr) {
          return Response.json({ error: `Old association delete error: ${delErr.message}` }, { status: 400, headers: corsHeaders });
        }

        // Insert new associations
        if (providerIds.length > 0) {
          const rows = providerIds.map((providerId: string) => ({
            service_id: id,
            provider_id: providerId
          }));
          
          const { error: relErr } = await admin.from('provider_services').insert(rows);
          if (relErr) {
            return Response.json({ error: `New provider association error: ${relErr.message}` }, { status: 400, headers: corsHeaders });
          }
        }
      }

      return Response.json({ success: true, data: updatedService }, { status: 200, headers: corsHeaders });

    } else if (action === 'delete') {
      const { id } = body;
      if (!id) return Response.json({ error: 'Missing service ID for delete' }, { status: 400, headers: corsHeaders });
      
      const { error: deleteErr } = await admin
        .from('services')
        .delete()
        .eq('id', id);

      if (deleteErr) {
        return Response.json({ error: `Delete error: ${deleteErr.message}` }, { status: 400, headers: corsHeaders });
      }

      return Response.json({ success: true }, { status: 200, headers: corsHeaders });
      
    } else {
      return Response.json({ error: `Invalid action: ${action}` }, { status: 400, headers: corsHeaders });
    }

  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
