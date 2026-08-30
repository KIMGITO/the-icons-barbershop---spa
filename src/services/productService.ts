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
  verifiedPurchase: row.verified_purchase
});

export const productService = {
  /**
   * Fetch all active products from the database
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
        .in('product_id', productIds);
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

  async createProduct(data: Omit<ProductItem, 'id'>): Promise<ProductItem> {
    const { data: created, error } = await supabase.from('products').insert({
      slug: data.slug,
      name: data.name,
      category: data.category,
      short_description: data.shortDescription,
      detailed_description: data.detailedDescription,
      price_ksh: data.priceKsh,
      original_price_ksh: data.originalPriceKsh || null,
      availability: data.availability,
      image_url: data.imageUrl,
      secondary_images: data.secondaryImages || [],
      badge: data.badge || null,
      rating: data.rating || 5.0,
      review_count: data.reviewCount || 0,
      specifications: data.specifications || {},
      how_to_use: data.howToUse || [],
      suitable_for: data.suitableFor,
      related_service_slugs: data.relatedServiceSlugs || [],
      related_product_slugs: data.relatedProductSlugs || [],
      stock_quantity: data.stockQuantity ?? 10,
      low_stock_threshold: data.lowStockThreshold ?? 5,
      sku: data.sku || null,
      is_featured: data.isFeatured ?? false,
      status: data.status || 'active'
    }).select().single();
    if (error) throw new Error(error.message);
    return mapDbProduct(created);
  },

  async updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem> {
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

    const { data: updated, error } = await supabase.from('products').update(db).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapDbProduct(updated);
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
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