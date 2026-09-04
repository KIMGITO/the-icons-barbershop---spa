import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, Plus, Search, Edit, Trash2, 
  ChevronUp, ChevronDown, Check, Eye, EyeOff,
  AlertTriangle, Filter
} from 'lucide-react';
import { FAQItem } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ThemeSelect } from '../../ui/ThemeSelect';

export const FAQManagementPage: React.FC = () => {
  const { faqs, addFAQ, updateFAQ, deleteFAQ, refreshData, isSupabaseConfigured } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  
  // Form states
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [order, setOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const categories = ['Appointments', 'Payments', 'Services', 'Barbers', 'Products', 'Policies', 'General'];

  const filteredFaqs = faqs.filter(f => {
    // Admins see all FAQs including inactive ones for management
    if (categoryFilter !== 'all' && f.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleOpenAdd = () => {
    setEditingFaq(null);
    setQuestion('');
    setAnswer('');
    setCategory('General');
    setOrder(faqs.length);
    setIsFeatured(false);
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: FAQItem) => {
    setEditingFaq(f);
    setQuestion(f.question);
    setAnswer(f.answer);
    setCategory(f.category);
    setOrder(f.order || 0);
    setIsFeatured(f.isFeaturedOnHome || false);
    setIsActive(f.isActive !== false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim() || !answer.trim()) {
      setError('Question and Answer are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingFaq) {
        await updateFAQ({
          ...editingFaq,
          question: question.trim(),
          answer: answer.trim(),
          category,
          order: Number(order),
          isFeaturedOnHome: isFeatured,
          isActive: isActive
        });
      } else {
        await addFAQ({
          question: question.trim(),
          answer: answer.trim(),
          category,
          order: Number(order),
          isFeaturedOnHome: isFeatured,
          isActive: isActive
        });
      }
      
      if (!isSupabaseConfigured) {
        refreshData();
      }
      
      setIsSubmitting(false);
      setIsModalOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save FAQ.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFAQ(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete FAQ.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            FAQ Management
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage frequently asked questions displayed on the public site
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
          <span>Add New FAQ</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search FAQs..."
          className="rounded-lg py-1.5 text-xs"
          icon={<Search className="w-3.5 h-3.5" />}
        />

        <ThemeSelect
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </ThemeSelect>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-xl border border-border">
            <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
            <p className="text-xs text-muted-foreground">No FAQs found matching your filters.</p>
          </div>
        ) : (
          filteredFaqs.map(faq => (
            <div
              key={faq.id}
              className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="text-[10px] uppercase">{faq.category}</Badge>
                    {faq.isFeaturedOnHome && (
                      <Badge variant="primary" className="text-[10px] uppercase">Home Featured</Badge>
                    )}
                    {faq.isActive === false ? (
                      <Badge variant="neutral" className="text-[10px] uppercase bg-red-950/30 text-red-400">Suspended</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] uppercase">Active</Badge>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">Order: {faq.order}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{faq.question}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(faq)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    title="Edit FAQ"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Question *
                </label>
                <Input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are your opening hours?"
                  className="rounded-xl py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Answer *
                </label>
                <Input
                  multiline
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder="Provide a clear, detailed answer..."
                  className="rounded-xl p-2.5 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category *
                  </label>
                  <ThemeSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </ThemeSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="rounded-xl py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded border-border"
                  />
                  <label htmlFor="isFeatured" className="text-xs text-foreground cursor-pointer">
                    Feature on Home Page FAQ Preview
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded border-border"
                  />
                  <label htmlFor="isActive" className="text-xs text-foreground cursor-pointer">
                    Published (Visible on Public FAQ)
                  </label>
                </div>
              </div>

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
                  {isSubmitting ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
