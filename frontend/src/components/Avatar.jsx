// Initials avatar with a deterministic warm tint derived from the name.
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 34 }) {
  const label = initials(name);
  // Hue derived from name for subtle per-user variation, kept in a warm range.
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  const hue = 18 + (hash % 36); // 18–54° → coral/amber band

  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 92% 60%), hsl(${hue + 18} 90% 55%))`,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
