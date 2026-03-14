"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  primarySrc?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
};

export default function SmartLogo({
  primarySrc,
  fallbackSrc,
  alt,
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);

  const initialSrc = useMemo(
    () => primarySrc || fallbackSrc || null,
    [primarySrc, fallbackSrc],
  );

  const [src, setSrc] = useState<string | null>(initialSrc);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSrc(initialSrc);
    setTriedFallback(false);
  }, [initialSrc]);

  if (!mounted || !src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!triedFallback && fallbackSrc && src !== fallbackSrc) {
          setTriedFallback(true);
          setSrc(fallbackSrc);
          return;
        }

        setSrc(null);
      }}
    />
  );
}
