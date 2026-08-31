import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProductItem, ProductReview } from '../types';

const PRODUCTS_STORAGE_KEY = 'theicons_products';
const REVIEWS_STORAGE_KEY = 'theicons_product_reviews';

const mapDbProduct = (row: any): ProductItem => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category,
  shortDescription: row.short_description || '',
  detailedDescription: row.detailed_description || '',
  priceKsh: Number(row.price_ksh || 0),
  originalPriceKsh: row.original_price_ksh ? Number(row.original_price_ksh) : undefined,
  availability: row.availability,
  imageUrl: row.image_url || '',
  secondaryImages: row.secondary_images || [],
  badge: row.badge,
  rating: Number(row.rating || 5),
  reviewCount: row.review_count || 0,
  specifications: row.specifications || {},
  howToUse: row.how_to_use || [],
  suitableFor: row.suitable_for || '',
  relatedServiceSlugs: row.related_service_slugs || [],
  relatedProductSlugs: row.related_product_slugs || [],
  stockQuantity: row.stock_quantity,
  lowStockThreshold: row.low_stock_threshold,
  sku: row.sku,
  isFeatured: row.is_featured,
  status: row.status
});

const mapDbReview = (row: any): ProductReview => ({
  id: row.id,
  authorName: row.author_name,
  rating: row.rating,
  date: row.date,
  comment: row.comment,
  verifiedPurchase: row.verified_purchase,
  reviewStatus: row.review_status || 'approved',
  productId: row.product_id
});

export const productService = {
  /**
   * Fetch all active products from the database (public-facing)
   */
  async getProducts(includeReviews: boolean = false): Promise<ProductItem[]> {
    if (!isSupabaseConfigured) {
      try {
        const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }

    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw new Error(error.message);
    const products = (data || []).map(mapDbProduct);

    if (includeReviews && products.length > 0) {
      const productIds = products.map(p => p.id);
      const { data: reviews, error: reviewErr } = await supabase
        .from('product_reviews')
        .select('*')
        .in('product_id', productIds)
        .eq('review_status', 'approved');
      if (!reviewErr && reviews) {
        const reviewsByProduct = new Map<string, ProductReview[]>();
        for (const r of reviews) {
          const list = reviewsByProduct.get(r.product_id) || [];
          list.push(mapDbReview(r));
          reviewsByProduct.set(r.product_id, list);
        }
        for (const p of products) {
          p.reviews = reviewsByProduct.get(p.id) || [];
        }
      }
    }
    return products;
  },

  async getProductById(id: string): Promise<ProductItem | null> {
    const list = await this.getProducts(true);
    return list.find(p => p.id === id) || null;
  },

  async getProductBySlug(slug: string): Promise<ProductItem | null> {
    const list = await this.getProducts(true);
    return list.find(p => p.slug === slug) || null;
  },

  /**
   * ADMIN: List all products including drafts & archived
   */
  async adminListProducts(): Promise<ProductItem[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('admin_list_products');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbProduct);
  },

  /**
   * ADMIN: Create a product
   */
  async createProduct(data: Omit<ProductItem, 'id'>): Promise<ProductItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const { data: created, error } = await supabase.rpc('admin_create_product', {
      p_slug: data.slug,
      p_name: data.name,
      p_category: data.category,
      p_short_description: data.shortDescription || '',
      p_detailed_description: data.detailedDescription || '',
      p_price_ksh: data.priceKsh,
      p_original_price_ksh: data.originalPriceKsh ?? null,
      p_availability: data.availability,
      p_image_url: data.imageUrl || '',
      p_secondary_images: data.secondaryImages || [],
      p_badge: data.badge || null,
      p_rating: data.rating || 5.0,
      p_specifications: data.specifications || {},
      p_how_to_use: data.howToUse || [],
      p_suitable_for: data.suitableFor || '',
      p_related_service_slugs: data.relatedServiceSlugs || [],
      p_related_product_slugs: data.relatedProductSlugs || [],
      p_stock_quantity: data.stockQuantity ?? 10,
      p_low_stock_threshold: data.lowStockThreshold ?? 5,
      p_sku: data.sku || null,
      p_is_featured: data.isFeatured ?? false,
      p_status: data.status || 'active'
    });
    if (error) throw new Error(error.message);
    return mapDbProduct(created);
  },

  /**
   * ADMIN: Update a product
   */
  async updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.slug !== undefined) db.slug = updates.slug;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.shortDescription !== undefined) db.short_description = updates.shortDescription;
    if (updates.detailedDescription !== undefined) db.detailed_description = updates.detailedDescription;
    if (updates.priceKsh !== undefined) db.price_ksh = updates.priceKsh;
    if (updates.originalPriceKsh !== undefined) db.original_price_ksh = updates.originalPriceKsh;
    if (updates.availability !== undefined) db.availability = updates.availability;
    if (updates.imageUrl !== undefined) db.image_url = updates.imageUrl;
    if (updates.secondaryImages !== undefined) db.secondary_images = updates.secondaryImages;
    if (updates.badge !== undefined) db.badge = updates.badge;
    if (updates.rating !== undefined) db.rating = updates.rating;
    if (updates.reviewCount !== undefined) db.review_count = updates.reviewCount;
    if (updates.specifications !== undefined) db.specifications = updates.specifications;
    if (updates.howToUse !== undefined) db.how_to_use = updates.howToUse;
    if (updates.suitableFor !== undefined) db.suitable_for = updates.suitableFor;
    if (updates.stockQuantity !== undefined) db.stock_quantity = updates.stockQuantity;
    if (updates.lowStockThreshold !== undefined) db.low_stock_threshold = updates.lowStockThreshold;
    if (updates.sku !== undefined) db.sku = updates.sku;
    if (updates.isFeatured !== undefined) db.is_featured = updates.isFeatured;
    if (updates.status !== undefined) db.status = updates.status;

    const { data: updated, error } = await supabase.rpc('admin_update_product', {
      p_id: id,
      p_updates: db
    });
    if (error) throw new Error(error.message);
    return mapDbProduct(updated);
  },

  /**
   * ADMIN: Delete a product permanently
   */
  async deleteProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_delete_product', { p_id: id });
    if (error) throw new Error(error.message);
  },

  /**
   * ADMIN: Set product status (active / draft / archived)
   */
  async setProductStatus(id: string, status: 'active' | 'draft' | 'archived'): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_set_product_status', { p_id: id, p_status: status });
    if (error) throw new Error(error.message);
  },

  /**
   * ADMIN: List all reviews including pending
   */
  async adminListReviews(): Promise<ProductReview[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('admin_list_reviews');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbReview);
  },

  /**
   * ADMIN: Approve / reject / archive a review
   */
  async setReviewStatus(reviewId: string, status: 'pending' | 'approved' | 'rejected' | 'archived'): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_set_review_status', {
      p_review_id: reviewId,
      p_status: status
    });
    if (error) throw new Error(error.message);
  },

  /**
   * ADMIN: Delete a review permanently
   */
  async deleteReview(reviewId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_delete_review', { p_review_id: reviewId });
    if (error) throw new Error(error.message);
  },

  async adjustStock(id: string, delta: number): Promise<ProductItem> {
    const product = await this.getProductById(id);
    if (!product) throw new Error('Product not found');
    const newQuantity = Math.max(0, (product.stockQuantity ?? 0) + delta);
    return this.updateProduct(id, {
      stockQuantity: newQuantity,
      availability: newQuantity <= 0 ? 'out-of-stock' : newQuantity <= (product.lowStockThreshold ?? 5) ? 'low-stock' : 'in-stock'
    });
  }
};