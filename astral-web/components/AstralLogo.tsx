export default function AstralLogo({ size = 80 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const r = s / 2 - 2;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Globe bleu EU */}
      <circle cx={c} cy={c} r={r} fill="#003399" />

      {/* Méridiens */}
      <ellipse
        cx={c}
        cy={c}
        rx={r * 0.5}
        ry={r}
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity="0.25"
      />
      <ellipse
        cx={c}
        cy={c}
        rx={r * 0.88}
        ry={r}
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity="0.25"
      />
      <ellipse
        cx={c}
        cy={c - r * 0.38}
        rx={r * 0.91}
        ry={r * 0.2}
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity="0.25"
      />
      <ellipse
        cx={c}
        cy={c + r * 0.38}
        rx={r * 0.91}
        ry={r * 0.2}
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        opacity="0.25"
      />

      {/* 12 étoiles EU en cercle */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const starR = r * 0.58;
        const x = c + starR * Math.cos(angle);
        const y = c + starR * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={s * 0.12}
            fill="#FFCC00"
          >
            ★
          </text>
        );
      })}

      {/* Contour extérieur */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        opacity="0.3"
      />
    </svg>
  );
}
