// The Groqbot velocity mark — a coral→amber spark/bolt.
export default function BrandSpark({ size = 32, glow = false, className = "" }) {
  return (
    <span
      className={`brand-spark ${glow ? "brand-spark--glow" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="bsg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff5d3b" />
            <stop offset="0.55" stopColor="#ff8a3d" />
            <stop offset="1" stopColor="#ffb347" />
          </linearGradient>
        </defs>
        <path
          d="M35 11 L19 36 H31 L28.5 53 L46 27 H33.5 L35 11 Z"
          fill="url(#bsg)"
        />
      </svg>
    </span>
  );
}
