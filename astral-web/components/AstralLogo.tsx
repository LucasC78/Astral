interface AstralLogoProps {
  size?: number;
  className?: string;
}

export default function AstralLogo({ size = 34, className }: AstralLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      className={className}
      aria-label="Astral logo"
    >
      <circle cx="17" cy="17" r="16" fill="url(#astral-lg)" />
      <circle cx="17" cy="4" r="1.8" fill="white" opacity=".9" />
      <circle cx="28" cy="9" r="1.8" fill="white" opacity=".9" />
      <circle cx="30" cy="22" r="1.8" fill="white" opacity=".9" />
      <circle cx="22" cy="30" r="1.8" fill="white" opacity=".9" />
      <circle cx="12" cy="30" r="1.8" fill="white" opacity=".9" />
      <circle cx="4" cy="22" r="1.8" fill="white" opacity=".9" />
      <circle cx="6" cy="9" r="1.8" fill="white" opacity=".9" />
      <circle
        cx="17"
        cy="17"
        r="7"
        stroke="white"
        strokeWidth="1.3"
        fill="none"
        opacity=".7"
      />
      <ellipse
        cx="17"
        cy="17"
        rx="4"
        ry="7"
        stroke="white"
        strokeWidth="1.2"
        fill="none"
        opacity=".5"
      />
      <line
        x1="10"
        y1="17"
        x2="24"
        y2="17"
        stroke="white"
        strokeWidth="1.2"
        opacity=".6"
      />
      <defs>
        <linearGradient id="astral-lg" x1="0" y1="0" x2="34" y2="34">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
