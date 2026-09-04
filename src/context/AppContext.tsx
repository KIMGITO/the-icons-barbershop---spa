import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ServiceItem, 
  BarberProfile, 
  GalleryItem, 
  FAQItem, 
  BookingRecord, 
  BusinessInfo,
  ProductItem,
  ProductOrder,
  CustomerProfile
} from '../types';
import { 
  SERVICE_PROVIDERS_TABLE,
  PRODUCTS_TABLE,
  GALLERY_TABLE,
  FAQS_TABLE,
  BOOKINGS_TABLE,
  CUSTOMERS_TABLE
} from '../lib/constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { productService } from '../services/productService';
import { serviceService } from '../services/serviceService';
import { providerService } from '../services/providerService';
import { businessService } from '../services/businessService';
import { categoryService } from '../services/categoryService';

const DEFAULT_EMPTY_BUSINESS_INFO: BusinessInfo = {
  name: '',
  tagline: '',
  address: {
    street: '',
    suite: '',
    neighborhood: '',
    city: '',
    country: '',
    mapsEmbedUrl: '',
    directionsUrl: ''
  },
  phone: '',
  phoneDisplay: '',
  whatsapp: '',
  whatsappUrl: '',
  email: '',
  hours: {
    weekdays: { start: '09:00', end: '18:00' },
    saturday: { start: '09:00', end: '18:00' },
    sunday: { start: '00:00', end: '00:00' }
  }
};

interface AppContextType {
  services: ServiceItem[];
  barbers: BarberProfile[];
  gallery: GalleryItem[];
  faqs: FAQItem[];
  bookings: BookingRecord[];
  businessInfo: BusinessInfo;
  products: ProductItem[];
  orders: ProductOrder[];
  customers: CustomerProfile[];
  wishlistSlugs: string[];
  toggleWishlist: (slug: string) => void;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  
  // Navigation & Route state
  currentRoute: string;
  navigateTo: (route: string) => void;
  
  // Booking modal/state
  isBookingModalOpen: boolean;
  selectedPreServiceId?: string;
  selectedPreBarberId?: string;
  openBookingModal: (serviceId?: string, barberId?: string) => void;
  closeBookingModal: () => void;
  createBooking: (booking: Omit<BookingRecord, 'id' | 'referenceNumber' | 'createdAt'>) => BookingRecord;
  cancelBooking: (id: string) => void;
  completeBooking: (id: string) => void;

  // Product Purchase / Reservation modal
  isPurchaseModalOpen: boolean;
  selectedProductForPurchase?: ProductItem;
  openPurchaseModal: (product?: ProductItem) => void;
  closePurchaseModal: () => void;
  createOrder: (order: Omit<ProductOrder, 'id' | 'orderNumber' | 'createdAt'>) => ProductOrder;

  // Admin mutation methods
  updateService: (updated: ServiceItem) => void;
  addService: (newService: Omit<ServiceItem, 'id'>) => void;
  deleteService: (id: string) => void;
  updateFAQ: (updated: FAQItem) => void;
  addFAQ: (newFaq: Omit<FAQItem, 'id'>) => void;
  deleteFAQ: (id: string) => void;
  updateBarber: (updated: BarberProfile) => void;
  updateProduct: (updated: ProductItem) => void;
  addGalleryItem: (item: Omit<GalleryItem, 'id'>) => Promise<void>;
  updateGalleryItem: (updated: GalleryItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  reorderGallery: (items: GalleryItem[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(DEFAULT_EMPTY_BUSINESS_INFO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<ProductOrder[]>(() => {
    try {
      const saved = localStorage.getItem('theicons_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('theicons_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Routing handling (supporting hash and pushState paths)
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && hash.startsWith('/')) return hash;
      return path && path !== '/' ? path : '/';
    }
    return '/';
  });

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPreServiceId, setSelectedPreServiceId] = useState<string | undefined>();
  const [selectedPreBarberId, setSelectedPreBarberId] = useState<string | undefined>();

  // Purchase Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProductForPurchase, setSelectedProductForPurchase] = useState<ProductItem | undefined>();

  /**
   * Load all data from Supabase
   */
  const fetchGallery = async (): Promise<GalleryItem[]> => {
    const { data, error } = await supabase.from('gallery_items').select('*').order('sort_order');
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      alt: row.alt || row.title,
      category: row.category,
      imageUrl: row.image_url,
      caption: row.caption,
      sortOrder: row.sort_order,
      isActive: row.is_active
    }));
  };

  const fetchFaqs = async (): Promise<FAQItem[]> => {
    const { data, error } = await supabase.from('faqs').select('*').order('sort_order');
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      order: row.sort_order,
      isFeaturedOnHome: row.is_featured_on_home,
      isActive: row.is_active,
      internalLink: row.internal_link_url ? { text: row.internal_link_label || 'Learn more', url: row.internal_link_url } : undefined
    }));
  };

  const fetchBookings = async (): Promise<BookingRecord[]> => {
    const { data, error } = await supabase.from('bookings').select('*').order('date', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      referenceNumber: row.reference_number,
      serviceIds: row.service_ids || [],
      serviceNames: row.service_names || [],
      barberId: row.provider_id,
      barberName: row.provider_name,
      date: row.date,
      timeSlot: row.time_slot,
      customerName: row.customer_name,
      customerPhone: row.customer_phone || '',
      customerEmail: row.customer_email || '',
      specialRequests: row.special_requests,
      totalPriceKsh: Number(row.total_price_ksh || 0),
      totalDurationMinutes: row.duration_minutes || 0,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      staffNotes: row.staff_notes,
      createdAt: row.created_at
    }));
  };

  const fetchCustomers = async (): Promise<CustomerProfile[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      avatarUrl: row.avatar_url || '',
      preferredBarberId: row.preferred_provider_id || undefined,
      frequentlyBookedServiceNames: row.frequently_booked_services || [],
      totalVisits: row.total_visits || 0,
      totalSpendKsh: Number(row.total_spend_ksh || 0),
      lastVisitDate: row.last_visit_date || undefined,
      notes: row.notes,
      tags: row.tags || [],
      vipStatus: row.vip_status || false,
      createdAt: row.created_at
    }));
  };

  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [serviceList, providerList, productList, galleryList, faqList, business, bookingList, customerList] = await Promise.all([
        serviceService.getServices(),
        providerService.getProviders(),
        productService.getProducts(true),
        fetchGallery(),
        fetchFaqs(),
        businessService.getBusinessProfile(),
        fetchBookings(),
        fetchCustomers()
      ]);

      setServices(serviceList);
      setBarbers(providerList.map(p => ({
        id: p.id,
        slug: p.slug,
        name: p.fullName,
        title: 'Master',
        specialty: p.providerType,
        bio: p.bio,
        yearsExperience: p.yearsExperience || 0,
        avatarUrl: p.avatarUrl,
        workingDays: [],
        quote: '',
        servicesOfferedIds: p.servicesOfferedIds,
        instagramHandle: p.instagramHandle,
        email: p.email,
        phone: p.phone,
        status: p.status
      })));
      setProducts(productList);
      setGallery(galleryList);
      setFaqs(faqList);
      setBookings(bookingList);
      setCustomers(customerList);

      if (business) {
        setBusinessInfo(prev => ({
          ...prev,
          name: business.name,
          tagline: business.description,
          phone: business.phone,
          phoneDisplay: business.phone,
          email: business.email,
          locationDetails: business.locationDetails || prev.locationDetails,
          hours: {
            weekdays: business.openingHours?.weekdays || prev.hours.weekdays,
            saturday: business.openingHours?.saturday || prev.hours.saturday,
            sunday: business.openingHours?.sunday || prev.hours.sunday
          },
          address: {
            ...prev.address,
            street: business.address || prev.address.street,
            suite: business.neighborhood || prev.address.suite,
            neighborhood: business.neighborhood || prev.address.neighborhood,
            city: business.city || prev.address.city,
            country: prev.address.country,
            mapsEmbedUrl: business.mapsEmbedUrl || prev.address.mapsEmbedUrl,
            directionsUrl: business.directionsUrl || prev.address.directionsUrl
          },
          whatsapp: business.socialLinks.whatsapp || prev.whatsapp,
          whatsappUrl: `https://wa.me/${(business.socialLinks.whatsapp || prev.whatsapp || '').replace(/[+\s]/g, '')}`
        }));
      }
    } catch (err: any) {
      console.error('Failed to load app data:', err);
      setError(err.message || 'Failed to load data from database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('app-context-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          setGallery(prev => [...prev, {
            id: row.id,
            title: row.title,
            alt: row.alt || row.title,
            category: row.category,
            imageUrl: row.image_url,
            caption: row.caption,
            sortOrder: row.sort_order,
            isActive: row.is_active
          }].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          setGallery(prev => prev.map(item => item.id === row.id ? {
            id: row.id,
            title: row.title,
            alt: row.alt || row.title,
            category: row.category,
            imageUrl: row.image_url,
            caption: row.caption,
            sortOrder: row.sort_order,
            isActive: row.is_active
          } : item).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        } else if (payload.eventType === 'DELETE') {
          setGallery(prev => prev.filter(item => item.id === payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          setFaqs(prev => [...prev, {
            id: row.id,
            question: row.question,
            answer: row.answer,
            category: row.category,
            order: row.sort_order,
            isFeaturedOnHome: row.is_featured_on_home,
            isActive: row.is_active,
            internalLink: row.internal_link_url ? { text: row.internal_link_label || 'Learn more', url: row.internal_link_url } : undefined
          }].sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          setFaqs(prev => prev.map(item => item.id === row.id ? {
            id: row.id,
            question: row.question,
            answer: row.answer,
            category: row.category,
            order: row.sort_order,
            isFeaturedOnHome: row.is_featured_on_home,
            isActive: row.is_active,
            internalLink: row.internal_link_url ? { text: row.internal_link_label || 'Learn more', url: row.internal_link_url } : undefined
          } : item).sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else if (payload.eventType === 'DELETE') {
          setFaqs(prev => prev.filter(item => item.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured]);

  useEffect(() => {
    try { localStorage.setItem('theicons_orders', JSON.stringify(orders)); } catch {}
  }, [orders]);

  useEffect(() => {
    try { localStorage.setItem('theicons_wishlist', JSON.stringify(wishlistSlugs)); } catch {}
  }, [wishlistSlugs]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash.replace(/^#/, '');
      const active = hash && hash.startsWith('/') ? hash : path || '/';
      setCurrentRoute(active);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    try {
      window.history.pushState({}, '', route);
    } catch {
      window.location.hash = route;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleWishlist = (slug: string) => {
    setWishlistSlugs(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const openBookingModal = (serviceId?: string, barberId?: string) => {
    setSelectedPreServiceId(serviceId);
    setSelectedPreBarberId(barberId);
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedPreServiceId(undefined);
    setSelectedPreBarberId(undefined);
  };

  const openPurchaseModal = (product?: ProductItem) => {
    setSelectedProductForPurchase(product);
    setIsPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setSelectedProductForPurchase(undefined);
  };

  const createBooking = (bookingData: Omit<BookingRecord, 'id' | 'referenceNumber' | 'createdAt'>): BookingRecord => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newRecord: BookingRecord = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      referenceNumber: `ICN-${randomCode}`,
      createdAt: new Date().toISOString()
    };
    setBookings(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const createOrder = (orderData: Omit<ProductOrder, 'id' | 'orderNumber' | 'createdAt'>): ProductOrder => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newOrder: ProductOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: `ICN-PRD-${randomCode}`,
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  const completeBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b));
  };

  const updateService = async (updated: ServiceItem) => {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (isSupabaseConfigured) {
      try { await serviceService.updateService(updated.id, updated); } catch (e) { console.error(e); }
    }
  };

  const updateProduct = async (updated: ProductItem) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (isSupabaseConfigured) {
      try { await productService.updateProduct(updated.id, updated); } catch (e) { console.error(e); }
    }
  };

  const addService = async (newService: Omit<ServiceItem, 'id'>) => {
    const created = await serviceService.createService(newService);
    setServices(prev => [...prev, created]);
  };

  const deleteService = async (id: string) => {
    await serviceService.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const updateFAQ = async (updated: FAQItem) => {
    setFaqs(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (isSupabaseConfigured) {
      try {
        await supabase.from('faqs').update({
          question: updated.question,
          answer: updated.answer,
          category: updated.category,
          sort_order: updated.order,
          is_featured_on_home: updated.isFeaturedOnHome,
          is_active: updated.isActive !== false,
          internal_link_label: updated.internalLink?.text,
          internal_link_url: updated.internalLink?.url
        }).eq('id', updated.id);
      } catch (e) { console.error(e); }
    }
  };

  const addFAQ = async (newFaq: Omit<FAQItem, 'id'>) => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('faqs').insert({
          question: newFaq.question,
          answer: newFaq.answer,
          category: newFaq.category,
          sort_order: newFaq.order,
          is_featured_on_home: newFaq.isFeaturedOnHome,
          is_active: newFaq.isActive !== false,
          internal_link_label: newFaq.internalLink?.text,
          internal_link_url: newFaq.internalLink?.url
        }).select().single();

        if (data) {
          const item: FAQItem = {
            ...newFaq,
            id: data.id
          };
          setFaqs(prev => [...prev, item].sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      } catch (e) { console.error(e); }
    } else {
      const item: FAQItem = {
        ...newFaq,
        id: `faq-${Date.now()}`
      };
      setFaqs(prev => [...prev, item]);
    }
  };

  const deleteFAQ = async (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    if (isSupabaseConfigured) {
      try { await supabase.from('faqs').delete().eq('id', id); } catch (e) { console.error(e); }
    }
  };

  const updateBarber = (updated: BarberProfile) => {
    setBarbers(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const addGalleryItem = async (item: Omit<GalleryItem, 'id'>) => {
    const { data, error } = await supabase.from('gallery_items').insert({
      title: item.title,
      alt: item.alt || item.title,
      category: item.category,
      image_url: item.imageUrl,
      caption: item.caption,
      sort_order: item.sortOrder ?? 0,
      is_active: item.isActive ?? true
    }).select().single();
    if (error) throw new Error(error.message);
    setGallery(prev => [...prev, {
      id: data.id,
      title: data.title,
      alt: data.alt,
      category: data.category,
      imageUrl: data.image_url,
      caption: data.caption,
      sortOrder: data.sort_order,
      isActive: data.is_active
    }]);
  };

  const updateGalleryItem = async (updated: GalleryItem) => {
    const { error } = await supabase.from('gallery_items').update({
      title: updated.title,
      alt: updated.alt,
      category: updated.category,
      image_url: updated.imageUrl,
      caption: updated.caption,
      sort_order: updated.sortOrder ?? 0,
      is_active: updated.isActive ?? true
    }).eq('id', updated.id);
    if (error) throw new Error(error.message);
    setGallery(prev => prev.map(g => g.id === updated.id ? updated : g));
  };

  const deleteGalleryItem = async (id: string) => {
    const { error } = await supabase.from('gallery_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setGallery(prev => prev.filter(g => g.id !== id));
  };

  const reorderGallery = async (items: GalleryItem[]) => {
    setGallery(items);
    if (isSupabaseConfigured) {
      try {
        await Promise.all(items.map((item, index) =>
          supabase.from('gallery_items').update({ sort_order: index }).eq('id', item.id)
        ));
      } catch (e) {
        console.error('Failed to persist gallery order:', e);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        services,
        barbers,
        gallery,
        faqs,
        bookings,
        businessInfo,
        products,
        orders,
        customers,
        wishlistSlugs,
        toggleWishlist,
        loading,
        error,
        refreshData,
        currentRoute,
        navigateTo,
        isBookingModalOpen,
        selectedPreServiceId,
        selectedPreBarberId,
        openBookingModal,
        closeBookingModal,
        createBooking,
        cancelBooking,
        completeBooking,
        isPurchaseModalOpen,
        selectedProductForPurchase,
        openPurchaseModal,
        closePurchaseModal,
        createOrder,
        updateService,
        addService,
        deleteService,
        updateFAQ,
        addFAQ,
        deleteFAQ,
        updateBarber,
        updateProduct,
        addGalleryItem,
        updateGalleryItem,
        deleteGalleryItem,
        reorderGallery
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
