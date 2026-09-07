import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Cookie, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { getCookie, setCookie } from '../utils/cookieUtils';
import { useApp } from '../context/AppContext';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { navigateTo } = useApp();

  useEffect(() => {
    // Check if user has already accepted policies
    const consent = getCookie('theicons_policy_consent');
    if (!consent) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setCookie('theicons_policy_consent', 'accepted', 365);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl p-5 sm:p-6 lg:p-8">
          {/* Subtle decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left max-w-2xl">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Cookie className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-lg text-white font-bold tracking-tight">
                  Respecting Your Privacy & Experience
                </h3>
                <p className="text-sm text-muted-foreground-light leading-relaxed font-light">
                  Welcome to The Icons Barber & Spa. To provide our bespoke grooming services and ensure a secure booking experience, we use essential cookies. By continuing, you acknowledge you have read and agree to our{' '}
                  <button 
                    onClick={() => navigateTo('/terms')}
                    className="text-primary hover:underline font-medium decoration-primary/30 underline-offset-4"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button 
                    onClick={() => navigateTo('/privacy')}
                    className="text-primary hover:underline font-medium decoration-primary/30 underline-offset-4"
                  >
                    Privacy Policy
                  </button>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-xs px-5 py-2.5 rounded-xl border-white/10 hover:bg-white/5"
              >
                Later
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAccept}
                className="text-xs font-bold uppercase tracking-wider px-8 py-3 rounded-xl shadow-lg shadow-primary/20"
              >
                Accept All & Continue
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Button>
            </div>
          </div>
          
          {/* Close button for minimalists */}
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
