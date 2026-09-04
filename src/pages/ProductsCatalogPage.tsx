import { SafeImage } from '../components/ui/SafeImage';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Star,
  Heart,
  ShoppingBag,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';
import { updatePageSEO } from '../utils/seo';
import { ProductCategory } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ThemeSelect } from '../components/ui/ThemeSelect';

export const ProductsCatalogPage: React.FC = () => {
  const {
    products,
    services,
    navigateTo,
    wishlistSlugs,
    toggleWishlist,
    openPurchaseModal,
    isSupabaseConfigured
  } = useApp();
  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'featured' | 'price-asc' | 'price-desc' | 'rating'
  >('featured');

  useEffect(() => {
    updatePageSEO({
      title: 'Executive Grooming Products & Trichology Apothecary',
      description:
        'Explore The Icons exclusive apothecary: clarifying shampoos, TR2 follicle therapy, organic argan beard oils, and matte styling clays. Available at our Kilimani Nairobi studio or for courier delivery.',
      canonicalUrl: 'https://theiconsbarber.co.ke/products',
      type: 'website',
      schemaType: 'LocalBusiness',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const categories: { label: string; value: ProductCategory }[] = [
    { label: 'All Essentials', value: 'all' },
    { label: 'Scalp & Follicle Care', value: 'scalp-care' },
    { label: 'Beard Grooming', value: 'beard-grooming' },
    { label: 'Hair Styling & Wax', value: 'hair-styling' },
    { label: 'Trichology & Vitality', value: 'follicle-health' },
    { label: 'Gift Sets & Kits', value: 'kits' },
  ];

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Hide inactive or archived products
        if (isSupabaseConfigured && (p.status === 'inactive' || p.status === 'archived')) return false;

        const matchesCat =
          selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.shortDescription
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          p.suitableFor.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.priceKsh - b.priceKsh;
        if (sortBy === 'price-desc') return b.priceKsh - a.priceKsh;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // default featured
      });
  }, [products, selectedCategory, searchQuery, sortBy, isSupabaseConfigured]);

  const formatKsh = (amount: number) => `KSh ${amount.toLocaleString()}`;

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
          <span className="text-primary font-medium">Grooming Products</span>
        </nav>
      </div>

      {/* Hero Banner */}
      <section className="relative py-12 sm:py-16 bg-gradient-to-b from-secondary to-background border-b border-white/10 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-white tracking-tight leading-tight mb-4">
            Curated Grooming Apothecary & Executive Essentials
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground-light max-w-2xl mx-auto font-light leading-relaxed mb-8">
            The identical clinical-grade tonics, organic cold-pressed oils, and
            styling clays used by our master barbers in our Kilimani sanctuary.
            Formulated for longevity and uncompromising performance.
          </p>

          {/* Value Props Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 border-t border-white/10 text-xs text-foreground">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>100% Authentic </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <span>Same Day Pickup at the Shop</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>Master Barber Recommendation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-white/10">
          {/* Category Chips */}
          <div className="tabs-pill overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`tab-pill whitespace-nowrap text-xs ${
                  selectedCategory === cat.value ? 'tab-pill-active' : ''
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search products or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 text-xs"
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <ThemeSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-base input-default w-full sm:w-auto px-3 py-2 text-xs cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </ThemeSelect>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-white/10">
            <p className="text-base text-muted-foreground mb-4">
              No products found matching your search criteria.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="uppercase tracking-wider text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const isWishlisted = wishlistSlugs.includes(product.slug);
              return (
                <div
                  key={product.id}
                  id={`catalog-product-${product.slug}`}
                  className="group relative flex flex-col justify-end bg-card rounded-3xl border border-white/10 hover:border-primary/60 transition-all duration-300 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/10 h-[390px]"
                >
                  {/* Immersive Image with Smooth Gradient Scrim */}
                  <div
                    onClick={() => navigateTo(`/products/${product.slug}`)}
                    className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
                  >
                    <SafeImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 select-none"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/20" />
                  </div>

                 
                  {/* Card Bottom Content */}
                  <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-end">
                    <h3
                      onClick={() => navigateTo(`/products/${product.slug}`)}
                      className="text-white font-heading text-base font-semibold line-clamp-1 hover:text-primary transition-colors cursor-pointer mb-1.5"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    <p className="text-[11px] sm:text-xs text-white/70 line-clamp-2 leading-relaxed mb-3">
                      {product.shortDescription}
                    </p>

                    {/* Pill Tags */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-lg  text-white font-semibold text-[11px] tracking-tight">
                        {formatKsh(product.priceKsh)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md  text-primary/80 font-normal text-[10px] truncate max-w-[120px]">
                        {product.specifications.volume.split('/')[0].trim()}
                      </span>
                    </div>

                    {/* Full Width Pill Action Button */}
                    <Button
                      variant="gold-outline"
                      size="sm"
                      
                      onClick={() => openPurchaseModal(product)}
                      className="w-full tracking-wide shadow-md hover:shadow-lg "
                    >
                      <div className='flex w-full justify-around items-center ' ><p>Purchase </p> <ShoppingBag className='w-4'/> </div>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross-Link Banner to Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="card-bordered rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-xl text-left">
            <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-2">
              Pair Your Products with <span className='text-primary'>Master Studio Treatments</span>
            </h3>
            <p className="text-sm text-muted-foreground-light">
              Experience our {
                services.length > 0
                  ? `exclusive ${services[0].name} and other premium grooming services`
                  : 'premium grooming services'
              }
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigateTo('/services')}
            className="uppercase tracking-wider text-xs shadow-lg shrink-0"
          >
            Explore Services & Book
          </Button>
        </div>
      </div>
    </div>
  );
};
