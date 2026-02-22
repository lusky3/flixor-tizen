import { useState, useRef, useEffect, useCallback } from 'react';
import { buildImageUrl } from '../services/tmdb';

interface SmartImageProps {
  src: string;
  alt: string;
  kind?: 'poster' | 'backdrop' | 'profile' | 'logo';
  className?: string;
  width?: number | string;
  height?: number | string;
  useTmdb?: boolean;
}

export function SmartImage({
  src,
  alt,
  kind = 'poster',
  className,
  width,
  height,
  useTmdb = false,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => setLoaded(true), []);

  const resolvedSrc = useTmdb ? buildImageUrl(src, kind) : src;

  return (
    <div
      ref={containerRef}
      className={`smart-image${loaded ? ' smart-image--loaded' : ''}${className ? ` ${className}` : ''}`}
      style={{ width, height }}
    >
      {inView && resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={alt}
          className="smart-image__img"
          onLoad={handleLoad}
        />
      )}
    </div>
  );
}
