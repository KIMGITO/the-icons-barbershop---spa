import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Scissors, Star, Save, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
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
  const { productCategories, serviceCategories } = useApp();
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

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (currentProvider) {
      setPhone(currentProvider.phone || '');
      setBio(currentProvider.bio || '');
      setInstagram(currentProvider.instagramHandle || '');
      setAvatarUrl(currentProvider.avatarUrl || '');
    }
  }, [currentProvider]);

  const assignedServices = (currentProvider?.servicesOfferedIds || [])
    .map(id => services.find(s => s.id === id))
    .filter(Boolean);

  const { changePassword } = useAuthStore();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Passwords do not match or are empty.'
      });
      return;
    }

    if (newPassword.length < 8) {
      addToast({
        type: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 8 characters long.'
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(newPassword);
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password has been changed successfully.'
      });
    } catch (err: any) {
      setIsChangingPassword(false);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to change password.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProvider) return;
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
        message: 'Your profile has been saved successfully.'
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
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            {currentProvider ? (
              <Badge variant="primary">{PROVIDER_TYPE_LABELS[currentProvider.providerType] || currentProvider.providerType}</Badge>
            ) : (
              <Badge variant="secondary">Administrator</Badge>
            )}
            {currentProvider?.rating && (
              <span className="text-xs text-primary font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {currentProvider.rating.toFixed(2)} Rating
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground mt-1">
            {currentProvider?.fullName || user?.fullName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {user?.role === 'admin' ? 'Studio Management' : 'Artisan Station'} • {user?.email}
          </p>
        </div>

        {currentProvider && (
          <Button
            type="button"
            onClick={handleSubmit}
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="text-xs font-bold"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </Button>
        )}
      </div>

      {currentProvider && (
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
    )}

      {/* Services Assigned by Management */}
      {currentProvider && assignedServices.length > 0 && (
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
      )}

      {/* Security & Password Section */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-primary" />
            Security & Authentication
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="text-[10px] h-7 px-3"
          >
            {showPasswordSection ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordSection ? (
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="rounded-xl py-2 text-xs pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="rounded-xl py-2 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isChangingPassword}
                className="text-xs font-bold"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Update your account password to ensure your account remains secure.
          </p>
        )}
      </div>
    </div>
  );
};
