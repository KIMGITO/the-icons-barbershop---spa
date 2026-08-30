import React, { useState, useEffect } from 'react';
import { 
  Building2, Phone, Mail, MapPin, Clock, Share2, 
  CheckCircle2, Save, Sparkles 
} from 'lucide-react';
import { StaffBusinessProfile } from '../../../types/staff';
import { useBusinessStore } from '../../../stores/businessStore';
import { useUIStore } from '../../../stores/uiStore';
import { ImageUploader } from '../ui/ImageUploader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const BusinessManagementPage: React.FC = () => {
  const { profile, loadBusinessProfile, updateBusinessProfile, loading } = useBusinessStore();
  const { addToast } = useUIStore();

  const [formData, setFormData] = useState<StaffBusinessProfile | null>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  if (!formData) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        Loading business profile...
      </div>
    );
  }

  const handleChange = (field: keyof StaffBusinessProfile, value: any) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
    setSavedSuccess(false);
  };

  const handleHoursChange = (dayKey: 'weekdays' | 'saturday' | 'sunday', value: string) => {
    setFormData(prev => prev ? ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [dayKey]: value
      }
    }) : null);
    setSavedSuccess(false);
  };

  const handleSocialChange = (key: 'whatsapp' | 'instagram' | 'facebook', value: string) => {
    setFormData(prev => prev ? ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [key]: value
      }
    }) : null);
    setSavedSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      setIsSaving(true);
      await updateBusinessProfile(formData);
      setIsSaving(false);
      setSavedSuccess(true);
      addToast({
        type: 'success',
        title: 'Business Updated',
        message: 'Business profile and location details saved successfully.'
      });
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setIsSaving(false);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update business profile.'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            Business Profile & Location
          </h1>
          <p className="text-xs text-muted-foreground">
            Official shop branding, contact channels, operating hours, and location info
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-success flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
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
      </div>

      {/* Brand Imagery (Logo & Cover) */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Brand Imagery
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-1">
            <ImageUploader
              currentImageUrl={formData.logoUrl}
              onImageUploaded={(url) => handleChange('logoUrl', url)}
              onImageRemoved={() => handleChange('logoUrl', '')}
              bucket="business"
              aspectRatio="square"
              label="Business Logo / Emblem"
              helperText="Square transparent or solid PNG/JPG"
            />
          </div>

          <div className="md:col-span-2">
            <ImageUploader
              currentImageUrl={formData.coverImageUrl}
              onImageUploaded={(url) => handleChange('coverImageUrl', url)}
              onImageRemoved={() => handleChange('coverImageUrl', '')}
              bucket="business"
              aspectRatio="wide"
              label="Shop Cover Banner"
              helperText="High resolution interior / flagship photo"
            />
          </div>
        </div>
      </div>

      {/* Core Brand Details */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" /> General Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Business Legal Name
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="rounded-xl py-2 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Official Tagline
            </label>
            <Input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="rounded-xl py-2 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Primary Contact Phone
            </label>
            <Input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="rounded-xl py-2 text-xs font-mono"
              icon={<Phone className="w-3.5 h-3.5" />}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Official Support Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="rounded-xl py-2 text-xs"
              icon={<Mail className="w-3.5 h-3.5" />}
              required
            />
          </div>
        </div>
      </div>

      {/* Location Details */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" /> Physical Location & Access
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Physical Street & Suite Address
            </label>
            <Input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="rounded-xl py-2 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Neighborhood / Area
            </label>
            <Input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              className="rounded-xl py-2 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Customer Landmarks & Entry Instructions
          </label>
          <Input
            multiline
            value={formData.locationDetails || ''}
            onChange={(e) => handleChange('locationDetails', e.target.value)}
            rows={2}
            className="rounded-xl p-2.5 text-xs"
          />
        </div>
      </div>

      {/* Operating Hours */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" /> Shop Operating Hours
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Monday - Friday
            </label>
            <Input
              type="text"
              value={formData.openingHours.weekdays}
              onChange={(e) => handleHoursChange('weekdays', e.target.value)}
              className="rounded-xl py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Saturday
            </label>
            <Input
              type="text"
              value={formData.openingHours.saturday}
              onChange={(e) => handleHoursChange('saturday', e.target.value)}
              className="rounded-xl py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sunday & Public Holidays
            </label>
            <Input
              type="text"
              value={formData.openingHours.sunday}
              onChange={(e) => handleHoursChange('sunday', e.target.value)}
              className="rounded-xl py-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Social & Messaging Channels */}
      <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-primary" /> Client Messaging & Channels
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              WhatsApp Concierge
            </label>
            <Input
              type="text"
              value={formData.socialLinks.whatsapp}
              onChange={(e) => handleSocialChange('whatsapp', e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="rounded-xl py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Instagram Handle
            </label>
            <Input
              type="text"
              value={formData.socialLinks.instagram || ''}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              placeholder="@theiconsbarber.ke"
              className="rounded-xl py-2 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Facebook Page
            </label>
            <Input
              type="text"
              value={formData.socialLinks.facebook || ''}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              placeholder="The Icons Barber Nairobi"
              className="rounded-xl py-2 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSaving}
          className="text-xs font-bold px-6"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </Button>
      </div>
    </form>
  );
};
