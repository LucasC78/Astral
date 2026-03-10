export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export type Tool = {
  id: number;
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  countryCode: string;
  category: string;
  hostingRegion: string;
  gdprLevel: string;
  isOpenSource: boolean;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string | null;
  tags?: string[];
};

export type FacetsResponse = {
  index: string;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, any>;
};

export type SearchResponse = {
  hits: Tool[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, any>;
  source?: "meili" | "db";
  degraded?: boolean;
};

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API error ${res.status} on ${path} — ${text || "no body"}`,
    );
  }

  return res.json();
}

type SearchParams = Record<string, string | number | string[] | undefined>;

export async function searchTools(params: SearchParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, String(v)));
      return;
    }

    query.append(key, String(value));
  });

  return apiGet<SearchResponse>(`/search?${query.toString()}`);
}

export async function getFacets() {
  return apiGet<FacetsResponse>("/facets/tools");
}
