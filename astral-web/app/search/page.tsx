"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getFacets,
  searchTools,
  FacetsResponse,
  SearchResponse,
  Tool,
} from "@/lib/api";
import SmartLogo from "@/components/SmartLogo";
import AstralLogo from "@/components/AstralLogo";
import SettingsDrawer from "@/components/SettingsDrawer";
import AstralFooter from "@/components/AstralFooter";
import { useTheme } from "@/hooks/useTheme";
import styles from "./page.module.css";

/* ── helpers ── */
function hostnameFromUrl(url?: string | null): string | null {
  try {
    if (!url) return null;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
function faviconUrlFromWebsite(url?: string | null): string | null {
  const h = hostnameFromUrl(url);
  if (!h) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=128`;
}
function faviconColor(name: string): string {
  const c = [
    "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    "linear-gradient(135deg,#7c3aed,#a78bfa)",
    "linear-gradient(135deg,#0891b2,#06b6d4)",
    "linear-gradient(135deg,#059669,#34d399)",
    "linear-gradient(135deg,#dc2626,#f87171)",
    "linear-gradient(135deg,#d97706,#fbbf24)",
    "linear-gradient(135deg,#db2777,#f472b6)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function displayFacetValue(key: FacetKey, value: string) {
  if (key === "isOpenSource") return value === "true" ? "Oui" : "Non";
  return value;
}
function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

/* ── recent history ── */
const HISTORY_KEY = "astral-recent";
const HISTORY_MAX = 6;

type HistoryEntry = {
  slug: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  category?: string;
};

function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushHistory(entry: HistoryEntry) {
  try {
    const prev = getHistory().filter((e) => e.slug !== entry.slug);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([entry, ...prev].slice(0, HISTORY_MAX)),
    );
  } catch {}
}
function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}

/* ── types ── */
type FacetKey =
  | "category"
  | "gdprLevel"
  | "hostingRegion"
  | "countryCode"
  | "isOpenSource"
  | "tags";
type SortOption =
  | ""
  | "name:asc"
  | "name:desc"
  | "createdAt:asc"
  | "createdAt:desc"
  | "updatedAt:asc"
  | "updatedAt:desc";
type TabMode = "web" | "images";

const FACET_LABELS: Record<FacetKey, string> = {
  category: "Catégorie",
  gdprLevel: "RGPD",
  hostingRegion: "Hébergement",
  countryCode: "Pays",
  isOpenSource: "Open source",
  tags: "Tags",
};
const SORT_LABELS: Record<Exclude<SortOption, "">, string> = {
  "name:asc": "Nom A → Z",
  "name:desc": "Nom Z → A",
  "createdAt:desc": "Ajout récent",
  "createdAt:asc": "Ajout ancien",
  "updatedAt:desc": "MàJ récente",
  "updatedAt:asc": "MàJ ancienne",
};
const FACET_KEYS: FacetKey[] = [
  "category",
  "gdprLevel",
  "hostingRegion",
  "countryCode",
  "isOpenSource",
  "tags",
];

/* ── skeleton ── */
function SkeletonResult() {
  return (
    <div className={styles.skeletonItem}>
      <div className={styles.skeletonFav} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
        <div className={styles.skeletonLine} style={{ width: "80%" }} />
        <div className={styles.skeletonLine} style={{ width: "60%" }} />
        <div className={styles.skeletonLine} style={{ width: "30%" }} />
      </div>
    </div>
  );
}
function SkeletonList() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonResult key={i} />
      ))}
    </div>
  );
}

/* ── filter dropdown ── */
function FilterDropdown({
  facetKey,
  label,
  dist,
  selected,
  onToggle,
}: {
  facetKey: FacetKey;
  label: string;
  dist: Record<string, number>;
  selected: string[];
  onToggle: (k: FacetKey, v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const entries = Array.from(new Set([...Object.keys(dist), ...selected]))
    .map((v) => [v, dist[v] ?? 0] as const)
    .sort((a, b) => b[1] - a[1]);
  const count = selected.length;
  return (
    <div className={styles.filterDropdown} ref={ref}>
      <button
        className={`${styles.filterBtn} ${count > 0 ? styles.filterBtnActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {count > 0 && <span className={styles.filterCount}>{count}</span>}
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`${styles.filterPanel} ${open ? styles.filterPanelOpen : ""}`}
      >
        {entries.length === 0 ? (
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              padding: "4px",
            }}
          >
            Aucune valeur
          </div>
        ) : (
          entries.slice(0, 30).map(([value, cnt]) => (
            <div key={value} className={styles.filterItem}>
              <label className={styles.filterItemLabel}>
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() => onToggle(facetKey, value)}
                />
                {displayFacetValue(facetKey, value)}
              </label>
              <span className={styles.filterItemCount}>{cnt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── recent history bar ── */
function RecentBar({ onClear }: { onClear: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    setEntries(getHistory());
  }, []);
  if (entries.length === 0) return null;
  return (
    <div className={styles.recentSection}>
      <div className={styles.recentHeader}>
        <span className={styles.recentTitle}>Derniers consultés</span>
        <button
          className={styles.recentClear}
          onClick={() => {
            clearHistory();
            setEntries([]);
            onClear();
          }}
          type="button"
        >
          Effacer
        </button>
      </div>
      <div className={styles.recentLinks}>
        {entries.map((e) => (
          <Link
            key={e.slug}
            href={`/tools/${e.slug}`}
            className={styles.recentLink}
          >
            <div
              className={styles.recentLinkIcon}
              style={{ background: faviconColor(e.name) }}
            >
              <SmartLogo
                primarySrc={e.logoUrl}
                fallbackSrc={faviconUrlFromWebsite(e.websiteUrl)}
                alt={e.name}
                className={styles.recentLinkImg}
              />
            </div>
            <span className={styles.recentLinkName}>{e.name}</span>
            {e.category && (
              <span className={styles.recentLinkCat}>{e.category}</span>
            )}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ color: "var(--muted)", flexShrink: 0 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── image grid view ── */
function ImageGrid({
  hits,
  onVisit,
}: {
  hits: Tool[];
  onVisit: (t: Tool) => void;
}) {
  if (hits.length === 0)
    return <div className={styles.emptyState}>Aucune image trouvée.</div>;
  return (
    <div className={styles.imageGrid}>
      {hits.map((tool) => {
        const fallback = faviconUrlFromWebsite(tool.websiteUrl);
        return (
          <Link
            key={tool.id}
            href={`/tools/${tool.slug}`}
            className={styles.imageCard}
            onClick={() => onVisit(tool)}
          >
            <div
              className={styles.imageCardThumb}
              style={{ background: faviconColor(tool.name) }}
            >
              <SmartLogo
                primarySrc={tool.logoUrl}
                fallbackSrc={fallback}
                alt={tool.name}
                className={styles.imageCardImg}
              />
            </div>
            <div className={styles.imageCardBody}>
              <span className={styles.imageCardName}>{tool.name}</span>
              {tool.category && (
                <span className={styles.imageCardCat}>{tool.category}</span>
              )}
              {hostnameFromUrl(tool.websiteUrl) && (
                <span className={styles.imageCardDomain}>
                  {hostnameFromUrl(tool.websiteUrl)}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme, lang, applyTheme, applyLang } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>("web");

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQ] = useState(""); // ne change qu'au submit
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<SortOption>("");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [facetsError, setFacetsError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<FacetKey, string[]>>({
    category: [],
    gdprLevel: [],
    hostingRegion: [],
    countryCode: [],
    isOpenSource: [],
    tags: [],
  });

  const [recentKey, setRecentKey] = useState(0); // force re-render recent bar

  const didInitFromUrl = useRef(false);
  useEffect(() => {
    if (didInitFromUrl.current) return;
    const q = sp.get("q") ?? "";
    const off = Number(sp.get("offset") ?? "0");
    setQuery(q);
    setSearchQ(q); // init search query depuis URL
    setOffset(Number.isFinite(off) && off >= 0 ? off : 0);
    setSort((sp.get("sort") ?? "") as SortOption);
    setSelected({
      category: uniq(sp.getAll("category")),
      gdprLevel: uniq(sp.getAll("gdprLevel")),
      hostingRegion: uniq(sp.getAll("hostingRegion")),
      countryCode: uniq(sp.getAll("countryCode")).map((v) => v.toUpperCase()),
      isOpenSource: uniq(sp.getAll("isOpenSource")),
      tags: uniq(sp.getAll("tags")).map((v) => v.toLowerCase()),
    });
    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const didWriteUrl = useRef(false);
  useEffect(() => {
    if (!didInitFromUrl.current) return;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (offset > 0) params.set("offset", String(offset));
    if (sort) params.set("sort", sort);
    selected.category.forEach((v) => params.append("category", v));
    selected.gdprLevel.forEach((v) => params.append("gdprLevel", v));
    selected.hostingRegion.forEach((v) => params.append("hostingRegion", v));
    selected.countryCode.forEach((v) => params.append("countryCode", v));
    selected.isOpenSource.forEach((v) => params.append("isOpenSource", v));
    selected.tags.forEach((v) => params.append("tags", v));
    const qs = params.toString();
    const url = qs ? `/search?${qs}` : `/search`;
    if (!didWriteUrl.current) {
      didWriteUrl.current = true;
      router.replace(url);
      return;
    }
    router.replace(url);
  }, [searchQuery, offset, sort, selected, router]);

  useEffect(() => {
    setFacetsLoading(true);
    getFacets()
      .then(setFacets)
      .catch((e) => {
        console.error(e);
        setFacetsError("Impossible de charger les facettes.");
      })
      .finally(() => setFacetsLoading(false));
  }, []);

  useEffect(() => {
    if (!didInitFromUrl.current) return;
    if (!searchQuery.trim()) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params: Record<string, string | number | string[] | undefined> = {
      q: searchQuery.trim(),
      limit,
      offset,
    };
    if (sort) params.sort = sort;
    if (selected.category.length) params.category = selected.category;
    if (selected.gdprLevel.length) params.gdprLevel = selected.gdprLevel;
    if (selected.hostingRegion.length)
      params.hostingRegion = selected.hostingRegion;
    if (selected.countryCode.length) params.countryCode = selected.countryCode;
    if (selected.isOpenSource.length === 1)
      params.isOpenSource = selected.isOpenSource[0];
    if (selected.tags.length) params.tags = selected.tags;
    searchTools(params)
      .then(setData)
      .catch((e) => {
        console.error(e);
        setError("Erreur lors de la recherche.");
      })
      .finally(() => setLoading(false));
  }, [searchQuery, offset, limit, sort, selected]);

  const total = data?.estimatedTotalHits ?? 0;
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const toggleFacet = useCallback((key: FacetKey, value: string) => {
    setOffset(0);
    setSelected((prev) => {
      if (key === "isOpenSource")
        return {
          ...prev,
          isOpenSource: prev.isOpenSource.includes(value) ? [] : [value],
        };
      const s = new Set(prev[key]);
      s.has(value) ? s.delete(value) : s.add(value);
      return { ...prev, [key]: Array.from(s) };
    });
  }, []);

  const clearAll = useCallback(() => {
    setOffset(0);
    setSort("");
    setSelected({
      category: [],
      gdprLevel: [],
      hostingRegion: [],
      countryCode: [],
      isOpenSource: [],
      tags: [],
    });
  }, []);

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setOffset(0);
    setSearchQ(q);
  }

  const activeFiltersCount = FACET_KEYS.reduce(
    (acc, k) => acc + selected[k].length,
    0,
  );
  const activeFilterPills = FACET_KEYS.flatMap((key) =>
    selected[key].map((value) => ({
      key,
      value,
      label: `${FACET_LABELS[key]}: ${displayFacetValue(key, value)}`,
    })),
  );

  const dynamicDist = useMemo(() => {
    const f = data?.facetDistribution;
    return f && Object.keys(f).length > 0
      ? f
      : (facets?.facetDistribution ?? {});
  }, [data?.facetDistribution, facets?.facetDistribution]);

  function handleVisit(tool: Tool) {
    pushHistory({
      slug: tool.slug,
      name: tool.name,
      logoUrl: tool.logoUrl,
      websiteUrl: tool.websiteUrl,
      category: tool.category,
    });
    setRecentKey((k) => k + 1);
  }

  /* ══════ RENDER ══════ */
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
        <div className={styles.headerRow1}>
          <Link href="/" className={styles.logoWrap}>
            <AstralLogo size={28} />
            <span className={styles.logoText}>Astral</span>
          </Link>
          <div className={styles.headerRight}>
            {data?.source === "meili" && (
              <span className={styles.sourceBadgeMeili}>Index Meili</span>
            )}
            {data?.source === "db" && (
              <span className={styles.sourceBadgeDb}>Mode dégradé</span>
            )}
            <button
              className={`${styles.settingsBtn} ${drawerOpen ? styles.settingsBtnActive : ""}`}
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Paramètres"
            >
              <svg
                width="15"
                height="15"
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
          </div>
        </div>

        <div className={styles.headerRow2Outer}>
          <div className={styles.headerRow2}>
            <div className={styles.searchBox}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ color: "var(--muted)", flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un outil..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              {query && (
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    setOffset(0);
                    setQuery("");
                  }}
                  type="button"
                >
                  <svg
                    width="13"
                    height="13"
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
            <button
              className={styles.btnSearch}
              type="button"
              disabled={!query.trim()}
              onClick={handleSearch}
              style={
                !query.trim() ? { opacity: 0.4, cursor: "not-allowed" } : {}
              }
            >
              Rechercher
            </button>
            <nav className={styles.tabsBar}>
              <button
                className={`${styles.tab} ${tab === "web" ? styles.tabActive : ""}`}
                onClick={() => setTab("web")}
                type="button"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Web
              </button>
              <button
                className={`${styles.tab} ${tab === "images" ? styles.tabActive : ""}`}
                onClick={() => setTab("images")}
                type="button"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Images
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ── FILTERS BAR ── */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersBarInner}>
          {FACET_KEYS.map((key) => (
            <FilterDropdown
              key={key}
              facetKey={key}
              label={FACET_LABELS[key]}
              dist={dynamicDist[key] ?? {}}
              selected={selected[key]}
              onToggle={toggleFacet}
            />
          ))}
          {(activeFiltersCount > 0 || sort) && (
            <>
              <div className={styles.filterSep} />
              <button
                className={styles.clearAllBtn}
                onClick={clearAll}
                type="button"
              >
                Tout effacer
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── ACTIVE PILLS ── */}
      {activeFilterPills.length > 0 && (
        <div className={styles.activeBarOuter}>
          <div className={styles.activeBar}>
            <span className={styles.activeBarLabel}>Actifs :</span>
            {activeFilterPills.map(({ key, value, label }) => (
              <span key={`${key}:${value}`} className={styles.activePill}>
                {label}
                <button
                  className={styles.activePillRemove}
                  onClick={() => toggleFacet(key, value)}
                  type="button"
                  aria-label={`Supprimer ${label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className={styles.main}>
        {data?.source === "db" && (
          <div className={styles.errorBox}>
            ⚠ Mode dégradé — fallback base de données
          </div>
        )}
        {error && <div className={styles.errorBoxRed}>{error}</div>}

        {/* meta + tri */}
        {!loading && (
          <div className={styles.metaRow}>
            <span className={styles.metaText}>
              {total > 0
                ? `${total} résultat${total > 1 ? "s" : ""} · ${data?.processingTimeMs ?? 0}ms`
                : facetsLoading
                  ? "Chargement…"
                  : ""}
            </span>
            {tab === "web" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={styles.sortLabel}>Trier</span>
                <div className={styles.sortPill}>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: "var(--muted)" }}
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="9" y2="18" />
                  </svg>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setOffset(0);
                      setSort(e.target.value as SortOption);
                    }}
                  >
                    <option value="">Pertinence</option>
                    {(
                      Object.keys(SORT_LABELS) as Exclude<SortOption, "">[]
                    ).map((k) => (
                      <option key={k} value={k}>
                        {SORT_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <SkeletonList />
        ) : (
          <>
            {/* ── IMAGE TAB ── */}
            {tab === "images" && (
              <ImageGrid hits={data?.hits ?? []} onVisit={handleVisit} />
            )}

            {/* ── WEB TAB ── */}
            {tab === "web" && (
              <>
                {!error && data?.hits?.length === 0 && (
                  <div className={styles.emptyState}>
                    Aucun résultat trouvé.
                  </div>
                )}

                <ul className={styles.resultList}>
                  {(data?.hits ?? []).map((tool: Tool) => {
                    const hostname = hostnameFromUrl(tool.websiteUrl);
                    const fallback = faviconUrlFromWebsite(tool.websiteUrl);
                    const tags = (tool.tags ?? []).filter(Boolean);
                    return (
                      <li key={tool.id} className={styles.result}>
                        <div
                          className={styles.favicon}
                          style={{ background: faviconColor(tool.name) }}
                        >
                          <SmartLogo
                            primarySrc={tool.logoUrl}
                            fallbackSrc={fallback}
                            alt={tool.name}
                            className={styles.faviconImg}
                          />
                        </div>
                        <div className={styles.resultBody}>
                          <div className={styles.resultDomain}>
                            <span className={styles.resultDomainName}>
                              {hostname}
                            </span>
                            {tool.websiteUrl && (
                              <span className={styles.resultUrl}>
                                {tool.websiteUrl}
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/tools/${tool.slug}`}
                            className={styles.resultTitle}
                            onClick={() => handleVisit(tool)}
                          >
                            {tool.name}
                          </Link>
                          <p className={styles.resultSnippet}>
                            {tool.description}
                          </p>
                          <div className={styles.badges}>
                            {tool.countryCode && (
                              <span className={styles.badgeCountry}>
                                {tool.countryCode}
                              </span>
                            )}
                            {tool.gdprLevel === "strong" && (
                              <span className={styles.badgeRgpd}>
                                RGPD fort
                              </span>
                            )}
                            {tool.hostingRegion === "EU" && (
                              <span className={styles.badgeEu}>EU hosted</span>
                            )}
                            {tool.isOpenSource && (
                              <span className={styles.badgeOs}>
                                Open source
                              </span>
                            )}
                            {tool.category && (
                              <span className={styles.badgeCat}>
                                {tool.category}
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className={styles.tags}>
                              {tags.slice(0, 10).map((t) => (
                                <span key={t} className={styles.tag}>
                                  {t}
                                </span>
                              ))}
                              {tags.length > 10 && (
                                <span className={styles.tag}>
                                  +{tags.length - 10}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={styles.resultActions}>
                            <Link
                              href={`/tools/${tool.slug}`}
                              className={styles.btnMore}
                              onClick={() => handleVisit(tool)}
                            >
                              Voir plus
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </Link>
                            {tool.websiteUrl && (
                              <a
                                href={tool.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btnSite}
                                onClick={() => handleVisit(tool)}
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Site officiel
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* pagination */}
                {!error && total > 0 && (
                  <div className={styles.pagination}>
                    <span className={styles.paginationInfo}>
                      {total} résultat{total > 1 ? "s" : ""} — page {page} /{" "}
                      {totalPages}
                    </span>
                    <div className={styles.paginationBtns}>
                      <button
                        className={`${styles.pageBtn} ${!canPrev ? styles.pageBtnDisabled : ""}`}
                        onClick={() => canPrev && setOffset(offset - limit)}
                        disabled={!canPrev}
                        type="button"
                      >
                        ←
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }).map(
                        (_, i) => {
                          const p = i + 1;
                          return (
                            <button
                              key={p}
                              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                              onClick={() => setOffset((p - 1) * limit)}
                              type="button"
                            >
                              {p}
                            </button>
                          );
                        },
                      )}
                      <button
                        className={`${styles.pageBtn} ${styles.pageBtnNext} ${!canNext ? styles.pageBtnDisabled : ""}`}
                        onClick={() => canNext && setOffset(offset + limit)}
                        disabled={!canNext}
                        type="button"
                      >
                        Suivant
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── RECENT BAR ── */}
                <RecentBar
                  key={recentKey}
                  onClear={() => setRecentKey((k) => k + 1)}
                />
              </>
            )}
          </>
        )}
      </div>

      <AstralFooter />
    </div>
  );
}
