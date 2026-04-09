import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE, Tool } from "@/lib/api";
import SmartLogo from "@/components/SmartLogo";
import AstralLogo from "@/components/AstralLogo";
import AstralFooter from "@/components/AstralFooter";
import styles from "./page.module.css";

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

async function getTool(slug: string): Promise<Tool> {
  const res = await fetch(`${API_BASE}/tools/${slug}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error("Failed to load tool");
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
  const hostname = hostnameFromUrl(tool.websiteUrl);
  const fallback = faviconUrlFromWebsite(tool.websiteUrl);

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoWrap}>
          <AstralLogo size={28} />
          <span className={styles.logoText}>Astral</span>
        </Link>
        <div className={styles.headerRight}>
          <Link href="/search" className={styles.backBtn}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.hero}>
          <div
            className={styles.logoBox}
            style={{ background: faviconColor(tool.name) }}
          >
            <SmartLogo
              primarySrc={tool.logoUrl}
              fallbackSrc={fallback}
              alt={tool.name + " logo"}
              className={styles.logoImg}
            />
          </div>
          <div className={styles.heroBody}>
            <h1 className={styles.toolName}>{tool.name}</h1>
            {hostname && (
              <div className={styles.domain}>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {hostname}
              </div>
            )}
            <div className={styles.badges}>
              {tool.countryCode && (
                <span className={styles.badgeCountry}>{tool.countryCode}</span>
              )}
              {tool.category && (
                <span className={styles.badgeCat}>{tool.category}</span>
              )}
              {tool.gdprLevel === "strong" && (
                <span className={styles.badgeRgpd}>RGPD fort</span>
              )}
              {tool.hostingRegion === "EU" && (
                <span className={styles.badgeEu}>EU hosted</span>
              )}
              {tool.isOpenSource && (
                <span className={styles.badgeOs}>Open source</span>
              )}
            </div>
            <div className={styles.cta}>
              {tool.websiteUrl && (
                <a
                  href={tool.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnPrimary}
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
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Visiter le site
                </a>
              )}
              <Link href="/search" className={styles.btnSecondary}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Explorer
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.grid}>
          <div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Description</h2>
              <p className={styles.description}>{tool.description}</p>
            </div>
            {tags.length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Tags</h2>
                <div className={styles.tags}>
                  {tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Informations</div>
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Pays</span>
                <span className={styles.metaValue}>{tool.countryCode}</span>
              </div>
              <div className={styles.metaDivider} />
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Catégorie</span>
                <span className={styles.metaValue}>{tool.category}</span>
              </div>
              <div className={styles.metaDivider} />
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Hébergement</span>
                <span className={styles.metaValue}>{tool.hostingRegion}</span>
              </div>
              <div className={styles.metaDivider} />
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Niveau RGPD</span>
                <span className={styles.metaValue}>{tool.gdprLevel}</span>
              </div>
              <div className={styles.metaDivider} />
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Open source</span>
                <span className={styles.metaValue}>
                  {tool.isOpenSource ? "Oui" : "Non"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AstralFooter />
    </div>
  );
}
