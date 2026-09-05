import { SafeImage } from '../components/ui/SafeImage';
import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';
import { Scissors, Calendar, ArrowLeft, Award, Clock, Star, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface BarberDetailPageProps {
  slug: string;
}

export const BarberDetailPage: React.FC<BarberDetailPageProps> = ({ slug }) => {
  const { barbers, services, openBookingModal, navigateTo } = useApp();
  const barber = barbers.find(b => b.slug === slug) || barbers[0];

  if (!barber) {
    return (
      <div className="pt-36 pb-24 max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Master Barber Not Found</h2>
        <Button variant="primary" size="sm" onClick={() => navigateTo('/barbers')}>
          View All Barbers
        </Button>
      </div>
    );
  }

  const offeredServices = services.filter(s => barber.servicesOfferedIds.includes(s.id));

  return (
    <div className="pt-28 pb-24 bg-background min-h-screen">
      <SEO 
        title={`${barber.name} (${barber.title}) | The Icons Barber Nairobi`}
        description={barber.bio}
        canonicalUrl={`https://theiconsbarber.co.ke/barbers/${barber.slug}`}
        ogImage={barber.avatarUrl}
        type="article"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigateTo('/barbers')} className="hover:text-white transition-colors">Barbers</button>
          <span>/</span>
          <span className="text-primary truncate">{barber.name}</span>
        </div>

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTo('/barbers')}
          className="text-xs uppercase tracking-wider gap-2 -ml-2 text-muted-foreground-light hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to All Barbers</span>
        </Button>

        {/* Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left: Big Portrait & Schedule */}
          <div className="md:col-span-5 space-y-6">
            <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-card border border-border shadow-2xl">
              <SafeImage
                src={barber.avatarUrl}
                alt={`${barber.name} - ${barber.title}`}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-xs uppercase tracking-wider text-primary font-semibold block">
                  {barber.title}
                </span>
                <h1 className="text-2xl font-bold text-white">
                  {barber.name}
                </h1>
              </div>
            </div>

            {/* Working Schedule */}
            <div className="card-bordered p-5 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Working Days at Chair</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {barber.workingDays.map(day => (
                  <Badge key={day} variant="neutral">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Bio, Quote & Offered Services */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Quote Block */}
            <blockquote className="p-5 bg-card border-l-2 border-primary text-white font-serif-sub italic text-lg leading-relaxed">
              "{barber.quote}"
            </blockquote>

            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-primary font-semibold">
                Biography & Mastery
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground-light leading-relaxed font-light">
                {barber.bio}
              </p>
            </div>

            {/* Craft Credentials */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-secondary border border-border flex items-center justify-center text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{barber.yearsExperience} Years</span>
                  <span className="text-[11px] text-muted-foreground">Professional Barbering</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-secondary border border-border flex items-center justify-center text-primary">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{barber.specialty}</span>
                  <span className="text-[11px] text-muted-foreground">Primary Signature Focus</span>
                </div>
              </div>
            </div>

            {/* Book Now Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => openBookingModal(undefined, barber.id)}
              className="w-full uppercase tracking-wider text-xs shadow-xl"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment with {barber.name}</span>
            </Button>

            {/* Services Performed by this Barber */}
            <div className="pt-4 space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-white font-bold">
                Services Performed by {barber.name.split(' ')[0]}:
              </h3>

              <div className="space-y-2">
                {offeredServices.map(service => (
                  <div
                    key={service.id}
                    className="card-bordered p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{service.name}</h4>
                      <span className="text-[11px] text-muted-foreground">{service.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-primary">
                        KSh {service.priceKsh.toLocaleString()}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openBookingModal(service.id, barber.id)}
                        className="uppercase text-[11px] font-bold px-3 py-1"
                      >
                        Book
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
