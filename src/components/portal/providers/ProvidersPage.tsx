import React, { useState, useMemo } from 'react';
import { 
  User, Search, Plus, Phone, Mail, Scissors, Calendar, 
  CheckCircle2, AlertCircle, Edit, Power, Star 
} from 'lucide-react';
import { 
  ServiceProvider, ServiceProviderType, 
  PROVIDER_TYPE_LABELS 
} from '../../../types/staff';
import { useProviderStore } from '../../../stores/providerStore';
import { useServiceStore } from '../../../stores/serviceStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { ProviderEditModal } from './ProviderEditModal';
import { ThemeSelect } from '../../ui/ThemeSelect';

export const ProvidersPage: React.FC = () => {
  const { providers, loadProviders, toggleStatus, deleteProvider } = useProviderStore();
  const { services, loadServices } = useServiceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ServiceProviderType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    loadProviders();
    loadServices();
  }, [loadProviders, loadServices]);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      if (typeFilter !== 'all' && p.providerType !== typeFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesEmail = p.email.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }
      return true;
    });
  }, [providers, typeFilter, statusFilter, searchQuery]);

  const handleEdit = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProvider(null);
    setIsModalOpen(true);
  };

  const getServiceName = (id: string) => {
    return services.find(s => s.id === id)?.name || id;
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            Service Providers
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage barbers, scalp specialists, facialists, and spa therapists
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleAddNew}
          className="text-xs font-bold"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>Add Service Provider</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-card p-3.5 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search provider by name..."
          className="rounded-lg py-1.5 text-xs"
          icon={<Search className="w-3.5 h-3.5" />}
        />

        <ThemeSelect
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all" >All Specialties</option>
          {Object.entries(PROVIDER_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key} >{label}</option>
          ))}
        </ThemeSelect>

        <ThemeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all" >All Statuses</option>
          <option value="active" >Active Only</option>
          <option value="inactive" >Inactive Only</option>
        </ThemeSelect>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map(provider => {
          const workingDaysCount = (provider.schedule || []).filter(s => s.isWorking).length;
          const assignedServices = (provider.servicesOfferedIds || []).map(id => getServiceName(id));

          return (
            <div
              key={provider.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                provider.status === 'active' 
                  ? 'bg-card border-border hover:border-primary/40' 
                  : 'bg-muted/20 border-border/60 opacity-75'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start gap-3.5">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border bg-muted">
                  {provider.avatarUrl ? (
                    <img
                      src={provider.avatarUrl}
                      alt={provider.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                      {provider.firstName.charAt(0)}
                    </div>
                  )}
                  <span className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-card ${
                    provider.status === 'active' ? 'bg-success' : 'bg-muted-foreground'
                  }`} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {provider.fullName}
                    </h3>
                    <Badge variant={provider.status === 'active' ? 'success' : 'neutral'}>
                      {provider.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {PROVIDER_TYPE_LABELS[provider.providerType] || provider.providerType}
                    </span>
                    {provider.rating && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span>{provider.rating.toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <a href={`tel:${provider.phone}`} className="flex items-center gap-1 hover:text-foreground">
                      <Phone className="w-3 h-3 text-primary" />
                      <span>{provider.phone}</span>
                    </a>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[140px]">{provider.email}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio Snippet */}
              {provider.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  "{provider.bio}"
                </p>
              )}

              {/* Services Offered Tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Assigned Services ({assignedServices.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assignedServices.slice(0, 4).map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-foreground border border-border"
                    >
                      {name}
                    </span>
                  ))}
                  {assignedServices.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground">
                      +{assignedServices.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule Info & Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{workingDaysCount} working days/week</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStatus(provider.id)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      provider.status === 'active'
                        ? 'border-border text-muted-foreground hover:text-warning'
                        : 'border-success/40 text-success hover:bg-success/10'
                    }`}
                    title={provider.status === 'active' ? 'Deactivate Provider' : 'Activate Provider'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                    className="text-xs py-1 h-auto"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    <span>Edit Profile & Schedule</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provider Edit Modal */}
      <ProviderEditModal
        isOpen={isModalOpen}
        provider={selectedProvider}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProvider(null);
        }}
      />
    </div>
  );
};
