-- Enable Realtime for all relevant tables
-- This allows the UI to update instantly when any data changes in the database
-- Idempotent: safe to run on databases where tables are already in the publication
-- or where replica identity is already set.

-- 1. Create the publication if it doesn't exist (Supabase usually has 'supabase_realtime')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to the publication (only if not already a member)
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'services',
        'providers',
        'provider_services',
        'products',
        'gallery_items',
        'faqs',
        'bookings',
        'customers',
        'product_reviews',
        'service_reviews',
        'business_profile'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
           AND NOT EXISTS (
             SELECT 1
             FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime'
               AND schemaname = 'public'
               AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- 3. Set REPLICA IDENTITY to FULL for tables where we need the old row data on DELETE
-- (skip if already FULL to avoid unnecessary locks)
DO $$
DECLARE
    t text;
    rel_id regclass;
    current_replident "char";
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'services',
        'providers',
        'provider_services',
        'products',
        'gallery_items',
        'faqs',
        'bookings',
        'customers',
        'product_reviews',
        'service_reviews'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            -- Only now is it safe to cast to regclass
            rel_id := format('public.%I', t)::regclass;

            SELECT relreplident INTO current_replident
            FROM pg_class
            WHERE oid = rel_id;

            IF current_replident <> 'f' THEN
                EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
            END IF;
        END IF;
    END LOOP;
END $$;