import { create } from 'zustand';
import { ProductItem, ProductReview } from '../types';
import { productService } from '../services/productService';

interface ProductAdminState {
  products: ProductItem[];
  reviews: ProductReview[];
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
}

export const useProductAdminStore = create<ProductAdminState>((set, get) => ({
  products: [],
  reviews: [],
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
      const list = await productService.adminListReviews();
      set({ reviews: list, loading: false });
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
  }
}));