import React, { useState } from 'react';

export const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFyYmVyJTIwdG9vbHN8ZW58MHx8MHx8fDA%3D';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

/**
 * Image component that falls back to a default barber-tools image
 * whenever the source URL is missing, broken, or fails to load.
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