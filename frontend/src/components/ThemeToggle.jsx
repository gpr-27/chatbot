import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className={`theme-toggle ${compact ? "theme-toggle--compact" : ""}`}
      onClick={toggleTheme}
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
    >
      <span className="theme-toggle__track" data-dark={isDark}>
        <span className="theme-toggle__thumb">
          {isDark ? <Moon size={13} /> : <Sun size={13} />}
        </span>
      </span>
    </button>
  );
}
