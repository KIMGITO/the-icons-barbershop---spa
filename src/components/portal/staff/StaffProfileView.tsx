import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Scissors, Star, Save, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useProviderStore } from '../../../stores/providerStore';
import { useServiceStore } from '../../../stores/serviceStore';
import { useUIStore } from '../../../stores/uiStore';
import { ImageUploader } from '../ui/ImageUploader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { PROVIDER_TYPE_LABELS } from '../../../types/staff';

export const StaffProfileView: React.FC = () => {
  const { user } = useAuthStore();
  const { providers, loadProviders, updateProvider } = useProviderStore();
  const { services, loadServices } = useServiceStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    loadProviders();
    loadServices();
  }, [loadProviders, loadServices]);

  const currentProvider = providers.find(p => p.id === user?.providerId) || providers[0];

  const [phone, setPhone] = useState('+254 ');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentProvider) {
      setPhone(currentProvider.phone || '');
      setBio(currentProvider.bio || '');
      setInstagram(currentProvider.instagramHandle || '');
      setAvatarUrl(currentProvider.avatarUrl || '');
    }
  }, [currentProvider]);

  if (!currentProvider) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading artisan profile...</div>;
  }

  const assignedServices = (currentProvider.servicesOfferedIds || [])
    .map(id => services.find(s => s.id === id))
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProvider(currentProvider.id, {
        phone,
        bio,
        instagramHandle: instagram,
        avatarUrl
      });
      setIsSaving(false);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal artisan profile has been saved successfully.'
      });
    } catch (err: any) {
      setIsSaving(false);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update profile.'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">{PROVIDER_TYPE_LABELS[currentProvider.providerType] || currentProvider.providerType}</Badge>
            {currentProvider.rating && (
              <span className="text-xs text-primary font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {currentProvider.rating.toFixed(2)} Rating
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">
            {currentProvider.fullName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Artisan Station • {currentProvider.email}
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSaving}
          className="text-xs font-bold"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start bg-card p-5 rounded-2xl border border-border">
        <div className="sm:col-span-1">
          <ImageUploader
            currentImageUrl={avatarUrl}
            onImageUploaded={(url) => setAvatarUrl(url)}
            onImageRemoved={() => setAvatarUrl('')}
            bucket="avatars"
            aspectRatio="square"
            label="Artisan Profile Photo"
            helperText="Square portrait"
          />
        </div>

        <div className="sm:col-span-2 space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Contact Phone
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl py-2 text-xs font-mono"
              icon={<Phone className="w-3.5 h-3.5" />}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Instagram Handle (Optional)
            </label>
            <Input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourhandle"
              className="rounded-xl py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Personal Artisan Biography
            </label>
            <Input
              multiline
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Describe your craft, scissor techniques, hot towel rituals, and background..."
              className="rounded-xl p-2.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Services Assigned by Management */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-primary" />
            Your Assigned Services
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Managed by Studio Executive
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {assignedServices.map((s: any) => (
            <div
              key={s.id}
              className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-foreground block">{s.name}</span>
                <span className="text-[10px] text-muted-foreground">{s.durationMinutes} min • KSh {s.priceKsh.toLocaleString()}</span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
