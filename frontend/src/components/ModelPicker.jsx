import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";

export default function ModelPicker({ models, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Outside-click + Escape to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Move focus into the active option when the menu opens.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const active =
      menuRef.current.querySelector(".model-option.active") ||
      menuRef.current.querySelector(".model-option");
    active?.focus();
  }, [open]);

  if (!models || models.length === 0) return null;
  const active = models.find((m) => m.id === value) || models[0];

  const onMenuKeyDown = (e) => {
    const opts = Array.from(menuRef.current?.querySelectorAll(".model-option") || []);
    const idx = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      opts[Math.min(idx + 1, opts.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      opts[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      opts[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      opts[opts.length - 1]?.focus();
    }
  };

  return (
    <div className="model-picker" ref={ref}>
      <button
        ref={triggerRef}
        className="model-picker__btn"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Choose model"
      >
        <Cpu size={15} className="model-picker__cpu" />
        <span className="model-picker__name">{active.name}</span>
        <ChevronDown size={15} className={`model-picker__chev ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="model-picker__menu" role="listbox" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <div className="model-picker__head">Choose a model</div>
          {models.map((m) => (
            <button
              key={m.id}
              className={`model-option ${m.id === value ? "active" : ""}`}
              role="option"
              aria-selected={m.id === value}
              onClick={() => {
                onChange(m.id);
                close(true);
              }}
            >
              <span className="model-option__main">
                <span className="model-option__name">
                  {m.name}
                  {m.tag && <span className="model-option__tag">{m.tag}</span>}
                </span>
                {m.description && (
                  <span className="model-option__desc">{m.description}</span>
                )}
              </span>
              {m.id === value && <Check size={16} className="model-option__check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
