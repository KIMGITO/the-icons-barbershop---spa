import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Button } from './ui/Button';

export const FAQSection: React.FC = () => {
  const { faqs, navigateTo } = useApp();
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  // Get the 3 preview questions (prioritizing isFeaturedOnHome or first 3 by order)
  const homeFaqs = React.useMemo(() => {
    const featured = faqs.filter(f => f.isFeaturedOnHome);
    if (featured.length >= 3) {
      return featured.slice(0, 3);
    }
    return faqs.slice(0, 3);
  }, [faqs]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(prevId => (prevId === id ? null : id));
  };

  return (
    <section 
      id="faq-preview-section"
      ref={ref}
      className={`py-10 sm:py-14 bg-background-secondary border-t border-b border-white/5 relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      aria-label="Frequently Asked Questions Preview"
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Compact Heading */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="font-serif text-xl sm:text-2xl text-white font-bold tracking-tight">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-light max-w-md mx-auto">
            Quick answers about appointments, payments, and our grooming sanctuary.
          </p>
        </div>

        {/* Minimal Accordion (Only 3 Questions) */}
        <div className="divide-y divide-border border-y border-border mb-6">
          {homeFaqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            const headingId = `home-faq-head-${faq.id}`;
            const panelId = `home-faq-panel-${faq.id}`;

            return (
              <div key={faq.id} className="py-2.5">
                <button
                  id={headingId}
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full py-1.5 flex items-center justify-between gap-3 text-left group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <span className={`text-xs sm:text-sm font-medium transition-colors ${
                    isOpen ? 'text-primary' : 'text-foreground group-hover:text-white'
                  }`}>
                    {faq.question}
                  </span>
                  
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors duration-200 ${
                    isOpen 
                      ? 'bg-primary text-primary-foreground font-bold' 
                      : 'bg-secondary text-muted-foreground group-hover:text-white group-hover:bg-secondary-hover'
                  }`}>
                    {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className="pt-1 pb-2 pr-6 text-xs text-muted-foreground leading-relaxed font-light transition-all animate-in fade-in duration-200"
                  >
                    <p>{faq.answer}</p>
                    {faq.internalLink && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo(faq.internalLink!.url);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover mt-1.5 font-medium cursor-pointer transition-colors"
                      >
                        <span>{faq.internalLink.text}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compact CTA: More Questions -> /faq */}
        <div className="text-center">
          <Button
            id="more-faqs-btn"
            variant="gold-outline"
            size="sm"
            onClick={() => {
              navigateTo('/faq');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs uppercase tracking-wider gap-1.5 shadow-sm"
          >
            <span>More Questions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

      </div>
    </section>
  );
};
