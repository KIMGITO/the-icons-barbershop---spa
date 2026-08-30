import { useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: IntersectionObserverInit = DEFAULT_OPTIONS) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const threshold = options.threshold;
  const rootMargin = options.rootMargin;
  const root = options.root;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver is not supported, reveal immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(el);
      }
    }, { threshold, rootMargin, root });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return { ref, isVisible };
}
