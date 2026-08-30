export interface StaffRole {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface ServiceRequirement {
  id: string;
  serviceId: string;
  roleId: string;
  quantity: number;
  role?: StaffRole;
}

export interface StaffSchedule {
  id: string;
  providerId: string;
  weekday: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isWorking: boolean;
}

export interface StaffBreak {
  id: string;
  providerId: string;
  date?: string; // YYYY-MM-DD or null for recurring
  weekday?: number; // for recurring breaks
  startTime: string;
  endTime: string;
  reason?: string;
  notes?: string;
}

export type ScheduleExceptionType = 'ABSENT' | 'LEAVE' | 'SPECIAL_WORKING_DAY';

export interface StaffScheduleException {
  id: string;
  providerId: string;
  date: string;
  exceptionType: ScheduleExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface BusinessHours {
  id: string;
  businessId: string;
  weekday: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface BookingResource {
  id: string;
  bookingId: string;
  providerId: string;
  roleId?: string;
}

export interface AvailableSlot {
  startTs: string; // ISO timestamp
  endTs: string; // ISO timestamp
  staffId: string;
  staffName: string;
}

export interface CheckAndReserveResult {
  success: boolean;
  error?: string;
  bookingId?: string;
  referenceNumber?: string;
  receiptCode?: string;
  staffId?: string;
  staffName?: string;
  startTs?: string;
  endTs?: string;
  totalPriceKsh?: number;
  depositPaidKsh?: number;
  remainingBalanceKsh?: number;
  status?: string;
  paymentStatus?: string;
}