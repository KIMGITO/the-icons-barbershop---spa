-- Enable Realtime for all relevant tables
-- This allows the UI to update instantly when any data changes in the database

-- 1. Create the publication if it doesn't exist (Supabase usually has 'supabase_realtime')
-- But we want to ensure our tables are added to it.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE services;
ALTER PUBLICATION supabase_realtime ADD TABLE providers;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_services;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE gallery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE faqs;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE product_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE service_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE business_profile;

-- 3. Set REPLICA IDENTITY to FULL for tables where we need the old row data on DELETE
-- or for specific update logic, though DEFAULT is often enough for simple IDs.
-- We'll set it to FULL for important ones to be safe.
ALTER TABLE services REPLICA IDENTITY FULL;
ALTER TABLE providers REPLICA IDENTITY FULL;
ALTER TABLE provider_services REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE gallery_items REPLICA IDENTITY FULL;
ALTER TABLE faqs REPLICA IDENTITY FULL;
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE product_reviews REPLICA IDENTITY FULL;
ALTER TABLE service_reviews REPLICA IDENTITY FULL;
