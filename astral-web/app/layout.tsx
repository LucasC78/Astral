import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astral — Moteur de recherche européen",
  description:
    "Le moteur de recherche européen qui respecte votre vie privée. Catalogue d'outils RGPD-friendly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash : applique le thème sauvegardé avant le premier paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('astral-theme') || 'dark';
                  var resolved = t;
                  if (t === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
