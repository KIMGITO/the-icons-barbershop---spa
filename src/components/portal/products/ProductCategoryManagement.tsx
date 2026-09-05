import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Edit, Trash2, CheckCircle2, 
  Search, AlertTriangle, Save, X, Tag
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { useUIStore } from '../../../stores/uiStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ThemeSelect } from '../../ui/ThemeSelect';

interface ProductCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export const ProductCategoryManagement: React.FC = () => {
  const { addToast } = useUIStore();
  const { productCategories } = useApp();
  const [categories, setCategories] = useState<ProductCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const loadCategories = async () => {
    try {
      setLoading(true);
      // Re-using adminListProductCategories if it exists, or just get from supabase
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Failed to load product categories:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load product categories'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ProductCategoryRow) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    const generatedSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    try {
      setIsSubmitting(true);
      if (editingCategory) {
        const { error: updateError } = await supabase
          .from('product_categories')
          .update({
            name: name.trim(),
            slug: generatedSlug,
            description: description.trim(),
            sort_order: sortOrder,
            is_active: isActive
          })
          .eq('id', editingCategory.id);
        
        if (updateError) throw updateError;
        addToast({ type: 'success', title: 'Success', message: 'Category updated' });
      } else {
        const { error: insertError } = await supabase
          .from('product_categories')
          .insert({
            name: name.trim(),
            slug: generatedSlug,
            description: description.trim(),
            sort_order: sortOrder,
            is_active: isActive
          });
        
        if (insertError) throw insertError;
        addToast({ type: 'success', title: 'Success', message: 'Category created' });
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product category? Products in this category might become un-categorized.')) return;
    try {
      const { error: deleteError } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      addToast({ type: 'success', title: 'Success', message: 'Category deleted' });
      loadCategories();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Filter product categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-2"
            icon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground">
            <Tag className="w-8 h-8 mb-2 opacity-20 animate-pulse" />
            <p className="text-xs">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-card border border-border rounded-2xl text-muted-foreground">
            <Tag className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No categories found.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div 
              key={cat.id} 
              className="bg-card border border-border hover:border-primary/40 rounded-xl p-3 flex flex-col justify-between space-y-3 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cat.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">{cat.name}</h4>
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">#{cat.sort_order}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">/{cat.slug}</p>
                  </div>
                </div>
                <Badge variant={cat.is_active ? 'success' : 'neutral'} className="text-[8px] px-1 py-0 h-4">
                  {cat.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {cat.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              )}

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Edit Category"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                {editingCategory ? 'Edit Product Category' : 'Add New Product Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-[11px] text-destructive flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Skin Care"
                  className="text-xs py-2"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL Slug (optional)</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. skin-care"
                  className="text-xs py-2 font-mono"
                />
                <p className="text-[9px] text-muted-foreground">Leave blank to auto-generate from name</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <Input
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of products in this category"
                  className="text-xs p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort Order</label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value))}
                    className="text-xs py-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <ThemeSelect
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </ThemeSelect>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
