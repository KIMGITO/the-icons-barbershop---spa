import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  Archive,
  Eye,
  EyeOff,
  Star as StarIcon,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Boxes,
  TrendingUp,
  Layers,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus as PlusIcon,
  Sparkles
} from 'lucide-react';
import { ProductItem, ProductReview } from '../../../types';
import { useProductAdminStore } from '../../../stores/productAdminStore';
import { ImageUploader } from '../ui/ImageUploader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ThemeSelect } from '../../ui/ThemeSelect';

type ProductFormState = {
  name: string;
  slug: string;
  category: 'scalp-care' | 'beard-grooming' | 'hair-styling' | 'follicle-health' | 'kits';
  shortDescription: string;
  detailedDescription: string;
  priceKsh: number;
  originalPriceKsh: string;
  availability: 'in-stock' | 'low-stock' | 'out-of-stock';
  imageUrl: string;
  secondaryImages: string[];
  badge: string;
  rating: number;
  specifications: {
    volume: string;
    origin: string;
    scentProfile: string;
    keyIngredients: string;
    usageFrequency: string;
  };
  howToUse: string;
  suitableFor: string;
  relatedServiceSlugs: string;
  relatedProductSlugs: string;
  stockQuantity: number;
  lowStockThreshold: number;
  sku: string;
  isFeatured: boolean;
  status: 'active' | 'draft' | 'archived';
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  slug: '',
  category: 'scalp-care',
  shortDescription: '',
  detailedDescription: '',
  priceKsh: 0,
  originalPriceKsh: '',
  availability: 'in-stock',
  imageUrl: '',
  secondaryImages: [],
  badge: '',
  rating: 5,
  specifications: {
    volume: '',
    origin: '',
    scentProfile: '',
    keyIngredients: '',
    usageFrequency: ''
  },
  howToUse: '',
  suitableFor: '',
  relatedServiceSlugs: '',
  relatedProductSlugs: '',
  stockQuantity: 10,
  lowStockThreshold: 5,
  sku: '',
  isFeatured: false,
  status: 'active'
};

const CATEGORY_LABELS: Record<string, string> = {
  'scalp-care': 'Scalp Care',
  'beard-grooming': 'Beard Grooming',
  'hair-styling': 'Hair Styling',
  'follicle-health': 'Follicle Health',
  'kits': 'Gift Sets & Kits'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived'
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived'
};

const productToForm = (p: ProductItem): ProductFormState => ({
  name: p.name,
  slug: p.slug,
  category: p.category,
  shortDescription: p.shortDescription || '',
  detailedDescription: p.detailedDescription || '',
  priceKsh: p.priceKsh,
  originalPriceKsh: p.originalPriceKsh ? String(p.originalPriceKsh) : '',
  availability: p.availability,
  imageUrl: p.imageUrl || '',
  secondaryImages: p.secondaryImages || [],
  badge: p.badge || '',
  rating: p.rating,
  specifications: {
    volume: p.specifications?.volume || '',
    origin: p.specifications?.origin || '',
    scentProfile: p.specifications?.scentProfile || '',
    keyIngredients: (p.specifications?.keyIngredients || []).join(', '),
    usageFrequency: p.specifications?.usageFrequency || ''
  },
  howToUse: (p.howToUse || []).join('\n'),
  suitableFor: p.suitableFor || '',
  relatedServiceSlugs: (p.relatedServiceSlugs || []).join(', '),
  relatedProductSlugs: (p.relatedProductSlugs || []).join(', '),
  stockQuantity: p.stockQuantity ?? 10,
  lowStockThreshold: p.lowStockThreshold ?? 5,
  sku: p.sku || '',
  isFeatured: p.isFeatured || false,
  status: p.status || 'active'
});

const formToProductData = (form: ProductFormState): Omit<ProductItem, 'id'> => ({
  slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name: form.name,
  category: form.category,
  shortDescription: form.shortDescription,
  detailedDescription: form.detailedDescription,
  priceKsh: Number(form.priceKsh) || 0,
  originalPriceKsh: form.originalPriceKsh ? Number(form.originalPriceKsh) : undefined,
  availability: form.availability,
  imageUrl: form.imageUrl,
  secondaryImages: form.secondaryImages,
  badge: form.badge || undefined,
  rating: Number(form.rating) || 5,
  reviewCount: 0,
  specifications: {
    volume: form.specifications.volume,
    origin: form.specifications.origin,
    scentProfile: form.specifications.scentProfile,
    keyIngredients: form.specifications.keyIngredients.split(',').map(s => s.trim()).filter(Boolean),
    usageFrequency: form.specifications.usageFrequency
  },
  howToUse: form.howToUse.split('\n').map(s => s.trim()).filter(Boolean),
  suitableFor: form.suitableFor,
  relatedServiceSlugs: form.relatedServiceSlugs.split(',').map(s => s.trim()).filter(Boolean),
  relatedProductSlugs: form.relatedProductSlugs.split(',').map(s => s.trim()).filter(Boolean),
  stockQuantity: Number(form.stockQuantity) || 0,
  lowStockThreshold: Number(form.lowStockThreshold) || 5,
  sku: form.sku || undefined,
  isFeatured: form.isFeatured,
  status: form.status
});

export const ProductsManagementPage: React.FC = () => {
  const {
    products,
    reviews,
    loading,
    error,
    loadProducts,
    loadReviews,
    createProduct,
    updateProduct,
    deleteProduct,
    setProductStatus,
    adjustStock,
    setReviewStatus,
    deleteReview
  } = useProductAdminStore();

  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState('all');

  useEffect(() => {
    loadProducts();
    loadReviews();
  }, [loadProducts, loadReviews]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, searchQuery]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (reviewFilter === 'all') return true;
      return r.reviewStatus === reviewFilter;
    });
  }, [reviews, reviewFilter]);

  const pendingReviewCount = reviews.filter(r => r.reviewStatus === 'pending').length;
  const lowStockCount = products.filter(p => p.availability === 'low-stock' || p.availability === 'out-of-stock').length;
  const activeCount = products.filter(p => p.status === 'active').length;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setForm(productToForm(p));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!form.priceKsh || form.priceKsh <= 0) {
      setFormError('Please provide a valid price (KSh).');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct(editingProduct.id, formToProductData(form));
      } else {
        await createProduct(formToProductData(form));
      }
      setIsSubmitting(false);
      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to save product.');
    }
  };

  const handleDeleteProduct = async (p: ProductItem) => {
    if (!window.confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.id);
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const handleToggleStatus = async (p: ProductItem) => {
    const next = p.status === 'active' ? 'archived' : 'active';
    try {
      await setProductStatus(p.id, next);
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleAdjustStock = async (p: ProductItem, delta: number) => {
    try {
      await adjustStock(p.id, delta);
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock.');
    }
  };

  const handleReviewAction = async (review: ProductReview, status: 'approved' | 'rejected' | 'archived') => {
    try {
      await setReviewStatus(review.id, status);
      await loadReviews();
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to update review.');
    }
  };

  const handleDeleteReview = async (review: ProductReview) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteReview(review.id);
      await loadReviews();
      await loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review.');
    }
  };

  const getProductName = (productId?: string) => {
    if (!productId) return 'Unknown Product';
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center text-primary">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-current' : 'opacity-30'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            Product Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage the apothecary catalog, stock levels, and customer review approvals
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="text-xs font-bold"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Package className="w-3 h-3 text-primary" /> Total Products
          </span>
          <div className="text-xl font-mono font-extrabold text-foreground">{products.length}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" /> Active
          </span>
          <div className="text-xl font-mono font-extrabold text-success">{activeCount}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" /> Low / Out of Stock
          </span>
          <div className="text-xl font-mono font-extrabold text-warning">{lowStockCount}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-primary" /> Pending Reviews
          </span>
          <div className="text-xl font-mono font-extrabold text-primary">{pendingReviewCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all ${
            activeTab === 'products'
              ? 'bg-primary text-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'bg-primary text-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Review Approvals
          {pendingReviewCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              activeTab === 'reviews' ? 'bg-black/20 text-black' : 'bg-primary text-black'
            }`}>
              {pendingReviewCount}
            </span>
          )}
        </button>
      </div>

      {/* ============ PRODUCTS TAB ============ */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU, or slug..."
              className="rounded-lg py-1.5 text-xs"
              icon={<Search className="w-3.5 h-3.5" />}
            />

            <ThemeSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </ThemeSelect>

            <ThemeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </ThemeSelect>
          </div>

          {/* Loading state */}
          {loading && products.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading products from database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border">
              <p className="text-xs text-muted-foreground mb-3">No products found matching your filters.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map(product => {
                const isExpanded = expandedProductId === product.id;
                const isLowStock = product.availability === 'low-stock' || product.availability === 'out-of-stock';

                return (
                  <div
                    key={product.id}
                    className="bg-card border border-border hover:border-primary/30 rounded-2xl overflow-hidden transition-all"
                  >
                    {/* Product Row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-xl bg-product-surface border border-border p-1.5 flex items-center justify-center shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                          {product.badge && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider rounded border border-primary/30">
                              {product.badge}
                            </span>
                          )}
                          {product.isFeatured && (
                            <span className="px-1.5 py-0.5 bg-gold/10 text-gold text-[9px] font-bold uppercase tracking-wider rounded border border-gold/30">
                              ★ Featured
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          <span className="font-mono text-primary">{product.sku || 'No SKU'}</span>
                          <span>•</span>
                          <span className="capitalize">{CATEGORY_LABELS[product.category] || product.category}</span>
                          <span>•</span>
                          <span className="font-mono">KSh {product.priceKsh.toLocaleString()}</span>
                          {product.originalPriceKsh && (
                            <span className="line-through opacity-60">KSh {product.originalPriceKsh.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(product.rating)}
                          <span className="text-[10px] text-muted-foreground">
                            {product.rating} ({product.reviewCount} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Stock & Status */}
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product, -1)}
                            className="p-1 rounded-md bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Decrease stock"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            product.availability === 'out-of-stock'
                              ? 'bg-destructive/10 text-destructive'
                              : product.availability === 'low-stock'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                          }`}>
                            {product.stockQuantity ?? 0} in stock
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product, 1)}
                            className="p-1 rounded-md bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Increase stock"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>

                        <Badge
                          variant={product.status === 'active' ? 'success' : product.status === 'draft' ? 'warning' : 'neutral'}
                          className="text-[10px] uppercase font-bold"
                        >
                          {STATUS_LABELS[product.status || 'active']}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(product)}
                          className="text-xs py-1 h-auto"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          <span>Edit</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                          title={product.status === 'active' ? 'Archive product' : 'Activate product'}
                        >
                          {product.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete product permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-border/60 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Slug</span>
                            <span className="text-foreground font-mono">/{product.slug}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Volume</span>
                            <span className="text-foreground">{product.specifications?.volume || '—'}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Origin</span>
                            <span className="text-foreground">{product.specifications?.origin || '—'}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Low Stock Threshold</span>
                            <span className="text-foreground font-mono">{product.lowStockThreshold ?? 5}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Suitable For</span>
                            <span className="text-foreground line-clamp-1">{product.suitableFor || '—'}</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Related Services</span>
                            <span className="text-foreground font-mono">{product.relatedServiceSlugs?.join(', ') || '—'}</span>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {product.shortDescription}
                        </p>

                        {isLowStock && (
                          <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-lg text-[11px] text-warning flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {product.availability === 'out-of-stock'
                                ? 'This product is out of stock and hidden from purchase.'
                                : `Low stock alert: only ${product.stockQuantity} units remaining (threshold: ${product.lowStockThreshold}).`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ REVIEWS TAB ============ */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {/* Review Filter */}
          <div className="bg-card p-3.5 rounded-xl border border-border flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
            <ThemeSelect
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="w-full sm:w-64 bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Reviews ({reviews.length})</option>
              <option value="pending">Pending Approval ({reviews.filter(r => r.reviewStatus === 'pending').length})</option>
              <option value="approved">Approved ({reviews.filter(r => r.reviewStatus === 'approved').length})</option>
              <option value="rejected">Rejected ({reviews.filter(r => r.reviewStatus === 'rejected').length})</option>
              <option value="archived">Archived ({reviews.filter(r => r.reviewStatus === 'archived').length})</option>
            </ThemeSelect>
          </div>

          {loading && reviews.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">No reviews found in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div
                  key={review.id}
                  className="bg-card border border-border rounded-2xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{review.authorName}</span>
                        <Badge
                          variant={review.reviewStatus === 'approved' ? 'success' : review.reviewStatus === 'pending' ? 'warning' : 'neutral'}
                          className="text-[9px] uppercase font-bold"
                        >
                          {REVIEW_STATUS_LABELS[review.reviewStatus || 'pending']}
                        </Badge>
                        {review.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-success">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-[10px] text-muted-foreground">{review.date}</span>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed">
                        "{review.comment}"
                      </p>

                      <div className="text-[10px] text-muted-foreground">
                        Product: <span className="text-primary font-semibold">{getProductName(review.productId)}</span>
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {review.reviewStatus !== 'approved' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewAction(review, 'approved')}
                          className="text-xs py-1 h-auto text-success border-success/40 hover:bg-success/10"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          <span>Approve</span>
                        </Button>
                      )}
                      {review.reviewStatus !== 'rejected' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewAction(review, 'rejected')}
                          className="text-xs py-1 h-auto text-destructive border-destructive/40 hover:bg-destructive/10"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          <span>Reject</span>
                        </Button>
                      )}
                      {review.reviewStatus !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => handleReviewAction(review, 'archived')}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-warning transition-colors"
                          title="Archive review"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete review permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ ADD / EDIT PRODUCT MODAL ============ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Product Name *
                  </label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Organic Moroccan Argan Beard Oil"
                    className="rounded-xl py-2 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Slug (URL)
                  </label>
                  <Input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated from name"
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category *
                  </label>
                  <ThemeSelect
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </ThemeSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Price (KSh) *
                  </label>
                  <Input
                    type="number"
                    value={form.priceKsh}
                    onChange={(e) => setForm({ ...form, priceKsh: Number(e.target.value) })}
                    min={0}
                    step={50}
                    className="rounded-xl py-2 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Original Price (KSh)
                  </label>
                  <Input
                    type="number"
                    value={form.originalPriceKsh}
                    onChange={(e) => setForm({ ...form, originalPriceKsh: e.target.value })}
                    min={0}
                    step={50}
                    placeholder="Optional (for sale display)"
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Availability
                  </label>
                  <ThemeSelect
                    value={form.availability}
                    onChange={(e) => setForm({ ...form, availability: e.target.value as any })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </ThemeSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Stock Quantity
                  </label>
                  <Input
                    type="number"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                    min={0}
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                    min={0}
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SKU
                  </label>
                  <Input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. ICN-PRD-009"
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Badge
                  </label>
                  <Input
                    type="text"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. BESTSELLER, ORGANIC"
                    className="rounded-xl py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rating (1-5)
                  </label>
                  <Input
                    type="number"
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    min={1}
                    max={5}
                    step={0.1}
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Short Description
                </label>
                <Input
                  multiline
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  rows={2}
                  placeholder="Concise product summary shown on cards..."
                  className="rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Detailed Description
                </label>
                <Input
                  multiline
                  value={form.detailedDescription}
                  onChange={(e) => setForm({ ...form, detailedDescription: e.target.value })}
                  rows={3}
                  placeholder="Full clinical / formulation description..."
                  className="rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Volume / Size
                  </label>
                  <Input
                    type="text"
                    value={form.specifications.volume}
                    onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, volume: e.target.value } })}
                    placeholder="e.g. 50 ml / 1.7 fl oz"
                    className="rounded-xl py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Origin
                  </label>
                  <Input
                    type="text"
                    value={form.specifications.origin}
                    onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, origin: e.target.value } })}
                    placeholder="e.g. Formulated in London"
                    className="rounded-xl py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Scent Profile
                  </label>
                  <Input
                    type="text"
                    value={form.specifications.scentProfile}
                    onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, scentProfile: e.target.value } })}
                    placeholder="e.g. Sandalwood, Amber & Cedar"
                    className="rounded-xl py-2 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Usage Frequency
                  </label>
                  <Input
                    type="text"
                    value={form.specifications.usageFrequency}
                    onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, usageFrequency: e.target.value } })}
                    placeholder="e.g. Daily every morning"
                    className="rounded-xl py-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Key Ingredients (comma-separated)
                </label>
                <Input
                  type="text"
                  value={form.specifications.keyIngredients}
                  onChange={(e) => setForm({ ...form, specifications: { ...form.specifications, keyIngredients: e.target.value } })}
                  placeholder="e.g. Argan Oil, Jojoba, Vitamin E"
                  className="rounded-xl py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  How To Use (one step per line)
                </label>
                <Input
                  multiline
                  value={form.howToUse}
                  onChange={(e) => setForm({ ...form, howToUse: e.target.value })}
                  rows={3}
                  placeholder={'Step 1: Dispense 4-6 drops...\nStep 2: Rub between palms...'}
                  className="rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Suitable For
                </label>
                <Input
                  type="text"
                  value={form.suitableFor}
                  onChange={(e) => setForm({ ...form, suitableFor: e.target.value })}
                  placeholder="e.g. All beard lengths, coarse textures"
                  className="rounded-xl py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Related Service Slugs (comma-separated)
                  </label>
                  <Input
                    type="text"
                    value={form.relatedServiceSlugs}
                    onChange={(e) => setForm({ ...form, relatedServiceSlugs: e.target.value })}
                    placeholder="e.g. beard-grooming, the-ceo-experience"
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Related Product Slugs (comma-separated)
                  </label>
                  <Input
                    type="text"
                    value={form.relatedProductSlugs}
                    onChange={(e) => setForm({ ...form, relatedProductSlugs: e.target.value })}
                    placeholder="e.g. botanical-beard-balm, antibacterial-shampoo"
                    className="rounded-xl py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Image Uploader */}
              <ImageUploader
                currentImageUrl={form.imageUrl}
                onImageUploaded={(url) => setForm({ ...form, imageUrl: url })}
                onImageRemoved={() => setForm({ ...form, imageUrl: '' })}
                bucket="products"
                aspectRatio="square"
                label="Product Main Image"
                helperText="Square format display image. JPG, PNG, or WEBP. Max 5MB."
              />

              {/* Status & Featured */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Publish Status
                  </label>
                  <ThemeSelect
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="active">Active (Visible on website)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived (Hidden)</option>
                  </ThemeSelect>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Featured on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};