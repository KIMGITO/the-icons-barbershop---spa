import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Scissors, Calendar, CheckCircle2 } from 'lucide-react';
import { 
  ServiceProvider, ServiceProviderType, DaySchedule, 
  PROVIDER_TYPE_LABELS 
} from '../../../types/staff';
import { useProviderStore } from '../../../stores/providerStore';
import { useServiceStore } from '../../../stores/serviceStore';
import { ImageUploader } from '../ui/ImageUploader';
import { ProviderSchedule } from './ProviderSchedule';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ThemeSelect } from '../../ui/ThemeSelect';

interface ProviderEditModalProps {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProviderEditModal: React.FC<ProviderEditModalProps> = ({
  provider,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const { addProvider, updateProvider } = useProviderStore();
  const { services, loadServices } = useServiceStore();

  const isCreating = !provider;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254 ');
  const [providerType, setProviderType] = useState<ServiceProviderType>('barber');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (provider) {
      setFirstName(provider.firstName);
      setLastName(provider.lastName);
      setEmail(provider.email);
      setPhone(provider.phone);
      setProviderType(provider.providerType);
      setBio(provider.bio || '');
      setAvatarUrl(provider.avatarUrl || '');
      setStatus(provider.status);
      setSelectedServices(provider.servicesOfferedIds || []);
      setSchedule(provider.schedule || []);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('+254 ');
      setProviderType('barber');
      setBio('');
      setAvatarUrl('');
      setStatus('active');
      setSelectedServices([]);
      setSchedule([]);
    }
  }, [provider]);

  const toggleServiceSelection = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide first and last name.');
      return;
    }

    if (!email.trim()) {
      setError('Please provide staff email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      if (isCreating) {
        await addProvider({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          providerType,
          bio: bio.trim(),
          avatarUrl,
          status,
          servicesOfferedIds: selectedServices,
          schedule
        });
      } else if (provider) {
        await updateProvider(provider.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          providerType,
          bio: bio.trim(),
          avatarUrl,
          status,
          servicesOfferedIds: selectedServices,
          schedule
        });
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save provider profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {isCreating ? 'Add New Service Provider' : `Edit Profile: ${provider?.fullName}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure specialty role, services offered, and weekly availability schedule
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Photo and Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-1">
              <ImageUploader
                currentImageUrl={avatarUrl}
                onImageUploaded={(url) => setAvatarUrl(url)}
                onImageRemoved={() => setAvatarUrl('')}
                bucket="avatars"
                aspectRatio="square"
                label="Artisan Avatar"
                helperText="Square portrait photo"
              />
            </div>

            <div className="sm:col-span-2 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Samuel"
                    className="rounded-xl py-2 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Mwangi"
                    className="rounded-xl py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Provider Specialty *
                  </label>
                  <ThemeSelect
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value as ServiceProviderType)}
                    className="w-full"
                    searchable
                    searchPlaceholder="Search specialty..."
                  >
                    {Object.entries(PROVIDER_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </ThemeSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Status *
                  </label>
                  <ThemeSelect
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full"
                  >
                    <option value="active">Active (Available for booking)</option>
                    <option value="inactive">Inactive (On Leave / Suspended)</option>
                  </ThemeSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@theicons.co.ke"
                    className="rounded-xl py-2 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Phone Contact *
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="rounded-xl py-2 text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Professional Biography & Specialty Notes
            </label>
            <Input
              multiline
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="e.g. Master barber specializing in scissor work, beard sculpture, and executive hair restorations."
              className="rounded-xl p-2.5 text-xs"
            />
          </div>

          {/* Services Offered Assignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Services Offered ({selectedServices.length} Selected)
              </label>
              <span className="text-[11px] text-primary font-medium">
                Click to assign services this provider can perform
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-muted/20 rounded-xl border border-border">
              {services.map(s => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleServiceSelection(s.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs text-left border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="truncate">
                      <span>{s.name}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {s.durationMinutes} min • KSh {s.priceKsh.toLocaleString()}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly Working Schedule */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Weekly Working Schedule & Breaks
            </label>
            <ProviderSchedule
              schedule={schedule}
              onChange={(newSched) => setSchedule(newSched)}
              editable={true}
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Profile...' : isCreating ? 'Add Provider' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
