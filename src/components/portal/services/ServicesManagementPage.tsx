import React, { useState, useMemo } from 'react';
import { 
  Scissors, Search, Plus, Clock, Edit, Trash2, CheckCircle2, 
  User, Image as ImageIcon, Sparkles 
} from 'lucide-react';
import { ServiceItem } from '../../../types';
import { useServiceStore } from '../../../stores/serviceStore';
import { useProviderStore } from '../../../stores/providerStore';
import { ImageUploader } from '../ui/ImageUploader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ThemeSelect } from '../../ui/ThemeSelect';
import { useApp } from '@/context/AppContext';

export const ServicesManagementPage: React.FC = () => {
  const { 
    services, 
    loadServices, 
    addService, 
    updateService, 
    deleteService, 
    serviceProvidersMap 
  } = useServiceStore();
  const { providers, loadProviders } = useProviderStore();
  const { serviceCategories } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('haircuts');
  const [priceKsh, setPriceKsh] = useState<number>(1500);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    loadServices();
    loadProviders();
  }, [loadServices, loadProviders]);

  const categories = useMemo(() => {
    if (serviceCategories && serviceCategories.length > 0) {
      return ['all', ...serviceCategories.map(c => c.slug)];
    }
    // Only use distinct categories that actually have services if no manual categories defined
    const cats = Array.from(new Set(services.map(s => s.category))).filter(Boolean);
    return ['all', ...cats];
  }, [services, serviceCategories]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [services, categoryFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    const firstCat = serviceCategories && serviceCategories.length > 0 ? serviceCategories[0].slug : 'haircuts';
    setCategory(firstCat);
    setPriceKsh(1500);
    setDurationMinutes(45);
    setDescription('');
    setImageUrl('');
    setStatus('active');
    setSelectedProviderIds(providers.map(p => p.id));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingService(s);
    setName(s.name);
    setCategory(s.category as any);
    setPriceKsh(s.priceKsh);
    setDurationMinutes(s.durationMinutes);
    setDescription(s.description || s.shortDescription || s.fullDescription || '');
    setImageUrl(s.imageUrl || '');
    setStatus(s.status === 'inactive' ? 'inactive' : 'active');
    setSelectedProviderIds(serviceProvidersMap[s.id] || []);
    setIsModalOpen(true);
  };

  const toggleProvider = (id: string) => {
    if (selectedProviderIds.includes(id)) {
      setSelectedProviderIds(selectedProviderIds.filter(pid => pid !== id));
    } else {
      setSelectedProviderIds([...selectedProviderIds, id]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide service title.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingService) {
        await updateService(
          editingService.id,
          {
            name: name.trim(),
            category,
            priceKsh: Number(priceKsh),
            durationMinutes: Number(durationMinutes),
            shortDescription: description.trim() || editingService.shortDescription,
            fullDescription: description.trim() || editingService.fullDescription,
            description: description.trim(),
            imageUrl,
            status
          },
          selectedProviderIds
        );
      } else {
        await addService(
          {
            name: name.trim(),
            slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            category,
            priceKsh: Number(priceKsh),
            durationMinutes: Number(durationMinutes),
            shortDescription: description.trim() || name.trim(),
            fullDescription: description.trim() || name.trim(),
            description: description.trim(),
            features: ['Professional consultation', 'Sterilized equipment', 'Premium grooming products'],
            imageUrl,
            status
          },
          selectedProviderIds
        );
      }
      setIsSubmitting(false);
      setIsModalOpen(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save service.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            Service Menu & Pricing
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage services, price schedules, chair duration, and artisan allocations
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
          <span>Add New Service</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services by title or description..."
          className="rounded-lg py-1.5 text-xs"
          icon={<Search className="w-3.5 h-3.5" />}
        />

        <div className="flex items-center gap-2">
          <ThemeSelect
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
          >
            {categories.map(c => (
              <option key={c} value={c} >
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </ThemeSelect>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => {
          const assignedIds = serviceProvidersMap[service.id] || [];
          const assignedProviderNames = assignedIds
            .map(id => providers.find(p => p.id === id)?.fullName)
            .filter(Boolean);

          return (
            <div
              key={service.id}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {service.category}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {service.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-primary">
                      KSh {service.priceKsh.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {service.durationMinutes} min
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {service.description}
                </p>

                {/* Assigned Providers */}
                <div className="pt-2 border-t border-border space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Providers Offering ({assignedProviderNames.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {assignedProviderNames.length > 0 ? (
                      assignedProviderNames.map((name, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-muted text-[10px] rounded text-foreground border border-border/80"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">
                        Available to all active providers
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <Badge variant={service.status === 'active' ? 'success' : 'neutral'}>
                  {service.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(service)}
                    className="text-xs py-1 h-auto"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    <span>Edit</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => deleteService(service.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingService ? `Edit Service: ${editingService.name}` : 'Add New Service'}
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
                  Service Title *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Hot Towel Beard Sculpting"
                  className="rounded-xl py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category *
                  </label>
                  <ThemeSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary capitalize"
                  >
                    {serviceCategories && serviceCategories.length > 0 ? (
                      serviceCategories.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="haircuts">Haircuts</option>
                        <option value="beard">Beard</option>
                        <option value="shave">Shave</option>
                        <option value="spa">Spa</option>
                        <option value="packages">Packages</option>
                        <option value="vip">VIP</option>
                      </>
                    )}
                  </ThemeSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Price (KSh) *
                  </label>
                  <Input
                    type="number"
                    value={priceKsh}
                    onChange={(e) => setPriceKsh(Number(e.target.value))}
                    min={100}
                    step={50}
                    className="rounded-xl py-2 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Duration (Minutes) *
                  </label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={10}
                    step={5}
                    className="rounded-xl py-2 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Input
                  multiline
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Detail what ritual products, techniques, and client care this includes..."
                  className="rounded-xl p-2.5 text-xs"
                />
              </div>

              {/* Image Uploader */}
              <ImageUploader
                currentImageUrl={imageUrl}
                onImageUploaded={(url) => setImageUrl(url)}
                onImageRemoved={() => setImageUrl('')}
                bucket="services"
                aspectRatio="wide"
                label="Service Photo"
                helperText="Wide format display image"
              />

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Assign Providers Qualified for this Service ({selectedProviderIds.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-muted/20 rounded-xl border border-border">
                  {providers.map(p => {
                    const isSelected = selectedProviderIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProvider(p.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs text-left border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground font-semibold'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">{p.fullName}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Publish Status
                </label>
                <ThemeSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="active">Active (Available for customer booking)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </ThemeSelect>
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
                  {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
