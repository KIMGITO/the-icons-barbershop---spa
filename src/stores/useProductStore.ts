import { create } from 'zustand';
import { ProductItem, ProductCategory } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialData';

const ENRICHED_PRODUCTS: ProductItem[] = INITIAL_PRODUCTS.map((prod, idx) => ({
  ...prod,
  stockQuantity: prod.stockQuantity ?? (prod.availability === 'out-of-stock' ? 0 : prod.availability === 'low-stock' ? 4 : 24 + idx * 5),
  sku: prod.sku ?? `ICN-PRD-00${idx + 1}`,
  lowStockThreshold: prod.lowStockThreshold ?? 5,
  isFeatured: prod.isFeatured ?? (idx < 4),
  status: prod.status ?? 'active',
}));

interface ProductStore {
  products: ProductItem[];
  searchQuery: string;
  categoryFilter: ProductCategory;
  stockFilter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  selectedProduct: ProductItem | null;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: ProductCategory) => void;
  setStockFilter: (filter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock') => void;
  setSelectedProduct: (product: ProductItem | null) => void;

  addProduct: (product: Omit<ProductItem, 'id'>) => ProductItem;
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  setStockQuantity: (id: string, quantity: number) => void;
  toggleFeatured: (id: string) => void;

  getFilteredProducts: () => ProductItem[];
  getLowStockCount: () => number;
}

export const useProductStore = create<ProductStore>((set, get) => {
  const savedProducts = (() => {
    try {
      const item = localStorage.getItem('theicons_products_management');
      return item ? JSON.parse(item) : ENRICHED_PRODUCTS;
    } catch {
      return ENRICHED_PRODUCTS;
    }
  })();

  const updateAvailability = (quantity: number, threshold: number): ProductItem['availability'] => {
    if (quantity <= 0) return 'out-of-stock';
    if (quantity <= threshold) return 'low-stock';
    return 'in-stock';
  };

  return {
    products: savedProducts,
    searchQuery: '',
    categoryFilter: 'all',
    stockFilter: 'all',
    selectedProduct: null,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),
    setStockFilter: (stockFilter) => set({ stockFilter }),
    setSelectedProduct: (product) => set({ selectedProduct: product }),

    addProduct: (productData) => {
      const quantity = productData.stockQuantity ?? 10;
      const threshold = productData.lowStockThreshold ?? 5;
      const availability = updateAvailability(quantity, threshold);
      
      const newProduct: ProductItem = {
        ...productData,
        id: `prod-${Date.now()}`,
        availability,
        rating: productData.rating || 5.0,
        reviewCount: productData.reviewCount || 0,
        status: productData.status || 'active',
      };

      set((state) => {
        const updated = [newProduct, ...state.products];
        try {
          localStorage.setItem('theicons_products_management', JSON.stringify(updated));
          localStorage.setItem('theicons_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { products: updated };
      });

      return newProduct;
    },

    updateProduct: (id, updates) => {
      set((state) => {
        const updated = state.products.map((p) => {
          if (p.id === id) {
            const nextProduct = { ...p, ...updates };
            if (updates.stockQuantity !== undefined || updates.lowStockThreshold !== undefined) {
              const qty = nextProduct.stockQuantity ?? 0;
              const thresh = nextProduct.lowStockThreshold ?? 5;
              nextProduct.availability = updateAvailability(qty, thresh);
            }
            return nextProduct;
          }
          return p;
        });

        try {
          localStorage.setItem('theicons_products_management', JSON.stringify(updated));
          localStorage.setItem('theicons_products', JSON.stringify(updated));
        } catch {
          // ignore
        }

        const updatedSelected = state.selectedProduct?.id === id 
          ? { ...state.selectedProduct, ...updates } 
          : state.selectedProduct;

        return { products: updated, selectedProduct: updatedSelected };
      });
    },

    deleteProduct: (id) => {
      set((state) => {
        const updated = state.products.filter((p) => p.id !== id);
        try {
          localStorage.setItem('theicons_products_management', JSON.stringify(updated));
          localStorage.setItem('theicons_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { 
          products: updated, 
          selectedProduct: state.selectedProduct?.id === id ? null : state.selectedProduct 
        };
      });
    },

    adjustStock: (id, delta) => {
      const product = get().products.find((p) => p.id === id);
      if (product) {
        const newQuantity = Math.max(0, (product.stockQuantity ?? 0) + delta);
        get().setStockQuantity(id, newQuantity);
      }
    },

    setStockQuantity: (id, quantity) => {
      set((state) => {
        const updated = state.products.map((p) => {
          if (p.id === id) {
            const thresh = p.lowStockThreshold ?? 5;
            return {
              ...p,
              stockQuantity: quantity,
              availability: updateAvailability(quantity, thresh),
            };
          }
          return p;
        });

        try {
          localStorage.setItem('theicons_products_management', JSON.stringify(updated));
          localStorage.setItem('theicons_products', JSON.stringify(updated));
        } catch {
          // ignore
        }

        return { products: updated };
      });
    },

    toggleFeatured: (id) => {
      set((state) => {
        const updated = state.products.map((p) => (p.id === id ? { ...p, isFeatured: !p.isFeatured } : p));
        try {
          localStorage.setItem('theicons_products_management', JSON.stringify(updated));
          localStorage.setItem('theicons_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return { products: updated };
      });
    },

    getFilteredProducts: () => {
      const { products, searchQuery, categoryFilter, stockFilter } = get();
      return products.filter((p) => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) {
          return false;
        }

        if (stockFilter !== 'all') {
          if (p.availability !== stockFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku?.toLowerCase().includes(q);
          const matchCategory = p.category.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCategory) {
            return false;
          }
        }

        return true;
      });
    },

    getLowStockCount: () => {
      return get().products.filter((p) => p.availability === 'low-stock' || p.availability === 'out-of-stock').length;
    },
  };
});
