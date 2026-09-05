import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Minus, ArrowRight, MessageSquare, HelpCircle, Scissors, PhoneCall, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const FAQPage: React.FC = () => {
  const { faqs, businessInfo, navigateTo } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Categories list in required order
  const categories = useMemo(() => {
    return ['Appointments', 'Payments', 'Services', 'Barbers', 'Products', 'Policies'];
  }, []);

  // Filtered FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    // Filter for active FAQs only
    let list = faqs.filter(f => f.isActive !== false);

    if (activeCategoryFilter !== 'All') {
      list = list.filter(f => f.category.toLowerCase() === activeCategoryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f => 
        f.question.toLowerCase().includes(q) || 
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [faqs, searchQuery, activeCategoryFilter]);

  // Group filtered FAQs by Category
  const groupedFaqs = useMemo(() => {
    const groups: Record<string, typeof faqs> = {};
    
    // Maintain category ordering
    categories.forEach(cat => {
      groups[cat] = [];
    });

    filteredFaqs.forEach(faq => {
      const cat = faq.category || 'General';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(faq);
    });

    return groups;
  }, [filteredFaqs, categories]);

  const toggleFaq = (id: string) => {
    setOpenFaqIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-20">
      
      {/* Compact Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-8 text-center" aria-label="FAQ Page Header">
        
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
          <button 
            onClick={() => navigateTo('/')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-primary font-medium">FAQ</span>
        </nav>

        {/* H1 Heading */}
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
          Frequently Asked <span className="text-primary">Questions</span>
        </h1>
        
        {/* Short supporting explanation */}
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          Find answers about appointments, barber selection, services, deposits, payments, cancellations, and the customer experience at The Icons Barber & Spa.
        </p>

        {/* Compact Instant Search Field */}
        <div className="mt-6 max-w-lg mx-auto relative">
          <div className="relative flex items-center">
            <Input
              id="faq-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search frequently asked questions"
              className="pr-10 py-2.5 text-xs sm:text-sm rounded-xl shadow-inner"
              icon={<Search className="w-4 h-4" />}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 text-xs text-muted-foreground hover:text-white cursor-pointer px-1 py-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveCategoryFilter('All')}
            className={`tab-base ${activeCategoryFilter === 'All' ? 'tab-active shadow-sm' : 'tab-inactive'}`}
          >
            All Questions ({faqs.filter(f => f.isActive !== false).length})
          </button>
          {categories.map(cat => {
            const count = faqs.filter(f => f.isActive !== false && f.category.toLowerCase() === cat.toLowerCase()).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`tab-base ${activeCategoryFilter === cat ? 'tab-active shadow-sm' : 'tab-inactive'}`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

      </section>

      {/* Main FAQ Content List Grouped by Category */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {filteredFaqs.length === 0 ? (
          <div className="py-16 text-center bg-card border border-border rounded-2xl p-8 max-w-md mx-auto">
            <HelpCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-white mb-1">No questions found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              We couldn't find any questions matching "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryFilter('All');
              }}
              className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-primary text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map(categoryName => {
              const categoryItems = groupedFaqs[categoryName] || [];
              if (categoryItems.length === 0) return null;

              return (
                <section 
                  key={categoryName} 
                  id={`category-${categoryName.toLowerCase()}`}
                  className="space-y-3"
                  aria-labelledby={`heading-${categoryName.toLowerCase()}`}
                >
                  {/* Category H2 Header */}
                  <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                    <h2 
                      id={`heading-${categoryName.toLowerCase()}`}
                      className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide"
                    >
                      {categoryName}
                    </h2>
                    <span className="text-[11px] text-primary font-mono font-medium">
                      ({categoryItems.length})
                    </span>
                  </div>

                  {/* Accordion Group */}
                  <div className="divide-y divide-border bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    {categoryItems.map(faq => {
                      const isOpen = !!openFaqIds[faq.id];
                      const headingId = `faq-title-${faq.id}`;
                      const panelId = `faq-content-${faq.id}`;

                      return (
                        <div key={faq.id} className="transition-colors">
                          <button
                            id={headingId}
                            onClick={() => toggleFaq(faq.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleFaq(faq.id);
                              }
                            }}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-secondary/60 transition-colors cursor-pointer focus:outline-none focus-visible:bg-secondary"
                          >
                            <span className={`text-xs sm:text-sm font-semibold transition-colors pr-2 ${
                              isOpen ? 'text-primary' : 'text-foreground'
                            }`}>
                              {faq.question}
                            </span>
                            
                            <span className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200 ${
                              isOpen 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-secondary text-muted-foreground border-border'
                            }`}>
                              {isOpen ? <Minus className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </span>
                          </button>

                          {isOpen && (
                            <div
                              id={panelId}
                              role="region"
                              aria-labelledby={headingId}
                              className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-muted-foreground-light leading-relaxed font-light border-t border-border bg-card/50"
                            >
                              <p className="pt-2">{faq.answer}</p>
                              
                              {/* Internal Linking */}
                              {faq.internalLink && (
                                <div className="mt-3 pt-2 border-t border-border flex items-center">
                                  <button
                                    onClick={() => {
                                      navigateTo(faq.internalLink!.url);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors cursor-pointer"
                                  >
                                    <span>{faq.internalLink.text}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </section>
              );
            })}
          </div>
        )}

        {/* Bottom Concierge / Support Callout */}
        <section 
          className="mt-14 p-6 sm:p-8 bg-card border border-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
          aria-label="Direct Assistance"
        >
          <div className="space-y-1">
            <h3 className="font-serif text-base sm:text-lg text-white font-bold">
              Have a question not addressed here?
            </h3>
            <p className="text-xs text-muted-foreground font-light max-w-md">
              Our executive concierge team in Kilimani is available 7 days a week for reservations, private suite queries, and special requests.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <a
              href={businessInfo.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-secondary text-xs uppercase tracking-wider text-emerald-400 gap-2 px-4 py-2.5 rounded-xl font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Concierge</span>
            </a>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                navigateTo('/services');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold uppercase tracking-wider gap-2 px-4 py-2.5 rounded-xl shadow-md"
            >
              <span>Book Appointment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </section>

      </main>

    </div>
  );
};
