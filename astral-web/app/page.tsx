"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AstralLogo from "@/components/AstralLogo";
import GlobeIcon from "@/components/GlobeIcon";
import SettingsDrawer from "@/components/SettingsDrawer";
import AstralFooter from "@/components/AstralFooter";
import { useTheme } from "@/hooks/useTheme";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const { theme, lang, applyTheme, applyLang } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={styles.pageWrapper}>
      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        onThemeChange={applyTheme}
        lang={lang}
        onLangChange={applyLang}
      />

      {/* ── HEADER ── */}
      <header className={styles.header}>
        <a href="/" className={styles.logoWrap}>
          <AstralLogo size={32} />
          <span className={styles.logoText}>Astral</span>
        </a>

        <button
          className={`${styles.settingsBtn} ${drawerOpen ? styles.settingsBtnActive : ""}`}
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label="Paramètres"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* ── MAIN ── */}
      <main className={styles.main}>
        {/* Globe animé */}
        <div className={`${styles.globeWrap} animate-fade-up`}>
          <GlobeIcon size={40} />
        </div>

        {/* Hero */}
        <div className={`${styles.hero} animate-fade-up-1`}>
          <h1>Astral</h1>
          <p>Le moteur de recherche européen qui respecte votre vie privée</p>
        </div>

        {/* Search */}
        <div className={`${styles.searchWrap} animate-fade-up-2`}>
          <form onSubmit={handleSearch}>
            <div className={styles.searchBar}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ flexShrink: 0, color: "var(--muted)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Rechercher sur le web…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setQuery("")}
                  aria-label="Effacer"
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
              )}
            </div>
          </form>
        </div>

        {/* Features */}
        <div className={`${styles.features} animate-fade-up-3`}>
          <div className={styles.feature}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className={styles.featureText}>
              <h3>Vie privée garantie</h3>
              <p>Vos données ne sont jamais collectées. Conforme RGPD.</p>
            </div>
          </div>

          <div className={styles.dividerV} />

          <div className={styles.feature}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div className={styles.featureText}>
              <h3>Aucun tracking</h3>
              <p>Pas de cookies publicitaires. Recherchez en liberté.</p>
            </div>
          </div>

          <div className={styles.dividerV} />

          <div className={styles.feature}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className={styles.featureText}>
              <h3>Hébergé en Europe</h3>
              <p>Serveurs en Europe. Juridiction européenne.</p>
            </div>
          </div>
        </div>
      </main>

      <AstralFooter />
    </div>
  );
}
