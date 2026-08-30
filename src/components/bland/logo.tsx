import React from 'react';
import { useApp } from '../../context/AppContext';

export const Logo: React.FC = () => {
  const { navigateTo } = useApp();
  return (
    <div
      className="cursor-pointer inline-block group"
      onClick={() => navigateTo('/')}
    >
      <div className="flex items-center justify-center sm:justify-start gap-1">
        <span className="font-script text-4xl sm:text-5xl text-primary tracking-wide transform -rotate-2 select-none group-hover:text-primary-hover  transition-all duration-300 drop-shadow-[0_2px_10px_color-mix(in_srgb,var(--primary)_30%,transparent)]">
          The <span className="text-white">Icons</span>
        </span>
      </div>
      <div className="w-full h-2 relative -mt-1 pointer-events-none flex items-center justify-center">
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-primary"
        >
          <path
            d="M15 12C15 8.68629 12.3137 6 9 6C5.68629 6 3 8.68629 3 12C3 15.3137 5.68629 18 9 18C12.3137 18 15 15.3137 15 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M15 12L97 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M15 12L97 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <p className="text-[11px] sm:text-xs text-center font-serif font-semibold uppercase tracking-wider text-muted-foreground-light mt-0.5">
        Barbershop & Spa
      </p>
    </div>
  );
};

export default Logo;