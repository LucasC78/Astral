"use client";

import { useMemo, useState } from "react";

type Props = {
  primarySrc?: string | null; // ex: tool.logoUrl
  fallbackSrc?: string | null; // ex: favicon google
  alt: string;
  className?: string;
};

export default function SmartLogo({
  primarySrc,
  fallbackSrc,
  alt,
  className,
}: Props) {
  const initial = useMemo(
    () => primarySrc || fallbackSrc || null,
    [primarySrc, fallbackSrc],
  );
  const [src, setSrc] = useState<string | null>(initial);
  const [triedFallback, setTriedFallback] = useState(false);

  if (!src) return null;

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
        // si même le fallback casse → on masque
        setSrc(null);
      }}
    />
  );
}
