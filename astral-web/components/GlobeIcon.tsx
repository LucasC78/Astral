interface GlobeIconProps {
  size?: number;
  className?: string;
}

export default function GlobeIcon({ size = 40, className }: GlobeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="22" cy="5" r="2" fill="white" opacity=".9" />
      <circle cx="35" cy="11" r="2" fill="white" opacity=".9" />
      <circle cx="39" cy="24" r="2" fill="white" opacity=".9" />
      <circle cx="32" cy="37" r="2" fill="white" opacity=".9" />
      <circle cx="22" cy="40" r="2" fill="white" opacity=".9" />
      <circle cx="12" cy="37" r="2" fill="white" opacity=".9" />
      <circle cx="5" cy="24" r="2" fill="white" opacity=".9" />
      <circle cx="9" cy="11" r="2" fill="white" opacity=".9" />
      <circle
        cx="22"
        cy="22"
        r="10"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
        opacity=".9"
      />
      <ellipse
        cx="22"
        cy="22"
        rx="5.5"
        ry="10"
        stroke="white"
        strokeWidth="1.4"
        fill="none"
        opacity=".7"
      />
      <line
        x1="12"
        y1="22"
        x2="32"
        y2="22"
        stroke="white"
        strokeWidth="1.4"
        opacity=".7"
      />
      <line
        x1="22"
        y1="12"
        x2="22"
        y2="32"
        stroke="white"
        strokeWidth="1.4"
        opacity=".6"
      />
    </svg>
  );
}
