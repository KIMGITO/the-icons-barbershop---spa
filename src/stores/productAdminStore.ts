import { create } from 'zustand';
import { ProductItem, ProductReview, ServiceReview } from '../types';
import { productService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProductAdminState {
  products: ProductItem[];
  reviews: ProductReview[];
  serviceReviews: ServiceReview[];
  loading: boolean;
  error: string | null;

  // Actions
  loadProducts: () => Promise<void>;
  loadReviews: () => Promise<void>;
  createProduct: (data: Omit<ProductItem, 'id'>) => Promise<ProductItem>;
  updateProduct: (id: string, updates: Partial<ProductItem>) => Promise<ProductItem>;
  deleteProduct: (id: string) => Promise<void>;
  setProductStatus: (id: string, status: 'active' | 'draft' | 'archived') => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  setReviewStatus: (reviewId: string, status: 'pending' | 'approved' | 'rejected' | 'archived') => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  setServiceReviewStatus: (reviewId: string, status: 'pending' | 'approved' | 'rejected' | 'archived') => Promise<void>;
  deleteServiceReview: (reviewId: string) => Promise<void>;
  subscribeToProducts: () => () => void;
}

export const useProductAdminStore = create<ProductAdminState>((set, get) => ({
  products: [],
  reviews: [],
  serviceReviews: [],
  loading: false,
  error: null,

  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      const list = await productService.adminListProducts();
      set({ products: list, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  loadReviews: async () => {
    set({ loading: true, error: null });
    try {
      const [productReviews, serviceReviews] = await Promise.all([
        productService.adminListReviews(),
        reviewService.adminListServiceReviews()
      ]);
      set({ reviews: productReviews, serviceReviews, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProduct: async (data) => {
    set({ loading: true, error: null });
    try {
      const created = await productService.createProduct(data);
      set(state => ({
        products: [created, ...state.products],
        loading: false
      }));
      return created;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  updateProduct: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await productService.updateProduct(id, updates);
      set(state => ({
        products: state.products.map(p => p.id === id ? updated : p),
        loading: false
      }));
      return updated;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await productService.deleteProduct(id);
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  setProductStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      await productService.setProductStatus(id, status);
      set(state => ({
        products: state.products.map(p => p.id === id ? { ...p, status } : p),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  adjustStock: async (id, delta) => {
    set({ loading: true, error: null });
    try {
      const updated = await productService.adjustStock(id, delta);
      set(state => ({
        products: state.products.map(p => p.id === id ? updated : p),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  setReviewStatus: async (reviewId, status) => {
    set({ loading: true, error: null });
    try {
      await productService.setReviewStatus(reviewId, status);
      set(state => ({
        reviews: state.reviews.map(r => r.id === reviewId ? { ...r, reviewStatus: status } : r),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  deleteReview: async (reviewId) => {
    set({ loading: true, error: null });
    try {
      await productService.deleteReview(reviewId);
      set(state => ({
        reviews: state.reviews.filter(r => r.id !== reviewId),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  setServiceReviewStatus: async (reviewId, status) => {
    set({ loading: true, error: null });
    try {
      await reviewService.setServiceReviewStatus(reviewId, status);
      set(state => ({
        serviceReviews: state.serviceReviews.map(r => r.id === reviewId ? { ...r, reviewStatus: status } : r),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  deleteServiceReview: async (reviewId) => {
    set({ loading: true, error: null });
    try {
      await reviewService.deleteServiceReview(reviewId);
      set(state => ({
        serviceReviews: state.serviceReviews.filter(r => r.id !== reviewId),
        loading: false
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  subscribeToProducts: () => {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel('products-realtime')
      // Products
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newItem: ProductItem = {
            id: row.id,
            slug: row.slug,
            name: row.name,
            category: row.category,
            priceKsh: row.price_ksh,
            stockQuantity: row.stock_quantity,
            imageUrl: row.image_url,
            status: row.status,
            description: row.description,
            shortDescription: row.short_description,
            features: row.features || []
          };
          set(state => ({ 
            products: state.products.some(p => p.id === newItem.id) 
              ? state.products 
              : [newItem, ...state.products] 
          }));
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          const updated: ProductItem = {
            id: row.id,
            slug: row.slug,
            name: row.name,
            category: row.category,
            priceKsh: row.price_ksh,
            stockQuantity: row.stock_quantity,
            imageUrl: row.image_url,
            status: row.status,
            description: row.description,
            shortDescription: row.short_description,
            features: row.features || []
          };
          set(state => ({
            products: state.products.map(p => p.id === updated.id ? updated : p)
          }));
        } else if (payload.eventType === 'DELETE') {
          set(state => ({
            products: state.products.filter(p => p.id !== payload.old.id)
          }));
        }
      })
      // Product Reviews
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newItem: ProductReview = {
            id: row.id,
            productId: row.product_id,
            authorName: row.author_name,
            rating: row.rating,
            comment: row.comment,
            reviewStatus: row.review_status,
            createdAt: row.created_at
          };
          set(state => ({ 
            reviews: state.reviews.some(r => r.id === newItem.id) 
              ? state.reviews 
              : [newItem, ...state.reviews] 
          }));
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          const updated: ProductReview = {
            id: row.id,
            productId: row.product_id,
            authorName: row.author_name,
            rating: row.rating,
            comment: row.comment,
            reviewStatus: row.review_status,
            createdAt: row.created_at
          };
          set(state => ({
            reviews: state.reviews.map(r => r.id === updated.id ? updated : r)
          }));
        } else if (payload.eventType === 'DELETE') {
          set(state => ({
            reviews: state.reviews.filter(r => r.id !== payload.old.id)
          }));
        }
      })
      // Service Reviews
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_reviews' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newItem: ServiceReview = {
            id: row.id,
            serviceId: row.service_id,
            authorName: row.author_name,
            rating: row.rating,
            comment: row.comment,
            reviewStatus: row.review_status,
            createdAt: row.created_at
          };
          set(state => ({ 
            serviceReviews: state.serviceReviews.some(r => r.id === newItem.id) 
              ? state.serviceReviews 
              : [newItem, ...state.serviceReviews] 
          }));
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          const updated: ServiceReview = {
            id: row.id,
            serviceId: row.service_id,
            authorName: row.author_name,
            rating: row.rating,
            comment: row.comment,
            reviewStatus: row.review_status,
            createdAt: row.created_at
          };
          set(state => ({
            serviceReviews: state.serviceReviews.map(r => r.id === updated.id ? updated : r)
          }));
        } else if (payload.eventType === 'DELETE') {
          set(state => ({
            serviceReviews: state.serviceReviews.filter(r => r.id !== payload.old.id)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
