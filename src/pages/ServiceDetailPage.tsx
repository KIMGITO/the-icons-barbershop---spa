import { SafeImage } from '../components/ui/SafeImage';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SEO } from '../components/SEO';
import { Clock, Calendar, Check, ArrowLeft, Shield, User, ArrowRight, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { ReviewList } from '../components/reviews/ReviewList';
import { reviewService } from '../services/reviewService';
import { ServiceReview } from '../types';

interface ServiceDetailPageProps {
  slug: string;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ slug }) => {
  const { services, openBookingModal, navigateTo, barbers, businessInfo } = useApp();
  const service = services.find(s => s.slug === slug) || services[0];
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Load approved service reviews from database
  useEffect(() => {
    if (service) {
      setReviewsLoading(true);
      setReviewsError(null);
      reviewService.getServiceReviews(service.id)
        .then(list => setReviews(list))
        .catch(err => setReviewsError(err.message || 'Failed to load reviews.'))
        .finally(() => setReviewsLoading(false));
    }
  }, [service?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!service) {
    return (
      <div className="pt-36 pb-24 max-w-4xl mx-auto px-4 text-center">
        <h2 className="font-display text-2xl font-bold text-white mb-4">Service Not Found</h2>
        <button 
          onClick={() => navigateTo('/services')} 
          className="text-primary underline text-sm"
        >
          View All Services
        </button>
      </div>
    );
  }

  // Find barbers that offer this service
  const qualifiedBarbers = barbers.filter(b => b.servicesOfferedIds.includes(service.id));

  const handleSubmitReview = async (data: { authorName: string; rating: number; comment: string }) => {
    await reviewService.submitServiceReview({
      serviceId: service.id,
      authorName: data.authorName,
      rating: data.rating,
      comment: data.comment
    });
    setShowReviewForm(false);
  };

  // Related services (other services in catalog)
  const relatedServices = services.filter(s => s.id !== service.id).slice(0, 3);

  return (
    <div className="pt-28 pb-24 bg-background min-h-screen">
      <SEO 
        title={`${service.name} | The Icons Barber & Spa`}
        description={service.shortDescription}
        canonicalUrl={`https://theiconsbarber.co.ke/services/${service.slug}`}
        ogImage={service.imageUrl}
        type="service"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigateTo('/services')} className="hover:text-white transition-colors">Services</button>
          <span>/</span>
          <span className="text-primary truncate font-medium">{service.name}</span>
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTo('/services')}
          className="text-xs uppercase tracking-wider gap-2 -ml-2 text-muted-foreground-light hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to All Services</span>
        </Button>

        {/* Service Hero Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* Left Column: Image & Inclusions */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
              <SafeImage
                src={service.imageUrl}
                alt={`${service.name} at The Icons Barber & Spa Kilimani Nairobi`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md border border-border text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{service.durationMinutes} Minutes</span>
              </div>
            </div>

            {/* Included Service Features List */}
            <div className="card-bordered p-6 space-y-4 shadow-md">
              <h3 className="text-xs uppercase tracking-widest text-primary font-bold">
                Treatment Inclusions
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-foreground">
                {service.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-secondary border border-primary/40 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">✓</span>
                    <span className="font-light">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Pricing & Booking Card */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="space-y-3">
              <Badge variant="primary" pill>
                Executive Care Ritual
              </Badge>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                {service.name}
              </h1>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-primary">
                  KSh {service.priceKsh.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground font-light">
                  • {service.durationMinutes} min appointment
                </span>
              </div>
            </div>

            {/* Full SEO Narrative */}
            <div className="space-y-4 text-xs sm:text-sm md:text-base text-muted-foreground-light leading-relaxed border-t border-b border-border py-6 font-light">
              <p>{service.fullDescription}</p>
              {service.recommendedFor && (
                <p className="text-xs text-muted-foreground-light bg-card p-3.5 rounded-xl border border-border">
                  <strong className="text-white font-medium">Recommended For:</strong> {service.recommendedFor}
                </p>
              )}
            </div>

            {/* Direct Booking CTA */}
            <div className="space-y-3 pt-2">
              <Button
                id="service-detail-book-btn"
                variant="primary"
                size="lg"
                onClick={() => openBookingModal(service.id)}
                className="w-full uppercase tracking-wider text-xs shadow-xl"
              >
                <Calendar className="w-4 h-4" />
                <span>Book This Treatment Now</span>
              </Button>

            
            </div>

            {/* Qualified Master Barbers for this service */}
            {qualifiedBarbers.length > 0 && (
              <div className="pt-6 border-t border-border space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-white font-bold">
                  Recommended Master Barbers For This Service:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {qualifiedBarbers.map(barber => (
                    <div 
                      key={barber.id}
                      onClick={() => openBookingModal(service.id, barber.id)}
                      className="card-interactive p-3 rounded-xl cursor-pointer flex items-center gap-3 group"
                    >
                      <SafeImage
                        src={barber.avatarUrl}
                        alt={barber.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-primary transition-colors block truncate">{barber.name}</span>
                        <span className="text-[10px] text-primary block truncate">{barber.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Client Reviews */}
        <div className="pt-12 border-t border-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                Client Reviews
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Real feedback from clients who have experienced this treatment
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-xs"
            >
              {showReviewForm ? 'Hide Review Form' : 'Write a Review'}
            </Button>
          </div>

          {reviewsError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
              {reviewsError}
            </div>
          )}

          {showReviewForm && (
            <div className="max-w-xl">
              <ReviewForm
                onSubmit={handleSubmitReview}
                title="Rate This Service"
                subtitle="Share your experience with this treatment. Your review will be published after admin approval."
                submitLabel="Submit Service Review"
              />
            </div>
          )}

          {reviewsLoading ? (
            <div className="p-8 text-center bg-card border border-border rounded-2xl">
              <p className="text-xs text-muted-foreground">Loading reviews...</p>
            </div>
          ) : (
            <ReviewList
              reviews={reviews}
              emptyMessage="No reviews yet. Be the first to share your experience with this service!"
            />
          )}
        </div>

        {/* Section 15 Requirement: Related Services */}
        <div className="pt-12 border-t border-border space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
              Related Grooming Services
            </h3>
            <button
              onClick={() => navigateTo('/services')}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedServices.map(rel => (
              <div
                key={rel.id}
                onClick={() => navigateTo(`/services/${rel.slug}`)}
                className="group bg-card border border-border hover:border-primary/50 rounded-xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-secondary">
                  <SafeImage
                    src={rel.imageUrl}
                    alt={rel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-0.5 rounded text-[11px] font-mono text-primary">
                    KSh {rel.priceKsh.toLocaleString()}
                  </div>
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {rel.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-light">
                    {rel.shortDescription}
                  </p>
                </div>
                <div className="text-xs text-primary flex items-center gap-1 font-medium pt-1">
                  <span>Explore Service</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Post-Treatment Care Products */}
        <div className="pt-12 border-t border-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                Recommended Post-Treatment Care Products
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Prolong your salon-fresh sharpness and scalp health at home
              </p>
            </div>
            <button
              onClick={() => navigateTo('/products')}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 bg-card rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
             
              <div>
                <h4 className="text-base font-bold text-white">Master Apothecary Formulations</h4>
                <p className="text-xs text-muted-foreground-light mt-0.5">
                  Available for pickup during your service appointment or courier delivery across Nairobi.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateTo('/products')}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer"
            >
              View Recommended Products
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
