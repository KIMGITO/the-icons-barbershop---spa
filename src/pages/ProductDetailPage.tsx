import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Star,
  Heart,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  MapPin,
  MessageSquare,
  PackageCheck,
  Award,
  Layers,
  Sparkle,
} from 'lucide-react';
import { updatePageSEO } from '../utils/seo';
import { ProductItem, ServiceItem, ProductReview } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SafeImage } from '../components/ui/SafeImage';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { ReviewList } from '../components/reviews/ReviewList';
import { reviewService } from '../services/reviewService';

interface ProductDetailPageProps {
  slug: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  slug,
}) => {
  const {
    products,
    services,
    navigateTo,
    wishlistSlugs,
    toggleWishlist,
    openPurchaseModal,
    openBookingModal,
    businessInfo,
  } = useApp();

  const product = products.find((p) => p.slug === slug) || products[0];
  const [selectedImage, setSelectedImage] = useState<string>(
    product?.imageUrl || '',
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<ProductReview[]>(
    product?.reviews || [],
  );
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Load approved reviews from database
  useEffect(() => {
    if (product) {
      setReviewsLoading(true);
      setReviewsError(null);
      reviewService
        .getProductReviews(product.id)
        .then((list) => setReviews(list))
        .catch((err) =>
          setReviewsError(err.message || 'Failed to load reviews.'),
        )
        .finally(() => setReviewsLoading(false));
    }
  }, [product?.id]);

  // Sync selected image when slug changes
  useEffect(() => {
    if (product) {
      setSelectedImage(product.imageUrl);
      setQuantity(1);

      // JSON-LD Product Schema
      const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: [product.imageUrl, ...(product.secondaryImages || [])],
        description: product.detailedDescription,
        sku: product.id,
        brand: {
          '@type': 'Brand',
          name: 'The Icons Barber & Spa',
        },
        offers: {
          '@type': 'Offer',
          url: `https://theiconsbarber.co.ke/products/${product.slug}`,
          priceCurrency: 'KES',
          price: product.priceKsh,
          availability:
            product.availability === 'in-stock'
              ? 'https://schema.org/InStock'
              : product.availability === 'low-stock'
                ? 'https://schema.org/LimitedAvailability'
                : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
        },
      };

      updatePageSEO({
        title: `${product.name} — Luxury Grooming`,
        description: `${product.shortDescription} Available for pickup at ${businessInfo.name} ${businessInfo.address.neighborhood} or courier delivery across Kenya.`,
        canonicalUrl: `https://theiconsbarber.co.ke/products/${product.slug}`,
        ogImage: product.imageUrl,
        type: 'product',
        customSchema: productSchema,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [product, slug]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigateTo('/products')}
        >
          Return to Products Catalog
        </Button>
      </div>
    );
  }

  const isWishlisted = wishlistSlugs.includes(product.slug);
  const formatKsh = (amount: number) => `KSh ${amount.toLocaleString()}`;

  const handleSubmitReview = async (data: {
    authorName: string;
    rating: number;
    comment: string;
  }) => {
    await reviewService.submitProductReview({
      productId: product.id,
      authorName: data.authorName,
      rating: data.rating,
      comment: data.comment,
    });
    setShowReviewForm(false);
  };

  // Find related services
  const relatedServices: ServiceItem[] = services.filter((s) =>
    product.relatedServiceSlugs?.includes(s.slug),
  );

  // Find related products
  const relatedProducts: ProductItem[] = products
    .filter(
      (p) =>
        p.slug !== product.slug &&
        (product.relatedProductSlugs?.includes(p.slug) ||
          p.category === product.category),
    )
    .slice(0, 3);

  const allImages = [product.imageUrl, ...(product.secondaryImages || [])];

  const handleWhatsAppInquiry = () => {
    const text = `Hello The Icons Barber & Spa Concierge, I have an inquiry regarding "${product.name}" (KSh ${product.priceKsh.toLocaleString()}). Is it currently available for immediate studio pickup or dispatch?`;
    window.open(
      `https://wa.me/254712345678?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20">
      {/* Breadcrumbs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav
          className="flex items-center gap-2 text-xs text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <button
            onClick={() => navigateTo('/')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => navigateTo('/products')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Grooming Products
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-primary font-medium truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>
      </div>

      {/* Main Product Hero / Purchase Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left Column: Product Gallery Frame (Matching reference image light neutral container) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="relative bg-product-surface rounded-2xl p-8 flex items-center justify-center min-h-[380px] sm:min-h-[460px] border border-white/10 overflow-hidden shadow-2xl">
              {product.badge && (
                <span className="absolute top-5 left-5 z-10 px-3 py-1 text-xs font-bold tracking-wider uppercase bg-card text-white rounded-sm shadow-md">
                  {product.badge}
                </span>
              )}

              <button
                onClick={() => toggleWishlist(product.slug)}
                className={`absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
                  isWishlisted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/90 hover:bg-white text-gray-700 hover:text-black'
                }`}
                aria-label={`Save ${product.name} to wishlist`}
              >
                <Heart
                  className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`}
                />
              </button>

              <SafeImage
                src={selectedImage}
                alt={`${product.name} - The Icons Barber and Spa Nairobi`}
                className="max-h-[360px] sm:max-h-[400px] w-auto object-contain drop-shadow-xl select-none"
              />
            </div>

            {/* Thumbnail selector if multiple images */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-3">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-xl bg-product-surface p-2 border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden ${
                      selectedImage === img
                        ? 'border-primary scale-105'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <SafeImage
                      src={img}
                      alt="Thumbnail preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info, Price & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Category & Origin Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono uppercase tracking-widest text-primary">
                  {product.category.replace('-', ' ')}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-light">
                  {product.specifications.volume}
                </span>
              </div>

              {/* H1 Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight leading-tight mb-4">
                {product.name}
              </h1>

              {/* Rating & Review Counter */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-white">
                  {product.rating}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({product.reviewCount} verified client reviews)
                </span>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {formatKsh(product.priceKsh)}
                </span>
                {product.originalPriceKsh && (
                  <span className="text-base text-primary italic line-through">
                    {formatKsh(product.originalPriceKsh)}
                  </span>
                )}
                <Badge variant="success" pill className="gap-1.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>In Stock </span>
                </Badge>
              </div>

              {/* Short Summary */}
              <p className="text-sm sm:text-base text-muted-foreground-light leading-relaxed mb-8">
                {product.shortDescription}
              </p>

              {/* Action Buttons */}
              <div className="space-y-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    id="product-buy-now-btn"
                    variant="primary"
                    size="lg"
                    onClick={() => openPurchaseModal(product)}
                    className="flex-1 uppercase tracking-wider text-sm shadow-xl hover:shadow-primary/20"
                  >
                    <span>Buy / Reserve</span>
                    <ShoppingBag className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleWhatsAppInquiry}
                    className="uppercase tracking-wider text-xs"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp Concierge</span>
                  </Button>
                </div>

                {/* Studio Collection & Delivery Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-white/5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Pickup ready in at {businessInfo.name}{' '}
                      {businessInfo.address.neighborhood}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-white/5">
                    <Truck className="w-4 h-4 text-primary shrink-0" />
                    <span>Same day delivery </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Scent / Suitable For summary */}
            <div className="pt-6 border-t border-white/10 text-xs text-muted-foreground space-y-2">
              <div>
                <strong className="text-white">Aroma Profile: </strong>
                <span>{product.specifications.scentProfile}</span>
              </div>
              <div>
                <strong className="text-white">Ideal For: </strong>
                <span>{product.suitableFor}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* In-Depth Specifications & Ritual Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Detailed Formulation Description */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4">
                Clinical Precision & Formulation
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground-light leading-relaxed">
                {product.detailedDescription}
              </p>
            </div>

            {/* How to Use Step-by-Step Ritual */}
            <div className="bg-card border border-white/10 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
                <span>The Icons Master Application Ritual</span>
              </h3>
              <div className="space-y-4">
                {product.howToUse.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Active Botanical Ingredients */}
            <div>
              <h3 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Key Active Botanical Ingredients</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.specifications.keyIngredients
                  ? product.specifications.keyIngredients.map(
                      (ingredient, i) => (
                        <span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{ingredient}</span>
                        </span>
                      ),
                    )
                  : null}
              </div>
            </div>
          </div>

          {/* Right Specifications Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-white/10 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-heading font-bold text-white mb-6">
                Product Specifications
              </h3>

              <dl className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <dt className="text-muted-foreground">Volume / Size</dt>
                  <dd className="text-white font-medium text-right">
                    {product.specifications.volume}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <dt className="text-muted-foreground">Origin & Quality</dt>
                  <dd className="text-white font-medium text-right">
                    {product.specifications.origin}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <dt className="text-muted-foreground">Recommended Usage</dt>
                  <dd className="text-white font-medium text-right">
                    {product.specifications.usageFrequency}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <dt className="text-muted-foreground">Availability</dt>
                  <dd className="text-emerald-400 font-bold uppercase text-right">
                    In Stock
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">
                    Cruelty Free & Paraben Free
                  </dt>
                  <dd className="text-white font-medium text-right">
                    Yes, 100% Certified
                  </dd>
                </div>
              </dl>
            </div>

            {/* In-Studio Consultation Card */}
            <div className="bg-gradient-to-br from-secondary to-card border border-primary/30 rounded-2xl p-6">
              <h4 className="text-base font-bold text-white mb-2">
                Need Hair or Scalp Guidance?
              </h4>
              <p className="text-xs text-muted-foreground-light mb-4 leading-relaxed">
                Our master barbers and trichologists provide personalized scalp
                and hair consultations with every studio visit.
              </p>
              <button
                onClick={() => openBookingModal()}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
              >
                Book Studio Consultation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Client Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
              Verified Client Reviews
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Real feedback from studio clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-current' : 'opacity-30'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-white">
                {product.rating} / 5.0
              </span>
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
        </div>

        {reviewsError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive mb-4">
            {reviewsError}
          </div>
        )}

        {showReviewForm && (
          <div className="mb-8 max-w-xl">
            <ReviewForm
              onSubmit={handleSubmitReview}
              title="Rate This Product"
              subtitle="Share your experience with this product. Your review will be published after admin approval."
              submitLabel="Submit Product Review"
            />
          </div>
        )}

        {reviewsLoading ? (
          <div className="p-8 text-center bg-card border border-white/10 rounded-2xl">
            <p className="text-xs text-muted-foreground">Loading reviews...</p>
          </div>
        ) : (
          <ReviewList
            reviews={reviews}
            emptyMessage="No reviews yet. Be the first to share your experience with this product!"
          />
        )}
      </section>

      {/* Related Studio Services (Cross-linking for SEO & Discovery) */}
      {relatedServices.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Complementary Studio Services
            </h2>
            <p className="text-xs text-muted-foreground">
              Services featuring this product or designed to maximize its
              benefits
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedServices.map((service) => (
              <div
                key={service.id}
                onClick={() => navigateTo(`/services/${service.slug}`)}
                className="group bg-card border border-white/10 hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                      {service.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {service.durationMinutes} mins
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors mb-2">
                    {service.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                    {service.shortDescription}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-sm font-bold text-white">
                    KSh {service.priceKsh.toLocaleString()}
                  </span>
                  <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>View Service</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Products Showcase */}
      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1">
                You May Also Require
              </h2>
              <p className="text-xs text-muted-foreground">
                Curated items that pair seamlessly with {product.name}
              </p>
            </div>
            <button
              onClick={() => navigateTo('/products')}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigateTo(`/products/${rel.slug}`)}
                className="group bg-card border border-white/10 hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all p-4 flex items-center gap-4"
              >
                <div className="w-20 h-20 bg-product-surface rounded-lg p-2 flex items-center justify-center shrink-0">
                  <SafeImage
                    src={rel.imageUrl}
                    alt={rel.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                    {rel.name}
                  </h4>
                  <div className="text-xs text-muted-foreground mb-1">
                    {rel.specifications.volume}
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {formatKsh(rel.priceKsh)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
