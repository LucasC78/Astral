import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE, Tool } from "@/lib/api";
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

async function getTool(slug: string): Promise<Tool> {
  const res = await fetch(`${API_BASE}/tools/${slug}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error("Failed to load tool");
  }

  return res.json();
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tool = await getTool(slug);
  const tags = (tool.tags ?? []).filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <Link href="/" className="text-sm underline">
        ← Retour
      </Link>

      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-50">
          <SmartLogo
            primarySrc={tool.logoUrl}
            fallbackSrc={faviconUrlFromWebsite(tool.websiteUrl)}
            alt={`${tool.name} logo`}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{tool.name}</h1>

          <ToolBadges tool={tool} />

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{tool.countryCode}</span>
            <span>•</span>
            <span>{tool.category}</span>
            <span>•</span>
            <span>RGPD: {tool.gdprLevel}</span>
            <span>•</span>
            <span>Hébergement: {tool.hostingRegion}</span>
            <span>•</span>
            <span>Open-source: {tool.isOpenSource ? "Oui" : "Non"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Description</h2>
        <p className="text-gray-700">{tool.description}</p>
      </div>

      {tags.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4">
        <a
          href={tool.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Visiter le site
        </a>
      </div>
    </main>
  );
}
