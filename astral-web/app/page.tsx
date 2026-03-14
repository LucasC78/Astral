"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getFacets,
  searchTools,
  FacetsResponse,
  SearchResponse,
  Tool,
} from "@/lib/api";
import SmartLogo from "@/components/SmartLogo";

function hostnameFromUrl(url?: string | null): string | null {
  try {
    if (!url) return null;
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

function faviconUrlFromWebsite(websiteUrl?: string | null): string | null {
  const host = hostnameFromUrl(websiteUrl);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    host,
  )}&sz=128`;
}

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
      {children}
    </span>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "green" | "blue";
}) {
  const styles = {
    neutral: "border-gray-200 bg-gray-50 text-gray-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function ToolBadges({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tool.hostingRegion === "EU" && <Badge tone="blue">EU hosted</Badge>}
      {tool.gdprLevel === "strong" && <Badge tone="green">GDPR strong</Badge>}
      {tool.isOpenSource && <Badge tone="neutral">Open-source</Badge>}
    </div>
  );
}

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

const FACET_LABELS: Record<FacetKey, string> = {
  category: "Catégorie",
  gdprLevel: "Niveau RGPD",
  hostingRegion: "Région d’hébergement",
  countryCode: "Pays",
  isOpenSource: "Open-source",
  tags: "Tags",
};

const SORT_LABELS: Record<Exclude<SortOption, "">, string> = {
  "name:asc": "Nom A → Z",
  "name:desc": "Nom Z → A",
  "createdAt:desc": "Ajout récent",
  "createdAt:asc": "Ajout ancien",
  "updatedAt:desc": "Mise à jour récente",
  "updatedAt:asc": "Mise à jour ancienne",
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function displayFacetValue(key: FacetKey, value: string) {
  if (key === "isOpenSource") {
    return value === "true" ? "Oui" : "Non";
  }

  return value;
}

export default function HomePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
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

  const didInitFromUrl = useRef(false);

  useEffect(() => {
    if (didInitFromUrl.current) return;

    const q = sp.get("q") ?? "";
    const off = Number(sp.get("offset") ?? "0");
    const safeOffset = Number.isFinite(off) && off >= 0 ? off : 0;
    const sortParam = (sp.get("sort") ?? "") as SortOption;

    const category = uniq(sp.getAll("category"));
    const gdprLevel = uniq(sp.getAll("gdprLevel"));
    const hostingRegion = uniq(sp.getAll("hostingRegion"));
    const countryCode = uniq(sp.getAll("countryCode")).map((v) =>
      v.toUpperCase(),
    );
    const isOpenSource = uniq(sp.getAll("isOpenSource"));
    const tags = uniq(sp.getAll("tags")).map((v) => v.toLowerCase());

    setQuery(q);
    setOffset(safeOffset);
    setSort(sortParam);
    setSelected({
      category,
      gdprLevel,
      hostingRegion,
      countryCode,
      isOpenSource,
      tags,
    });

    didInitFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const didWriteUrlOnce = useRef(false);

  useEffect(() => {
    if (!didInitFromUrl.current) return;

    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (offset > 0) params.set("offset", String(offset));
    if (sort) params.set("sort", sort);

    selected.category.forEach((v) => params.append("category", v));
    selected.gdprLevel.forEach((v) => params.append("gdprLevel", v));
    selected.hostingRegion.forEach((v) => params.append("hostingRegion", v));
    selected.countryCode.forEach((v) => params.append("countryCode", v));
    selected.isOpenSource.forEach((v) => params.append("isOpenSource", v));
    selected.tags.forEach((v) => params.append("tags", v));

    const qs = params.toString();
    const nextUrl = qs ? `/?${qs}` : `/`;

    if (!didWriteUrlOnce.current) {
      didWriteUrlOnce.current = true;
      router.replace(nextUrl);
      return;
    }

    router.replace(nextUrl);
  }, [query, offset, sort, selected, router]);

  useEffect(() => {
    setFacetsLoading(true);
    setFacetsError(null);

    getFacets()
      .then(setFacets)
      .catch((err) => {
        console.error(err);
        setFacetsError("Impossible de charger les facettes.");
      })
      .finally(() => setFacetsLoading(false));
  }, []);

  useEffect(() => {
    if (!didInitFromUrl.current) return;

    setLoading(true);
    setError(null);

    const params: Record<string, string | number | string[] | undefined> = {
      q: debouncedQuery || "",
      limit,
      offset,
    };

    if (sort) params.sort = sort;
    if (selected.category.length) params.category = selected.category;
    if (selected.gdprLevel.length) params.gdprLevel = selected.gdprLevel;
    if (selected.hostingRegion.length)
      params.hostingRegion = selected.hostingRegion;
    if (selected.countryCode.length) params.countryCode = selected.countryCode;
    if (selected.isOpenSource.length === 1) {
      params.isOpenSource = selected.isOpenSource[0];
    }
    if (selected.tags.length) params.tags = selected.tags;

    searchTools(params)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("Erreur lors de la recherche.");
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, offset, limit, sort, selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const total = data?.estimatedTotalHits ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  function toggleFacet(key: FacetKey, value: string) {
    setOffset(0);

    setSelected((prev) => {
      if (key === "isOpenSource") {
        return {
          ...prev,
          isOpenSource: prev.isOpenSource.includes(value) ? [] : [value],
        };
      }

      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);

      return { ...prev, [key]: Array.from(set) };
    });
  }

  function clearAll() {
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
  }

  const activeFiltersCount =
    selected.category.length +
    selected.gdprLevel.length +
    selected.hostingRegion.length +
    selected.countryCode.length +
    selected.isOpenSource.length +
    selected.tags.length;

  const dynamicFacetDistribution = useMemo(() => {
    const fromSearch = data?.facetDistribution;
    const hasSearchFacets = fromSearch && Object.keys(fromSearch).length > 0;
    return hasSearchFacets ? fromSearch : (facets?.facetDistribution ?? {});
  }, [data?.facetDistribution, facets?.facetDistribution]);

  function renderFacet(key: FacetKey) {
    const dist = dynamicFacetDistribution[key] ?? {};
    const selectedValues = selected[key] ?? [];
    const mergedKeys = new Set<string>([
      ...Object.keys(dist),
      ...selectedValues,
    ]);

    const entries = Array.from(mergedKeys)
      .map((value) => [value, dist[value] ?? 0] as const)
      .sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{FACET_LABELS[key]}</h3>
          {selected[key].length > 0 ? (
            <button
              className="text-xs underline text-gray-500 hover:text-gray-700"
              onClick={() => {
                setOffset(0);
                setSelected((prev) => ({ ...prev, [key]: [] }));
              }}
              type="button"
            >
              Effacer
            </button>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <div className="text-xs text-gray-500">Aucune valeur</div>
        ) : (
          <ul className="space-y-1">
            {entries.slice(0, 30).map(([value, count]) => {
              const checked = selected[key].includes(value);

              return (
                <li key={`${key}:${value}`}>
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFacet(key, value)}
                      />
                      <span className="text-gray-700">
                        {displayFacetValue(key, value)}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Astral</h1>
            <p className="text-sm text-gray-500">
              Recherche d’outils européens RGPD-friendly.
            </p>
          </div>

          {data?.source === "db" ? (
            <span className="shrink-0 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800">
              Mode dégradé (DB)
            </span>
          ) : data?.source === "meili" ? (
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              Index Meili
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="w-full rounded-md border px-3 py-2"
          value={query}
          onChange={(e) => {
            setOffset(0);
            setQuery(e.target.value);
          }}
          placeholder="Rechercher un outil..."
        />

        <select
          value={sort}
          onChange={(e) => {
            setOffset(0);
            setSort(e.target.value as SortOption);
          }}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Tri par défaut</option>
          <option value="name:asc">{SORT_LABELS["name:asc"]}</option>
          <option value="name:desc">{SORT_LABELS["name:desc"]}</option>
          <option value="createdAt:desc">
            {SORT_LABELS["createdAt:desc"]}
          </option>
          <option value="createdAt:asc">{SORT_LABELS["createdAt:asc"]}</option>
          <option value="updatedAt:desc">
            {SORT_LABELS["updatedAt:desc"]}
          </option>
          <option value="updatedAt:asc">{SORT_LABELS["updatedAt:asc"]}</option>
        </select>
      </div>

      {data?.source === "db" && (
        <div className="rounded-md border p-3 text-sm bg-yellow-50 text-yellow-700">
          ⚠️ Mode dégradé (fallback base de données)
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filtres</h2>
              <div className="flex items-center gap-3">
                {sort ? (
                  <span className="text-xs text-gray-500">
                    {SORT_LABELS[sort as Exclude<SortOption, "">]}
                  </span>
                ) : null}

                {activeFiltersCount > 0 || sort ? (
                  <button
                    type="button"
                    className="text-xs underline text-gray-500 hover:text-gray-700"
                    onClick={clearAll}
                  >
                    Tout effacer
                  </button>
                ) : null}
              </div>
            </div>

            {facetsLoading &&
            (!data?.facetDistribution ||
              Object.keys(data.facetDistribution).length === 0) ? (
              <div className="text-sm text-gray-500">
                Chargement des facettes…
              </div>
            ) : facetsError &&
              (!data?.facetDistribution ||
                Object.keys(data.facetDistribution).length === 0) ? (
              <div className="text-sm text-red-700">{facetsError}</div>
            ) : (
              <div className="space-y-6">
                {renderFacet("category")}
                {renderFacet("gdprLevel")}
                {renderFacet("hostingRegion")}
                {renderFacet("countryCode")}
                {renderFacet("isOpenSource")}
                {renderFacet("tags")}
              </div>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          {loading && (
            <div className="text-sm text-gray-500">Chargement...</div>
          )}

          {!loading && !error && data?.hits?.length === 0 && (
            <div className="text-sm text-gray-500">Aucun résultat trouvé.</div>
          )}

          <ul className="space-y-4">
            {(data?.hits ?? []).map((tool: Tool) => {
              const fallback = faviconUrlFromWebsite(tool.websiteUrl);
              const tags = (tool.tags ?? []).filter(Boolean);

              return (
                <li key={tool.id} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-gray-50">
                      <SmartLogo
                        primarySrc={tool.logoUrl}
                        fallbackSrc={fallback}
                        alt={`${tool.name} logo`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="font-semibold hover:underline"
                      >
                        {tool.name}
                      </Link>

                      <p className="text-sm text-gray-600">
                        {tool.description}
                      </p>

                      <ToolBadges tool={tool} />

                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.slice(0, 10).map((t) => (
                            <Tag key={t}>{t}</Tag>
                          ))}
                          {tags.length > 10 ? (
                            <Tag>{`+${tags.length - 10}`}</Tag>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>{tool.countryCode}</span>
                        <span>•</span>
                        <span>{tool.category}</span>
                        <span>•</span>
                        <span>RGPD: {tool.gdprLevel}</span>
                        <span>•</span>
                        <span>{tool.hostingRegion}</span>
                        <span>•</span>
                        <span>
                          Open-source: {tool.isOpenSource ? "Oui" : "Non"}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {!loading && !error && total > 0 && (
            <div className="flex justify-between items-center pt-4 text-sm">
              <div>
                {total} résultat(s) — page {page}
              </div>

              <div className="flex gap-2">
                <button
                  disabled={!canPrev}
                  onClick={() => setOffset(offset - limit)}
                  className="rounded-md border px-3 py-2 disabled:opacity-50"
                >
                  ←
                </button>

                <button
                  disabled={!canNext}
                  onClick={() => setOffset(offset + limit)}
                  className="rounded-md border px-3 py-2 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
