export type ServiceCategory = 
  | 'all'
  | 'haircut'
  | 'beard'
  | 'spa'
  | 'packages';

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  category: 'haircut' | 'haircuts' | 'beard' | 'shave' | 'spa' | 'packages' | 'vip' | string;
  shortDescription: string;
  fullDescription: string;
  description?: string;
  durationMinutes: number;
  priceKsh: number;
  features: string[];
  imageUrl: string;
  isPopular?: boolean;
  recommendedFor?: string;
  relatedProductSlugs?: string[];
  status?: 'active' | 'archived' | 'draft' | 'inactive';
  bufferMinutes?: number;
}

export type ProductCategory = 
  | 'all'
  | 'scalp-care'
  | 'beard-grooming'
  | 'hair-styling'
  | 'follicle-health'
  | 'kits';

export interface ProductSpecification {
  volume: string;
  origin: string;
  scentProfile: string;
  keyIngredients: string[];
  usageFrequency: string;
}

export interface ProductReview {
  id: string;
  authorName: string;
  rating: number; // 1-5
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'archived';
  productId?: string;
}

export interface ProductItem {
  id: string;
  slug: string;
  name: string;
  category: 'scalp-care' | 'beard-grooming' | 'hair-styling' | 'follicle-health' | 'kits';
  shortDescription: string;
  detailedDescription: string;
  priceKsh: number;
  originalPriceKsh?: number;
  availability: 'in-stock' | 'low-stock' | 'out-of-stock';
  imageUrl: string;
  secondaryImages?: string[];
  badge?: string; // e.g. "10 BOTTLE PACK", "BESTSELLER", "ORGANIC"
  rating: number;
  reviewCount: number;
  reviews?: ProductReview[];
  specifications: ProductSpecification;
  howToUse: string[];
  suitableFor: string;
  relatedServiceSlugs: string[];
  relatedProductSlugs?: string[];
  // Management additions
  stockQuantity?: number;
  sku?: string;
  lowStockThreshold?: number;
  isFeatured?: boolean;
  status?: 'active' | 'archived' | 'draft';
}

export interface ProductOrder {
  id: string;
  orderNumber: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceKsh: number;
  }[];
  totalPriceKsh: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryMethod: 'studio-pickup' | 'nairobi-delivery';
  deliveryAddress?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'fulfilled';
  createdAt: string;
}

export interface BarberProfile {
  id: string;
  slug: string;
  name: string;
  title: string;
  specialty: string;
  bio: string;
  yearsExperience: number;
  avatarUrl: string;
  workingDays: string[];
  quote: string;
  servicesOfferedIds: string[];
  instagramHandle?: string;
  // Management additions
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'on-leave';
  workingHours?: {
    start: string;
    end: string;
  };
  breakTimes?: {
    start: string;
    end: string;
  };
  dailyCapacity?: number;
}

export interface BarberScheduleBlock {
  id: string;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "01:00 PM"
  endTime: string; // e.g. "02:00 PM"
  reason: 'break' | 'day-off' | 'holiday' | 'maintenance' | 'appointment-hold';
  notes?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  alt: string;
  category: 'all' | 'haircut' | 'beard' | 'spa' | 'interior' | 'team';
  imageUrl: string;
  caption?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Appointments' | 'Payments' | 'Services' | 'Barbers' | 'Products' | 'Policies' | string;
  order?: number;
  isFeaturedOnHome?: boolean;
  internalLink?: {
    text: string;
    url: string;
  };
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'refunded';

export interface BookingRecord {
  id: string;
  referenceNumber: string;
  serviceIds: string[];
  serviceNames: string[];
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30 AM"
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequests?: string;
  totalPriceKsh: number;
  totalDurationMinutes: number;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: 'mpesa' | 'card' | 'cash' | 'unpaid';
  staffNotes?: string;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  preferredBarberId?: string;
  preferredBarberName?: string;
  frequentlyBookedServiceNames?: string[];
  totalVisits: number;
  totalSpendKsh: number;
  lastVisitDate?: string;
  notes?: string;
  tags?: string[];
  vipStatus?: boolean;
  createdAt: string;
}

export type StaffRole = 'owner' | 'manager' | 'barber' | 'receptionist' | 'cashier';

export interface StaffPermissions {
  manageBookings: boolean;
  manageServices: boolean;
  manageProducts: boolean;
  manageBarbers: boolean;
  manageStaff: boolean;
  viewReports: boolean;
  manageSettings: boolean;
  manageCustomers: boolean;
  manageReviews: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  avatarUrl: string;
  status: 'active' | 'inactive' | 'on-leave';
  permissions: StaffPermissions;
  lastActive: string;
  barberProfileId?: string;
}

export interface ManagementReview {
  id: string;
  customerName: string;
  customerPhone?: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  serviceName?: string;
  barberName?: string;
  status: 'published' | 'pending' | 'archived';
  staffResponse?: {
    response: string;
    respondedAt: string;
    respondedBy: string;
  };
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  address: {
    street: string;
    suite: string;
    neighborhood: string;
    city: string;
    country: string;
    mapsEmbedUrl: string;
    directionsUrl: string;
  };
  locationDetails?: string;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  whatsappUrl: string;
  email: string;
  hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
}

export interface BookingSettings {
  slotDurationMinutes: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  bufferMinutesBetweenAppointments: number;
  allowSameDayCancellation: boolean;
  cancellationCutoffHours: number;
  requireDepositForGroup: boolean;
  groupDepositKsh: number;
  autoConfirmOnlineBookings: boolean;
}

export interface NotificationSettings {
  emailAlertsOnNewBooking: boolean;
  smsReminderToCustomer: boolean;
  reminderHoursBefore: number;
  whatsappNotificationToBarber: boolean;
  lowStockAlerts: boolean;
  dailySummaryEmail: boolean;
  notifyOnCustomerReview: boolean;
}

export * from './types/staff';
