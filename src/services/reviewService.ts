import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProductReview, ServiceReview } from '../types';

const mapDbProductReview = (row: any): ProductReview => ({
  id: row.id,
  authorName: row.author_name,
  rating: row.rating,
  date: row.date,
  comment: row.comment,
  verifiedPurchase: row.verified_purchase,
  reviewStatus: row.review_status || 'approved',
  productId: row.product_id
});

const mapDbServiceReview = (row: any): ServiceReview => ({
  id: row.id,
  serviceId: row.service_id,
  authorName: row.author_name,
  rating: row.rating,
  date: row.date,
  comment: row.comment,
  verifiedPurchase: row.verified_purchase,
  reviewStatus: row.review_status || 'approved'
});

export const reviewService = {
  /**
   * PUBLIC: Submit a product review (goes to pending for admin approval)
   */
  async submitProductReview(data: {
    productId: string;
    authorName: string;
    rating: number;
    comment: string;
    verifiedPurchase?: boolean;
  }): Promise<ProductReview> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const { data: created, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: data.productId,
        author_name: data.authorName,
        rating: data.rating,
        comment: data.comment,
        verified_purchase: data.verifiedPurchase ?? false,
        review_status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapDbProductReview(created);
  },

  /**
   * PUBLIC: Submit a service review (goes to pending for admin approval)
   */
  async submitServiceReview(data: {
    serviceId: string;
    authorName: string;
    rating: number;
    comment: string;
    verifiedPurchase?: boolean;
  }): Promise<ServiceReview> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured.');
    }

    const { data: created, error } = await supabase
      .from('service_reviews')
      .insert({
        service_id: data.serviceId,
        author_name: data.authorName,
        rating: data.rating,
        comment: data.comment,
        verified_purchase: data.verifiedPurchase ?? false,
        review_status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapDbServiceReview(created);
  },

  /**
   * PUBLIC: Fetch approved reviews for a product
   */
  async getProductReviews(productId: string): Promise<ProductReview[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('review_status', 'approved')
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbProductReview);
  },

  /**
   * PUBLIC: Fetch approved reviews for a service
   */
  async getServiceReviews(serviceId: string): Promise<ServiceReview[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('service_reviews')
      .select('*')
      .eq('service_id', serviceId)
      .eq('review_status', 'approved')
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbServiceReview);
  },

  /**
   * PUBLIC: Fetch homepage testimonials — approved reviews from both
   * services and products, biased toward service reviews (services first).
   */
  async getTestimonials(limit: number = 6): Promise<{
    serviceReviews: ServiceReview[];
    productReviews: ProductReview[];
    merged: (ServiceReview | ProductReview)[];
  }> {
    if (!isSupabaseConfigured) {
      return { serviceReviews: [], productReviews: [], merged: [] };
    }

    const [serviceRes, productRes] = await Promise.all([
      supabase
        .from('service_reviews')
        .select('*')
        .eq('review_status', 'approved')
        .order('rating', { ascending: false })
        .order('date', { ascending: false })
        .limit(limit),
      supabase
        .from('product_reviews')
        .select('*')
        .eq('review_status', 'approved')
        .order('rating', { ascending: false })
        .order('date', { ascending: false })
        .limit(limit)
    ]);

    const serviceReviews = (serviceRes.data || []).map(mapDbServiceReview);
    const productReviews = (productRes.data || []).map(mapDbProductReview);

    // Bias toward service reviews: take up to ~70% services, fill rest with products
    const serviceCount = Math.min(
      serviceReviews.length,
      Math.max(Math.ceil(limit * 0.7), Math.min(limit - productReviews.length, serviceReviews.length))
    );
    const productCount = Math.min(productReviews.length, limit - serviceCount);

    // Interleave: lead with service reviews, sprinkle product reviews
    const merged: (ServiceReview | ProductReview)[] = [];
    const svc = serviceReviews.slice(0, serviceCount);
    const prd = productReviews.slice(0, productCount);
    let pIdx = 0;
    for (let i = 0; i < svc.length; i++) {
      merged.push(svc[i]);
      // Insert a product review after every 2 service reviews
      if ((i + 1) % 2 === 0 && pIdx < prd.length) {
        merged.push(prd[pIdx++]);
      }
    }
    // Append remaining product reviews
    while (pIdx < prd.length && merged.length < limit) {
      merged.push(prd[pIdx++]);
    }

    return { serviceReviews, productReviews, merged: merged.slice(0, limit) };
  },

  /**
   * ADMIN: List all service reviews including pending
   */
  async adminListServiceReviews(): Promise<ServiceReview[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.rpc('admin_list_service_reviews');
    if (error) throw new Error(error.message);
    return (data || []).map(mapDbServiceReview);
  },

  /**
   * ADMIN: Approve / reject / archive a service review
   */
  async setServiceReviewStatus(reviewId: string, status: 'pending' | 'approved' | 'rejected' | 'archived'): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_set_service_review_status', {
      p_review_id: reviewId,
      p_status: status
    });
    if (error) throw new Error(error.message);
  },

  /**
   * ADMIN: Delete a service review permanently
   */
  async deleteServiceReview(reviewId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('admin_delete_service_review', { p_review_id: reviewId });
    if (error) throw new Error(error.message);
  }
};