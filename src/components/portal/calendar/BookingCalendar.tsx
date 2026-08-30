import React, { useState, useEffect, useMemo } from 'react';
import { StaffBooking } from '../../../types/staff';
import { useAuthStore } from '../../../stores/authStore';
import { useBookingStore, CalendarViewMode } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { CalendarHeader } from './CalendarHeader';
import { WeekPlannerView } from './WeekPlannerView';
import { DayPlannerView } from './DayPlannerView';
import { MonthPlannerView } from './MonthPlannerView';
import { BookingDrawer } from '../bookings/BookingDrawer';

export const BookingCalendar: React.FC = () => {
  const { role, user } = useAuthStore();
  const { 
    bookings, 
    loadBookings, 
    calendarView, 
    setCalendarView, 
    selectedProviderFilter,
    setSelectedProviderFilter,
    openCreateDrawer,
    openViewDrawer
  } = useBookingStore();
  
  const { providers, loadProviders } = useProviderStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    loadBookings();
    loadProviders();
  }, [loadBookings, loadProviders]);

  // If user is a service provider, lock the filter to their assigned providerId
  useEffect(() => {
    if (role === 'provider' && user?.providerId) {
      setSelectedProviderFilter(user.providerId);
    }
  }, [role, user, setSelectedProviderFilter]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarView === 'day') {
      next.setDate(currentDate.getDate() - 1);
    } else if (calendarView === 'week') {
      next.setDate(currentDate.getDate() - 7);
    } else {
      next.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarView === 'day') {
      next.setDate(currentDate.getDate() + 1);
    } else if (calendarView === 'week') {
      next.setDate(currentDate.getDate() + 7);
    } else {
      next.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings based on selectedProviderFilter
  const filteredBookings = useMemo(() => {
    if (selectedProviderFilter === 'all') {
      return bookings;
    }
    return bookings.filter(b => b.providerId === selectedProviderFilter);
  }, [bookings, selectedProviderFilter]);

  // Click slot to create booking
  const handleSlotClick = (dateStr: string, timeSlotStr: string, providerId?: string) => {
    openCreateDrawer(dateStr, timeSlotStr, providerId || (selectedProviderFilter !== 'all' ? selectedProviderFilter : undefined));
  };

  // Click booking to view/edit
  const handleBookingClick = (booking: StaffBooking) => {
    openViewDrawer(booking);
  };

  // Switch to Day view from Month view
  const handleMonthDateSelect = (dateStr: string) => {
    setCurrentDate(new Date(dateStr + 'T00:00:00'));
    setCalendarView('day');
  };

  const currentProviderName = useMemo(() => {
    if (role === 'provider' && user?.providerId) {
      const p = providers.find(item => item.id === user.providerId);
      return p?.fullName;
    }
    return undefined;
  }, [role, user, providers]);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={calendarView}
        onViewModeChange={setCalendarView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        providers={providers}
        selectedProviderId={selectedProviderFilter}
        onProviderChange={setSelectedProviderFilter}
        onNewBookingClick={() => openCreateDrawer()}
        userRole={role}
        userProviderName={currentProviderName}
      />

      {/* Calendar Active View */}
      {calendarView === 'week' && (
        <WeekPlannerView
          currentDate={currentDate}
          bookings={filteredBookings}
          onBookingClick={handleBookingClick}
          onSlotClick={handleSlotClick}
        />
      )}

      {calendarView === 'day' && (
        <DayPlannerView
          currentDate={currentDate}
          bookings={filteredBookings}
          providers={providers}
          selectedProviderId={selectedProviderFilter}
          onBookingClick={handleBookingClick}
          onSlotClick={handleSlotClick}
        />
      )}

      {calendarView === 'month' && (
        <MonthPlannerView
          currentDate={currentDate}
          bookings={filteredBookings}
          onSelectDate={handleMonthDateSelect}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Unified Collapsible Booking Drawer (View / Create / Edit) */}
      <BookingDrawer />
    </div>
  );
};
