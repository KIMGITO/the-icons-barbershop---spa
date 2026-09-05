import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { GalleryItem } from '../../../types';
import { ImageUploader } from '../ui/ImageUploader';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  X,
  Image,
  Check,
} from 'lucide-react';

export const GalleryManagementPage: React.FC = () => {
  const {
    gallery,
    addGalleryItem,
    updateGalleryItem,
    deleteGalleryItem,
    reorderGallery,
  } = useApp();

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState<'haircut' | 'beard' | 'spa' | 'interior' | 'team'>('haircut');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);

  const handleImageUploaded = (url: string) => {
    setUploadedImageUrl(url);
  };

  const handleAddToGallery = async () => {
    if (!uploadedImageUrl) return;
    await addGalleryItem({
      title: newGalleryTitle || 'Untitled',
      alt: newGalleryTitle || 'Gallery image',
      category: newGalleryCategory,
      imageUrl: uploadedImageUrl,
      caption: newGalleryCaption,
      sortOrder: gallery.length,
      isActive: true,
    });
    setUploadedImageUrl('');
    setNewGalleryTitle('');
    setNewGalleryCaption('');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...gallery];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    reorderGallery(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === gallery.length - 1) return;
    const newItems = [...gallery];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    reorderGallery(newItems);
  };

  const handleDelete = (id: string) => {
      deleteGalleryItem(id);
  };

  const handleToggleVisibility = (item: GalleryItem) => {
    updateGalleryItem({ ...item, isActive: !item.isActive });
  };

  const handleSaveEdit = async () => {
    if (!editingGalleryItem) return;
    await updateGalleryItem(editingGalleryItem);
    setEditingGalleryItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-white font-heading tracking-wide">Style Gallery</h1>
        
      </div>

      {/* Upload Area */}
      <div className="p-5 bg-card border border-border rounded-sm space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Upload New Image
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Uploader (crop + upload) */}
          <div>
            <ImageUploader
              currentImageUrl={uploadedImageUrl}
              onImageUploaded={handleImageUploaded}
              onImageRemoved={() => setUploadedImageUrl('')}
              bucket="gallery"
              aspectRatio="wide"
              label=""
              helperText="JPG, PNG, or WEBP. Max 5MB. Crop before uploading."
            />
          </div>

          {/* Metadata fields */}
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
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddToGallery}
              disabled={!uploadedImageUrl}
              className="uppercase font-bold tracking-wider"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Add to Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery List with Reorder */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Gallery Images — Use arrows to reorder ({gallery.length} items)
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
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-muted-foreground mx-auto" />
                  <button
                    onClick={() => handleMoveDown(index)}
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
                    onClick={() => handleToggleVisibility(item)}
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
                    onClick={() => handleDelete(item.id)}
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
                onClick={handleSaveEdit}
                className="uppercase font-bold tracking-wider"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};