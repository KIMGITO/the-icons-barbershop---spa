import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Crop as CropIcon,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { storageService } from '../../../services/storageService';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  bucket?: 'avatars' | 'services' | 'business' | 'products';
  aspectRatio?: 'square' | 'wide' | 'banner';
  label?: string;
  helperText?: string;
  disabled?: boolean;
  /** Longest side (in pixels) of the exported cropped image. Default 2048. */
  maxCropDimension?: number;
}

interface CropState {
  scale: number;
  posX: number;
  posY: number;
}

const ASPECT_RATIOS: Record<string, number> = {
  square: 1,
  wide: 16 / 9,
  banner: 21 / 9,
};

const MAX_OUTPUT_BYTES = 5 * 1024 * 1024; // 5 MB storage limit
const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const DEFAULT_MAX_DIMENSION = 2048;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/* ------------------------------------------------------------------ */
/* ImageCropModal — pinch / wheel zoom + drag reposition, then export  */
/* ------------------------------------------------------------------ */

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio: number;
  maxCropDimension: number;
  onCancel: () => void;
  onApply: (blob: Blob) => Promise<void>;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  aspectRatio,
  maxCropDimension,
  onCancel,
  onApply,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ scale: 1, posX: 0, posY: 0 });
  const [applying, setApplying] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cropRef = useRef(crop);
  const initializedRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    startDistance: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  // Measure crop container (handles responsive / window resize)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset initialization when a new image is loaded
  useEffect(() => {
    initializedRef.current = false;
  }, [imageSrc]);

  // Initial zoom: cover the crop box (plus a small margin)
  useEffect(() => {
    if (!containerSize || !natural || initializedRef.current) return;
    initializedRef.current = true;
    const cover = Math.max(containerSize.w / natural.w, containerSize.h / natural.h);
    setCrop({ scale: cover * 1.05, posX: 0, posY: 0 });
  }, [containerSize, natural]);

  const clampCropPosition = useCallback(
    (next: CropState, nat = natural, size = containerSize): CropState => {
      if (!nat || !size) return next;
      const imgW = nat.w * next.scale;
      const imgH = nat.h * next.scale;
      const maxX = Math.max(0, (imgW - size.w) / 2);
      const maxY = Math.max(0, (imgH - size.h) / 2);
      return {
        ...next,
        posX: clampValue(next.posX, -maxX, maxX),
        posY: clampValue(next.posY, -maxY, maxY),
      };
    },
    [natural, containerSize]
  );

  // Zoom anchored at a container-local point (mx, my)
  const zoomAt = useCallback(
    (mx: number, my: number, factor: number) => {
      const nat = natural;
      const size = containerSize;
      if (!nat || !size) return;
      setCrop(prev => {
        const newScale = clampValue(prev.scale * factor, MIN_ZOOM, MAX_ZOOM);
        const ratio = newScale / prev.scale;
        const centerX = size.w / 2;
        const centerY = size.h / 2;
        const worldX = (mx - centerX - prev.posX) / prev.scale;
        const worldY = (my - centerY - prev.posY) / prev.scale;
        const next: CropState = {
          scale: newScale,
          posX: mx - centerX - worldX * newScale,
          posY: my - centerY - worldY * newScale,
        };
        return clampCropPosition(next, nat, size);
      });
    },
    [natural, containerSize, clampCropPosition]
  );

  /* ------------------ Pointer (touch + mouse) handling ---------------- */

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (applying) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()];
      const rect = containerRef.current?.getBoundingClientRect();
      pinchRef.current = {
        startDistance: Math.max(1, distance(p1, p2)),
        startScale: cropRef.current.scale,
        startMidX: (p1.x + p2.x) / 2 - (rect?.left ?? 0),
        startMidY: (p1.y + p2.y) / 2 - (rect?.top ?? 0),
        startPosX: cropRef.current.posX,
        startPosY: cropRef.current.posY,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId)!;
    const cur = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, cur);

    const pointers = [...pointersRef.current.values()];

    if (pointers.length === 2 && pinchRef.current) {
      // Pinch zoom + midpoint pan
      const pin = pinchRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      const mx = (cur.x + pointers[0].x) / 2 - (rect?.left ?? 0);
      const my = (cur.y + pointers[0].y) / 2 - (rect?.top ?? 0);
      const factor = distance(pointers[0], cur) / pin.startDistance;
      const centerX = (containerSize?.w ?? 0) / 2;
      const centerY = (containerSize?.h ?? 0) / 2;

      setCrop(prev => {
        const newScale = clampValue(pin.startScale * factor, MIN_ZOOM, MAX_ZOOM);
        const ratio = newScale / pin.startScale;
        const next: CropState = {
          scale: newScale,
          posX: mx - centerX - (pin.startMidX - centerX - pin.startPosX) * ratio,
          posY: my - centerY - (pin.startMidY - centerY - pin.startPosY) * ratio,
        };
        return clampCropPosition(next);
      });
    } else if (pointers.length === 1) {
      // Single finger / mouse drag
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      setCrop(prev => clampCropPosition({ ...prev, posX: prev.posX + dx, posY: prev.posY + dy }));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
    if (pointersRef.current.size === 0) setIsInteracting(false);
  };

  /* ------------------------- Mouse wheel zoom ------------------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      zoomAt(mx, my, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /* ------------------------ Crop & export ---------------------------- */

  const handleZoomIn = () => {
    const size = containerSize;
    if (!size) return;
    zoomAt(size.w / 2, size.h / 2, 1.2);
  };

  const handleZoomOut = () => {
    const size = containerSize;
    if (!size) return;
    zoomAt(size.w / 2, size.h / 2, 1 / 1.2);
  };

  const handleReset = () => {
    if (!containerSize || !natural) return;
    const cover = Math.max(containerSize.w / natural.w, containerSize.h / natural.h);
    setCrop({ scale: cover * 1.05, posX: 0, posY: 0 });
  };

  const handleApply = async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !containerSize || !natural || applying) return;
    if (img.naturalWidth === 0) {
      setError('Image is not ready. Please wait a moment and try again.');
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const rect = container.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const { scale, posX, posY } = cropRef.current;

      // Visible region in natural image coordinates
      const sx = natural.w / 2 - (W / 2 + posX) / scale;
      const sy = natural.h / 2 - (H / 2 + posY) / scale;
      const sw = W / scale;
      const sh = H / scale;

      // Choose an output resolution, scaling down iteratively if the
      // exported JPEG exceeds the storage size limit.
      const maxSide = Math.max(W, H);
      let outScale = Math.min(4, maxCropDimension / maxSide);
      outScale = Math.max(outScale, 2);

      const renderAt = (factor: number): Promise<Blob | null> => {
        const outW = Math.max(1, Math.round(W * outScale * factor));
        const outH = Math.max(1, Math.round(H * outScale * factor));
        return new Promise(resolve => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
          } catch {
            resolve(null);
          }
        });
      };

      let blob: Blob | null = null;
      let factor = 1;
      for (let attempt = 0; attempt < 8; attempt++) {
        blob = await renderAt(factor);
        if (blob && blob.size <= MAX_OUTPUT_BYTES) break;
        factor *= 0.6;
      }

      if (!blob) {
        throw new Error(
          'Unable to process this image. If it came from a URL, the host may block editing.'
        );
      }
      if (blob.size > MAX_OUTPUT_BYTES) {
        throw new Error('Processed image is still too large for upload (5 MB max).');
      }

      await onApply(blob);
    } catch (err: any) {
      setError(err.message || 'Failed to process image.');
      setApplying(false);
    }
  };

  /* ------------------------------- Render ------------------------------ */

  const zoomPercent = natural && containerSize ? Math.round(crop.scale * 100) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CropIcon className="w-4 h-4 text-primary shrink-0" />
              Crop & Focus Image
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Pinch or scroll to zoom • Drag to reposition
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            aria-label="Cancel cropping"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl bg-black/50 border border-border select-none"
          style={{ aspectRatio: `${aspectRatio}`, touchAction: 'none', cursor: isInteracting ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onContextMenu={e => e.preventDefault()}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            onLoad={e => {
              const el = e.currentTarget;
              if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              }
            }}
            onError={() => setError('Could not load the image. Check the URL or file and try again.')}
            className="absolute max-w-none pointer-events-none select-none"
            style={{
              left: '50%',
              top: '50%',
              width: natural ? natural.w : 'auto',
              height: natural ? natural.h : 'auto',
              transform: `translate(calc(-50% + ${crop.posX}px), calc(-50% + ${crop.posY}px)) scale(${crop.scale})`,
            }}
          />

          {/* Rule-of-thirds grid */}
          <div className="absolute inset-0 pointer-events-none opacity-60">
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
          </div>

          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-xl" />

          {/* Busy overlay */}
          {applying && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-[11px] font-semibold text-foreground">Processing & Uploading...</span>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={applying}
            className="p-2 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2.5 py-1 text-[10px] font-mono text-muted-foreground bg-muted/40 rounded-md min-w-[52px] text-center">
            {zoomPercent !== null ? `${zoomPercent}%` : '—'}
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={applying}
            className="p-2 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={applying}
            className="p-2 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            title="Reset view"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={applying || !natural || !containerSize}
          >
            {applying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              'Apply Crop'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ImageUploader — Select (upload), Capture (camera), or URL source,   */
/* then crop & resize before uploading.                                */
/* ------------------------------------------------------------------ */

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucket = 'avatars',
  aspectRatio = 'square',
  label = 'Upload Image',
  helperText = 'JPG, PNG, or WEBP. Max 5MB.',
  disabled = false,
  maxCropDimension = DEFAULT_MAX_DIMENSION,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [sourceMode, setSourceMode] = useState<'select' | 'capture' | 'url' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [cropSource, setCropSource] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sync if external currentImageUrl changes
  useEffect(() => {
    setPreviewUrl(currentImageUrl);
  }, [currentImageUrl]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  /* ------------------------- File handling --------------------------- */

  const handleFile = (file: File) => {
    setUploadError(null);

    const validation = storageService.validateImage(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image file');
      return;
    }

    // Create a same-origin object URL for the crop editor
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setCropSource(objectUrl);
    setSourceMode(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  /* -------------------------- URL handling --------------------------- */

  const handleUrlLoad = () => {
    const url = urlInput.trim();
    if (!url) {
      setUploadError('Please enter an image URL.');
      return;
    }
    setUploadError(null);
    setCropSource(url);
    setUrlInput('');
    setSourceMode(null);
  };

  /* -------------------------- Crop lifecycle ------------------------- */

  const cancelCrop = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCropSource(null);
  };

  const handleApplyCrop = async (blob: Blob) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const validation = storageService.validateImage(blob as File);
      if (!validation.valid) {
        throw new Error(validation.error || 'Processed image is not valid.');
      }

      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      const result = await storageService.uploadImage(file, bucket as any);

      setPreviewUrl(result.url);
      onImageUploaded(result.url);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setCropSource(null);
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /* --------------------------- Remove flow --------------------------- */

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(undefined);
    setUploadError(null);
    setSourceMode(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (captureInputRef.current) captureInputRef.current.value = '';
    if (onImageRemoved) onImageRemoved();
    else onImageUploaded('');
  };

  /* ---------------------------- Styling ------------------------------ */

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-[21/9] w-full';
      case 'wide':
        return 'aspect-[16/9] w-full';
      case 'square':
      default:
        return 'aspect-square w-32 sm:w-40';
    }
  };

  const sourceButtonClass =
    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all bg-card text-foreground border-border hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed';

  /* ------------------------------ Render ------------------------------ */

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}

      <div
        onDragOver={e => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading && !previewUrl) fileInputRef.current?.click();
        }}
        className={`relative group rounded-xl border border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-3 text-center ${
          getAspectClass()
        } ${
          isDragOver
            ? 'border-primary bg-primary/10 cursor-pointer'
            : previewUrl
            ? 'border-border bg-card cursor-default'
            : 'border-border hover:border-primary/50 bg-card/60 hover:bg-card cursor-pointer'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* Uploading Spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[11px] font-semibold text-foreground">Processing Image...</span>
          </div>
        )}

        {/* Image Preview */}
        {previewUrl ? (
          <div className="relative w-full h-full">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />

            {/* Hover overlay with action buttons */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-2 z-10 flex-wrap">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="text-[11px] py-1 px-2.5 h-auto"
                onClick={e => {
                  e.stopPropagation();
                  setCropSource(previewUrl);
                }}
              >
                <CropIcon className="w-3.5 h-3.5 mr-1" />
                Crop
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-[11px] py-1 px-2.5 h-auto"
                onClick={e => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="text-[11px] py-1 px-2.5 h-auto"
                onClick={handleRemove}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          /* Empty / Source Select State */
          <div className="flex flex-col items-center justify-center space-y-3 p-2 w-full">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              <ImageIcon className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                Add an image
              </p>
              <p className="text-[10px] text-muted-foreground">Select, capture, or paste a URL</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className={sourceButtonClass}
                disabled={disabled || isUploading}
                onClick={() => {
                  setSourceMode('select');
                  requestAnimationFrame(() => fileInputRef.current?.click());
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                type="button"
                className={sourceButtonClass}
                disabled={disabled || isUploading}
                onClick={() => {
                  setSourceMode('capture');
                  requestAnimationFrame(() => captureInputRef.current?.click());
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                Camera
              </button>
              <button
                type="button"
                className={`${sourceButtonClass} ${sourceMode === 'url' ? 'border-primary text-primary bg-primary/5' : ''}`}
                disabled={disabled || isUploading}
                onClick={() => setSourceMode(mode => (mode === 'url' ? null : 'url'))}
              >
                <Link2 className="w-3.5 h-3.5" />
                URL
              </button>
            </div>

            {sourceMode === 'url' && (
              <div
                className="w-full flex items-center gap-1.5 bg-card/80 border border-border rounded-lg p-1.5"
                onClick={e => e.stopPropagation()}
              >
                <Input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlLoad();
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="rounded-md py-1.5 text-[11px] focus-visible:ring-0"
                  disabled={disabled || isUploading}
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="text-[11px] px-3 h-auto shrink-0"
                  onClick={handleUrlLoad}
                  disabled={disabled || isUploading || !urlInput.trim()}
                >
                  Load
                </Button>
                <button
                  type="button"
                  onClick={() => setSourceMode(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label="Cancel URL input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">{helperText}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Crop & Resize Modal */}
      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource}
          aspectRatio={ASPECT_RATIOS[aspectRatio]}
          maxCropDimension={maxCropDimension}
          onCancel={cancelCrop}
          onApply={handleApplyCrop}
        />
      )}
    </div>
  );
};