import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Scissors, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  DollarSign, 
  HelpCircle, 
  SlidersHorizontal,
  Home,
  Image,
  ChevronUp,
  ChevronDown,
  Upload,
  Eye,
  EyeOff,
  GripVertical,
  X
} from 'lucide-react';
import { ServiceItem, FAQItem, GalleryItem } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ThemeSelect } from '../components/ui/ThemeSelect';

export const AdminDashboard: React.FC = () => {
  const { 
    bookings, 
    completeBooking, 
    cancelBooking, 
    services, 
    updateService, 
    addService, 
    deleteService, 
    faqs, 
    updateFAQ, 
    addFAQ, 
    deleteFAQ, 
    gallery,
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    reorderGallery,
    navigateTo 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'faqs' | 'gallery'>('bookings');

  // Gallery state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState<'haircut' | 'beard' | 'spa' | 'interior' | 'team'>('haircut');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  
  // Editing service state
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);

  // New service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState(2000);
  const [newServiceDuration, setNewServiceDuration] = useState(45);
  const [newServiceCategory, setNewServiceCategory] = useState<'haircut' | 'beard' | 'spa' | 'packages'>('haircut');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Editing FAQ state
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState<string>('Appointments');
  const [newFaqFeatured, setNewFaqFeatured] = useState(false);
  const [isNewFaqOpen, setIsNewFaqOpen] = useState(false);

  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.totalPriceKsh, 0);

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    updateService(editingService);
    setEditingService(null);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName) return;
    const slug = newServiceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addService({
      slug,
      name: newServiceName,
      category: newServiceCategory,
      shortDescription: newServiceDesc,
      fullDescription: newServiceDesc,
      durationMinutes: Number(newServiceDuration),
      priceKsh: Number(newServicePrice),
      features: [],
      imageUrl: ''
    });
    setIsNewServiceModalOpen(false);
    setNewServiceName('');
    setNewServiceDesc('');
  };

  const handleSaveEditFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    updateFAQ(editingFaq);
    setEditingFaq(null);
  };

  const handleCreateFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion || !newFaqAnswer) return;
    addFAQ({
      question: newFaqQuestion,
      answer: newFaqAnswer,
      category: newFaqCategory,
      isFeaturedOnHome: newFaqFeatured
    });
    setIsNewFaqOpen(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setNewFaqFeatured(false);
  };

  return (
    <div className="pt-28 pb-24 bg-background min-h-screen text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-card border border-primary flex items-center justify-center text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-wide">
                Staff & Admin Portal
              </h1>
              <p className="text-xs text-muted-foreground">The Icons Barber & Spa Management Console</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigateTo('/')}
            className="self-start sm:self-auto gap-2"
          >
            <Home className="w-4 h-4 text-primary" />
            <span>Public Website</span>
          </Button>
        </div>

        {/* Top Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-card border border-border rounded-sm space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">Total Bookings</span>
            <div className="text-2xl font-extrabold text-white font-mono">{bookings.length}</div>
            <span className="text-[11px] text-primary">{confirmedCount} confirmed & pending chair</span>
          </div>

          <div className="p-5 bg-card border border-border rounded-sm space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">Estimated Booked Value</span>
            <div className="text-2xl font-extrabold text-primary font-mono">
              KSh {totalRevenue.toLocaleString()}
            </div>
            <span className="text-[11px] text-muted-foreground">Active chair reservations</span>
          </div>

          <div className="p-5 bg-card border border-border rounded-sm space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">Live Services</span>
            <div className="text-2xl font-extrabold text-white font-mono">{services.length}</div>
            <span className="text-[11px] text-muted-foreground">Dynamic menu items</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`tab-base ${activeTab === 'bookings' ? 'tab-active' : 'tab-inactive'}`}
          >
            Live Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`tab-base ${activeTab === 'services' ? 'tab-active' : 'tab-inactive'}`}
          >
            Manage Services ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`tab-base ${activeTab === 'faqs' ? 'tab-active' : 'tab-inactive'}`}
          >
            Manage FAQs ({faqs.length})
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`tab-base ${activeTab === 'gallery' ? 'tab-active' : 'tab-inactive'}`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Gallery ({gallery.length})</span>
          </button>
        </div>

        {/* TAB 1: Live Bookings Management */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Upcoming & Recent Client Reservations
              </h2>
            </div>

            <div className="space-y-3">
              {bookings.map(booking => (
                <div 
                  key={booking.id}
                  className="p-5 bg-card border border-border rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-primary bg-secondary px-2 py-0.5 rounded-sm border border-border">
                        {booking.referenceNumber}
                      </span>
                      <Badge
                        variant={booking.status === 'confirmed' ? 'success' : booking.status === 'completed' ? 'neutral' : 'destructive'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{booking.customerName}</span>
                      <a href={`tel:${booking.customerPhone}`} className="text-xs text-muted-foreground hover:text-primary font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-primary" /> {booking.customerPhone}
                      </a>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span><strong className="text-foreground">Services:</strong> {booking.serviceNames.join(', ')}</span>
                      <span><strong className="text-foreground">Barber:</strong> {booking.barberName}</span>
                      <span><strong className="text-foreground">Slot:</strong> {booking.date} at {booking.timeSlot} ({booking.totalDurationMinutes} min)</span>
                    </div>

                    {booking.specialRequests && (
                      <p className="text-[11px] text-muted-foreground-light italic bg-background p-2 rounded-sm border border-border">
                        Note: {booking.specialRequests}
                      </p>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase">Total</span>
                      <span className="font-mono text-base font-bold text-primary">
                        KSh {booking.totalPriceKsh.toLocaleString()}
                      </span>
                    </div>

                    {booking.status === 'confirmed' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => completeBooking(booking.id)}
                          className="text-emerald-400 border-emerald-500/40 gap-1 text-xs"
                          title="Mark completed"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                          className="text-red-400 border-red-500/40 gap-1 text-xs"
                          title="Cancel appointment"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Services Management */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Service Catalog & Prices
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewServiceModalOpen(true)}
                className="text-xs uppercase tracking-wider gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Service</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(service => (
                <div 
                  key={service.id}
                  className="p-4 bg-card border border-border rounded-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{service.name}</h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-secondary text-primary border border-border rounded-sm">
                        {service.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.shortDescription}</p>
                    <div className="flex items-center gap-4 text-xs font-mono mt-2">
                      <span className="text-white font-bold">KSh {service.priceKsh.toLocaleString()}</span>
                      <span className="text-muted-foreground">{service.durationMinutes} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingService(service)}
                      className="text-xs gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Price / Details</span>
                    </Button>

                    <button
                      onClick={() => deleteService(service.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FAQ Management */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Admin FAQ Directory ({faqs.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage knowledge base questions, categories, and homepage preview selection.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewFaqOpen(true)}
                className="text-xs uppercase tracking-wider gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </Button>
            </div>

            <div className="space-y-3">
              {faqs.map(faq => (
                <div key={faq.id} className="p-4 bg-card border border-border rounded-sm space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm bg-secondary text-primary border border-border">
                          {faq.category}
                        </span>
                        {faq.isFeaturedOnHome && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm bg-emerald-950/40 text-emerald-400 border border-emerald-500/40">
                            ★ Homepage Preview
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-white pt-1">{faq.question}</h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingFaq(faq)}
                        className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteFAQ(faq.id)}
                        className="text-xs text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-light">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Edit Service */}
        {editingService && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveEditService}
              className="w-full max-w-lg bg-card border border-border p-6 rounded-sm space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Edit Service: {editingService.name}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground mb-1">Service Name</label>
                  <Input
                    type="text"
                    value={editingService.name}
                    onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground mb-1">Price (KSh)</label>
                    <Input
                      type="number"
                      value={editingService.priceKsh}
                      onChange={e => setEditingService({ ...editingService, priceKsh: Number(e.target.value) })}
                      className="p-2.5 rounded-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground mb-1">Duration (Minutes)</label>
                    <Input
                      type="number"
                      value={editingService.durationMinutes}
                      onChange={e => setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })}
                      className="p-2.5 rounded-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-foreground mb-1">Description</label>
                  <Input
                    multiline
                    rows={3}
                    value={editingService.shortDescription}
                    onChange={e => setEditingService({ ...editingService, shortDescription: e.target.value, fullDescription: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="uppercase font-bold tracking-wider"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Add New Service */}
        {isNewServiceModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form 
              onSubmit={handleCreateService}
              className="w-full max-w-lg bg-card border border-border p-6 rounded-sm space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Add New Treatment / Service
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground mb-1">Service Name</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. VIP Beard Oil Infusion & Lineup"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-foreground mb-1">Category</label>
                    <ThemeSelect
                      value={newServiceCategory}
                      onChange={e => setNewServiceCategory(e.target.value as any)}
                    >
                      <option value="haircut">Haircut</option>
                      <option value="beard">Beard</option>
                      <option value="spa">Spa</option>
                      <option value="packages">Package</option>
                    </ThemeSelect>
                  </div>
                  <div>
                    <label className="block text-foreground mb-1">Price (KSh)</label>
                    <Input
                      type="number"
                      required
                      value={newServicePrice}
                      onChange={e => setNewServicePrice(Number(e.target.value))}
                      className="p-2.5 rounded-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground mb-1">Duration (Min)</label>
                    <Input
                      type="number"
                      required
                      value={newServiceDuration}
                      onChange={e => setNewServiceDuration(Number(e.target.value))}
                      className="p-2.5 rounded-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-foreground mb-1">Short Description</label>
                  <Input
                    multiline
                    rows={3}
                    required
                    placeholder="Describe the treatment ritual and customer outcomes..."
                    value={newServiceDesc}
                    onChange={e => setNewServiceDesc(e.target.value)}
                    className="p-2.5 rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewServiceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="uppercase font-bold tracking-wider"
                >
                  Add Service
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit FAQ */}
        {editingFaq && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form 
              onSubmit={handleSaveEditFaq}
              className="w-full max-w-lg bg-card border border-border p-6 rounded-sm space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Edit FAQ
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground mb-1">Question</label>
                  <Input
                    type="text"
                    value={editingFaq.question}
                    onChange={e => setEditingFaq({ ...editingFaq, question: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground mb-1">Category</label>
                    <ThemeSelect
                      value={editingFaq.category}
                      onChange={e => setEditingFaq({ ...editingFaq, category: e.target.value })}
                      className="w-full p-2.5 bg-background border border-border text-white rounded-sm focus:border-primary focus:outline-none"
                    >
                      <option value="Appointments">Appointments</option>
                      <option value="Payments">Payments</option>
                      <option value="Services">Services</option>
                      <option value="Barbers">Barbers</option>
                      <option value="Products">Products</option>
                      <option value="Policies">Policies</option>
                    </ThemeSelect>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingFaq.isFeaturedOnHome}
                        onChange={e => setEditingFaq({ ...editingFaq, isFeaturedOnHome: e.target.checked })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span>Show on Homepage (Preview 3)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-foreground mb-1">Answer</label>
                  <Input
                    multiline
                    rows={4}
                    value={editingFaq.answer}
                    onChange={e => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingFaq(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="uppercase font-bold tracking-wider"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Add New FAQ */}
        {isNewFaqOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form 
              onSubmit={handleCreateFaq}
              className="w-full max-w-lg bg-card border border-border p-6 rounded-sm space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Add New Question
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground mb-1">Question</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Do you accept international credit cards?"
                    value={newFaqQuestion}
                    onChange={e => setNewFaqQuestion(e.target.value)}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground mb-1">Category</label>
                    <ThemeSelect
                      value={newFaqCategory}
                      onChange={e => setNewFaqCategory(e.target.value)}
                      className="w-full p-2.5 bg-background border border-border text-white rounded-sm focus:border-primary focus:outline-none"
                    >
                      <option value="Appointments">Appointments</option>
                      <option value="Payments">Payments</option>
                      <option value="Services">Services</option>
                      <option value="Barbers">Barbers</option>
                      <option value="Products">Products</option>
                      <option value="Policies">Policies</option>
                    </ThemeSelect>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFaqFeatured}
                        onChange={e => setNewFaqFeatured(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span>Show on Homepage</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-foreground mb-1">Answer</label>
                  <Input
                    multiline
                    rows={4}
                    required
                    placeholder="Provide clear, professional explanation..."
                    value={newFaqAnswer}
                    onChange={e => setNewFaqAnswer(e.target.value)}
                    className="p-2.5 rounded-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewFaqOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="uppercase font-bold tracking-wider"
                >
                  Add FAQ
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: Gallery Management */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Style Gallery ({gallery.length} images)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Upload, reorder, and manage images displayed on the public gallery page.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="p-5 bg-card border border-border rounded-sm space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload New Image
              </h3>

              {uploadError && (
                <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-sm text-xs text-red-400 flex items-center gap-2">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground mb-1">Image File (JPG, PNG, WEBP - max 5MB)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadError(null);
                      setIsUploading(true);
                      try {
                        const result = await storageService.uploadImage(file, 'gallery');
                        await addGalleryItem({
                          title: newGalleryTitle || file.name.replace(/\.[^/.]+$/, ''),
                          alt: newGalleryTitle || file.name,
                          category: newGalleryCategory,
                          imageUrl: result.url,
                          caption: newGalleryCaption,
                          sortOrder: gallery.length,
                          isActive: true
                        });
                        setNewGalleryTitle('');
                        setNewGalleryCaption('');
                      } catch (err: any) {
                        setUploadError(err.message || 'Failed to upload image');
                      } finally {
                        setIsUploading(false);
                        e.target.value = '';
                      }
                    }}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover file:cursor-pointer"
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-foreground mb-1">Title (optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g. Classic Fade with Beard Trim"
                      value={newGalleryTitle}
                      onChange={e => setNewGalleryTitle(e.target.value)}
                      className="p-2 rounded-sm text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground mb-1">Category</label>
                      <select
                        value={newGalleryCategory}
                        onChange={e => setNewGalleryCategory(e.target.value as any)}
                        className="w-full p-2 bg-background border border-border text-white rounded-sm text-xs focus:border-primary focus:outline-none"
                      >
                        <option value="haircut">Haircut</option>
                        <option value="beard">Beard</option>
                        <option value="spa">Spa</option>
                        <option value="interior">Interior</option>
                        <option value="team">Team</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-foreground mb-1">Caption</label>
                      <Input
                        type="text"
                        placeholder="Short description"
                        value={newGalleryCaption}
                        onChange={e => setNewGalleryCaption(e.target.value)}
                        className="p-2 rounded-sm text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Uploading image...
                </div>
              )}
            </div>

            {/* Gallery List with Reorder */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Gallery Images — Use arrows to reorder
              </h3>

              {gallery.length === 0 ? (
                <div className="p-8 bg-card border border-border rounded-sm text-center">
                  <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No gallery images yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload your first image above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gallery.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-card border border-border rounded-sm flex items-center gap-3 hover:border-white/20 transition-colors"
                    >
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => {
                            if (index === 0) return;
                            const newItems = [...gallery];
                            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
                            reorderGallery(newItems);
                          }}
                          disabled={index === 0}
                          className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
                        <button
                          onClick={() => {
                            if (index === gallery.length - 1) return;
                            const newItems = [...gallery];
                            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
                            reorderGallery(newItems);
                          }}
                          disabled={index === gallery.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-sm overflow-hidden bg-secondary border border-border shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{item.title}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-secondary text-primary border border-border rounded-sm shrink-0">
                            {item.category}
                          </span>
                          {item.isActive === false && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-500/40 rounded-sm shrink-0">
                              Hidden
                            </span>
                          )}
                        </div>
                        {item.caption && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.caption}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateGalleryItem({ ...item, isActive: !item.isActive })}
                          className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                            item.isActive
                              ? 'text-emerald-400 hover:bg-emerald-950/30'
                              : 'text-muted-foreground hover:bg-secondary'
                          }`}
                          title={item.isActive ? 'Click to hide' : 'Click to show'}
                        >
                          {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingGalleryItem(item)}
                          className="p-1.5 text-muted-foreground hover:text-primary rounded-sm hover:bg-secondary transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this gallery image?')) {
                              deleteGalleryItem(item.id);
                            }
                          }}
                          className="p-1.5 text-muted-foreground hover:text-red-400 rounded-sm hover:bg-red-950/20 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Edit Gallery Item */}
        {editingGalleryItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-card border border-border p-6 rounded-sm space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Edit Gallery Image
                </h3>
                <button
                  onClick={() => setEditingGalleryItem(null)}
                  className="p-1 text-muted-foreground hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview */}
              <div className="aspect-video rounded-sm overflow-hidden bg-secondary border border-border">
                <img
                  src={editingGalleryItem.imageUrl}
                  alt={editingGalleryItem.alt}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground mb-1">Title</label>
                  <Input
                    type="text"
                    value={editingGalleryItem.title}
                    onChange={e => setEditingGalleryItem({ ...editingGalleryItem, title: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground mb-1">Category</label>
                    <select
                      value={editingGalleryItem.category}
                      onChange={e => setEditingGalleryItem({ ...editingGalleryItem, category: e.target.value as any })}
                      className="w-full p-2.5 bg-background border border-border text-white rounded-sm focus:border-primary focus:outline-none"
                    >
                      <option value="haircut">Haircut</option>
                      <option value="beard">Beard</option>
                      <option value="spa">Spa</option>
                      <option value="interior">Interior</option>
                      <option value="team">Team</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-foreground mb-1">Alt Text</label>
                    <Input
                      type="text"
                      value={editingGalleryItem.alt}
                      onChange={e => setEditingGalleryItem({ ...editingGalleryItem, alt: e.target.value })}
                      className="p-2.5 rounded-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-foreground mb-1">Caption</label>
                  <Input
                    type="text"
                    value={editingGalleryItem.caption || ''}
                    onChange={e => setEditingGalleryItem({ ...editingGalleryItem, caption: e.target.value })}
                    className="p-2.5 rounded-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingGalleryItem.isActive !== false}
                      onChange={e => setEditingGalleryItem({ ...editingGalleryItem, isActive: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>Visible on public gallery</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingGalleryItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    await updateGalleryItem(editingGalleryItem);
                    setEditingGalleryItem(null);
                  }}
                  className="uppercase font-bold tracking-wider"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
