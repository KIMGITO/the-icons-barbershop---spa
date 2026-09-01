export type ServiceProviderType = 
  | 'barber'
  | 'facial-specialist'
  | 'spa-therapist'
  | 'scalp-care'
  | 'other';

export const PROVIDER_TYPE_LABELS: Record<ServiceProviderType, string> = {
  'barber': 'Master Barber',
  'facial-specialist': 'Facial Specialist',
  'spa-therapist': 'Spa Therapist',
  'scalp-care': 'Scalp-Care Specialist',
  'other': 'Service Specialist'
};

export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' }
];

export interface ScheduleBreak {
  start: string; // e.g. "13:00"
  end: string;   // e.g. "14:00"
}

export interface DaySchedule {
  day: DayOfWeek;
  isWorking: boolean;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "19:00"
  breaks?: ScheduleBreak[];
}

export interface ServiceProvider {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  providerType: ServiceProviderType;
  bio: string;
  avatarUrl: string;
  status: 'active' | 'inactive';
  servicesOfferedIds: string[];
  schedule: DaySchedule[];
  yearsExperience?: number;
  rating?: number;
  instagramHandle?: string;
}

export type PortalRole = 'admin' | 'provider';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: PortalRole;
  providerId?: string; // Links to ServiceProvider if role is 'provider'
  avatarUrl?: string;
  phone?: string;
  mustChangePassword?: boolean;
}

export interface StaffSession {
  token: string;
  user: StaffUser;
  expiresAt: string;
}

export type StaffBookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no-show';
export type StaffPaymentStatus = 'paid' | 'deposit-paid' | 'unpaid' | 'refunded';

export interface StaffBooking {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceIds: string[];
  serviceNames: string[];
  providerId: string;
  providerName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30 AM"
  endTime?: string; // e.g. "11:30 AM" (calculated from startTime + durationMinutes)
  durationMinutes: number;
  totalPriceKsh: number;
  depositPaidKsh: number;
  remainingBalanceKsh: number;
  status: StaffBookingStatus;
  paymentStatus: StaffPaymentStatus;
  paymentMethod?: 'mpesa' | 'card' | 'cash' | 'unpaid';
  mpesaReceiptNumber?: string;
  specialRequests?: string;
  staffNotes?: string;
  createdAt: string;
}

export interface TimeRange {
  start: string; // "HH:MM" 24h format, e.g. "09:00"
  end: string;   // "HH:MM" 24h format, e.g. "18:00"
}

export interface BusinessHours {
  weekdays: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
}

export interface StaffBusinessProfile {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  city: string;
  locationDetails: string;
  mapsEmbedUrl?: string;
  directionsUrl?: string;
  openingHours: BusinessHours;
  socialLinks: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
  };
  logoUrl: string;
  coverImageUrl: string;
}

export interface MpesaPaymentRequest {
  phoneNumber: string;
  amountKsh: number;
  bookingId: string;
  referenceNumber: string;
  customerName: string;
}

export interface MpesaPaymentResult {
  success: boolean;
  checkoutRequestId?: string;
  receiptNumber?: string;
  amountKsh: number;
  message: string;
}
