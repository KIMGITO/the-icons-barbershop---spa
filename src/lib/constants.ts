// Database table names
export const SERVICES_TABLE = 'services';
export const SERVICE_PROVIDERS_TABLE = 'service_providers';
export const PROVIDER_SERVICES_TABLE = 'provider_services';
export const CUSTOMERS_TABLE = 'customers';
export const BOOKINGS_TABLE = 'bookings';
export const STAFF_PROFILES_TABLE = 'staff_profiles';
export const BUSINESSES_TABLE = 'businesses';
export const SERVICE_CATEGORIES_TABLE = 'service_categories';
export const PRODUCTS_TABLE = 'products';
export const PRODUCT_REVIEWS_TABLE = 'product_reviews';
export const GALLERY_TABLE = 'gallery_items';
export const FAQS_TABLE = 'faqs';
export const SCHEDULE_BLOCKS_TABLE = 'schedule_blocks';
export const MPESA_PAYMENTS_TABLE = 'mpesa_payments';
export const PROVIDER_AVAILABILITY_TABLE = 'provider_availability';

// Default business UUID
export const DEFAULT_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

// Storage buckets
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  services: 'services',
  business: 'business',
  products: 'products'
} as const;
