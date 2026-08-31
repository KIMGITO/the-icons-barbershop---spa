import React, { useState } from 'react';

/**
 * Neutral placeholder SVG — clearly an empty state, not business content.
 * Used only when no image URL exists or the image fails to load.
 */
export const DEFAULT_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#f3f4f6"/>
      <g fill="none" stroke="#9ca3af" stroke-width="2">
        <rect x="120" y="120" width="160" height="160" rx="8"/>
        <circle cx="200" cy="180" r="28"/>
        <path d="M142 280c8-30 24-48 58-48s50 18 58 48"/>
      </g>
      <text x="200" y="320" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">Image unavailable</text>
    </svg>`
  );

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

/**
 * Image component that falls back to a neutral gray placeholder
 * whenever the source URL is missing, broken, or fails to load.
 * The placeholder is intentionally generic and clearly not business content.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallback = DEFAULT_IMAGE,
  onError,
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallback);

  return (
    <img
      {...rest}
      src={currentSrc || fallback}
      onError={(e) => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
        onError?.(e);
      }}
    />
  );
};
