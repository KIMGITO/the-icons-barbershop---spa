import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  Home, 
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ThemeSelect } from '../components/ui/ThemeSelect';

export const BarberPortal: React.FC = () => {
  const { barbers, bookings, completeBooking, navigateTo } = useApp();
  const [selectedBarberId, setSelectedBarberId] = useState<string>(barbers[0]?.id || '');

  const activeBarber = barbers.find(b => b.id === selectedBarberId) || barbers[0];

  // Filter bookings assigned to this barber
  const barberBookings = bookings.filter(
    b => b.barberId === selectedBarberId || (b.barberId === 'any' && activeBarber)
  );

  return (
    <div className="pt-28 pb-24 bg-background min-h-screen text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-card border border-primary flex items-center justify-center text-primary">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-wide">
                Barber Chair Schedule
              </h1>
              <p className="text-xs text-muted-foreground">Daily Chair Queue & Client Service Roster</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigateTo('/')}
            className="self-start sm:self-auto gap-2"
          >
            <Home className="w-4 h-4 text-primary" />
            <span>Public Site</span>
          </Button>
        </div>

        {/* Barber Selector Bar */}
        <div className="p-4 bg-card border border-border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={activeBarber?.avatarUrl}
              alt={activeBarber?.name}
              className="w-12 h-12 rounded-sm object-cover border border-border"
            />
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Logged In Master</span>
              <h3 className="text-base font-bold text-white">{activeBarber?.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Switch Chair:</span>
            <ThemeSelect
              value={selectedBarberId}
              onChange={e => setSelectedBarberId(e.target.value)}
              className="p-2.5 bg-secondary border border-border rounded-sm text-xs font-semibold text-white focus:border-primary focus:outline-none"
            >
              {barbers.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.specialty.split('&')[0]})
                </option>
              ))}
            </ThemeSelect>
          </div>
        </div>

        {/* Chair Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Assigned Client Appointments ({barberBookings.length})
            </h2>
          </div>

          {barberBookings.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-sm space-y-2">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-white font-bold text-sm">No Appointments in Chair Queue</h3>
              <p className="text-xs text-muted-foreground">New client bookings will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {barberBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-5 bg-card border border-border rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-primary bg-secondary px-2 py-0.5 rounded-sm border border-border">
                        {booking.referenceNumber}
                      </span>
                      <span className="text-xs text-foreground font-mono">
                        {booking.date} @ {booking.timeSlot}
                      </span>
                      <Badge 
                        variant={booking.status === 'confirmed' ? 'success' : booking.status === 'completed' ? 'neutral' : 'destructive'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{booking.customerName}</span>
                      <a href={`tel:${booking.customerPhone}`} className="text-xs text-muted-foreground hover:text-primary font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-primary" /> {booking.customerPhone}
                      </a>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Treatments:</strong> {booking.serviceNames.join(', ')} ({booking.totalDurationMinutes} min)
                    </div>

                    {booking.specialRequests && (
                      <p className="text-xs text-primary bg-secondary p-2 rounded-sm border border-border">
                        Client Note: {booking.specialRequests}
                      </p>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <span className="font-mono text-sm font-bold text-primary">
                      KSh {booking.totalPriceKsh.toLocaleString()}
                    </span>

                    {booking.status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeBooking(booking.id)}
                        className="text-emerald-400 border-emerald-500/40 gap-1 text-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
