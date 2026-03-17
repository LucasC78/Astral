"use client";

import { useEffect } from "react";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (val: string) => void;
  lang: string;
  onLangChange: (val: string) => void;
}

export default function SettingsDrawer({
  open,
  onClose,
  theme,
  onThemeChange,
  lang,
  onLangChange,
}: SettingsDrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const themes = [
    { val: "system", label: "Natif", previewClass: "preview-native" },
    { val: "dark", label: "Sombre", previewClass: "preview-dark" },
    { val: "light", label: "Clair", previewClass: "preview-light" },
  ];

  const langs = [
    { val: "fr", flag: "🇫🇷", label: "Français" },
    { val: "en", flag: "🇬🇧", label: "English" },
  ];

  return (
    <>
      <div
        className={`drawer-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Paramètres"
      >
        <div className="drawer-header">
          <div className="drawer-title">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Paramètres
          </div>
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {/* Apparence */}
          <div>
            <div className="section-label">Apparence</div>
            <div className="appearance-cards">
              {themes.map((t) => (
                <div
                  key={t.val}
                  className={`appear-card ${theme === t.val ? "selected" : ""}`}
                  onClick={() => onThemeChange(t.val)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onThemeChange(t.val)}
                >
                  <div className={`card-preview ${t.previewClass}`} />
                  <span className="card-name">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Langue */}
          <div>
            <div className="section-label">
              Langue
              <span className="badge-soon">Bientôt</span>
            </div>
            <div className="lang-options">
              {langs.map((l) => (
                <button
                  key={l.val}
                  className={`lang-btn ${lang === l.val ? "selected" : ""}`}
                  onClick={() => onLangChange(l.val)}
                >
                  <span className="lang-flag">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
