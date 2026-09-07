import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { ProductReview, ServiceReview } from '../../../types';
import { useProductAdminStore } from '../../../stores/productAdminStore';
import { useApp } from '../../../context/AppContext';
import { Badge, Button, Input } from '../../ui';

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived'
};

export const ReviewManagementPage: React.FC = () => {
  const { services } = useApp();
  const {
    reviews,
    serviceReviews,
    loading,
    loadReviews,
    setReviewStatus,
    deleteReview,
    setServiceReviewStatus,
    deleteServiceReview
  } = useProductAdminStore();

  const [reviewFilter, setReviewFilter] = useState('all');
  const [reviewType, setReviewType] = useState<'product' | 'service'>('service');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const getServiceName = (serviceId?: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );

  const filteredReviews = useMemo(() => {
    const base = reviewType === 'product' ? reviews : serviceReviews;
    return base.filter(r => {
      const matchesStatus = reviewFilter === 'all' || r.reviewStatus === reviewFilter;
      const matchesSearch = r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           r.comment.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [reviewType, reviews, serviceReviews, reviewFilter, searchQuery]);

  const handleReviewAction = async (review: any, status: 'approved' | 'rejected' | 'archived') => {
    try {
      if (reviewType === 'product') {
        await setReviewStatus(review.id, status);
      } else {
        await setServiceReviewStatus(review.id, status);
      }
      await loadReviews();
    } catch (err) {
      console.error('Failed to update review status:', err);
    }
  };

  const handleDeleteReview = async (review: any) => {
    if (!window.confirm('Are you sure you want to delete this review permanently?')) return;
    try {
      if (reviewType === 'product') {
        await deleteReview(review.id);
      } else {
        await deleteServiceReview(review.id);
      }
      await loadReviews();
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Review Moderation
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage and approve customer testimonials and product reviews.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadReviews()}
          disabled={loading}
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-card border border-border p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-background border border-border p-1 w-fit">
            <button
              onClick={() => setReviewType('service')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                reviewType === 'service' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Service Reviews
            </button>
            <button
              onClick={() => setReviewType('product')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                reviewType === 'product' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Product Reviews
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 py-1.5 text-xs rounded-none border-border focus:border-primary"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="bg-background border border-border text-[10px] font-bold uppercase px-2 py-1.5 focus:outline-none focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {loading && filteredReviews.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 border-2 border-dashed border-border">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">No reviews found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-background border border-border p-4 hover:border-primary/30 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-foreground">{review.authorName}</span>
                      <Badge
                        variant={review.reviewStatus === 'approved' ? 'success' : review.reviewStatus === 'pending' ? 'warning' : 'neutral'}
                        className="text-[9px] uppercase font-bold"
                      >
                        {REVIEW_STATUS_LABELS[review.reviewStatus || 'pending']}
                      </Badge>
                      {reviewType === 'service' && (review as ServiceReview).verifiedPurchase && (
                        <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {renderStars(review.rating)}
                      <span className="text-[10px] text-muted-foreground">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <p className="text-xs text-foreground italic leading-relaxed">
                      "{review.comment}"
                    </p>

                    <div className="text-[10px] text-muted-foreground pt-1">
                      {reviewType === 'service' ? (
                        <>Service: <span className="text-primary font-bold">{(review as ServiceReview).serviceId ? getServiceName((review as ServiceReview).serviceId) : 'N/A'}</span></>
                      ) : (
                        <>Product ID: <span className="text-primary font-bold">{(review as ProductReview).productId}</span></>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {review.reviewStatus !== 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewAction(review, 'approved')}
                        className="text-[10px] h-8 text-success border-success/30 hover:bg-success/10"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    )}
                    {review.reviewStatus !== 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewAction(review, 'rejected')}
                        className="text-[10px] h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    )}
                    <button
                      onClick={() => handleReviewAction(review, 'archived')}
                      className="p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
