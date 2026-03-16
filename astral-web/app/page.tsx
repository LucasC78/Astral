"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import AstralLogo from "@/components/AstralLogo";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-6 mb-10">
        <AstralLogo size={120} />
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Astral</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Outils européens · RGPD-friendly
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full max-w-xl space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un outil..."
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-2 text-sm transition-colors"
          >
            Rechercher
          </button>
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-5 py-2 text-sm transition-colors"
          >
            Explorer le catalogue
          </button>
        </div>
      </form>

      {/* Footer discret */}
      <p className="absolute bottom-6 text-xs text-gray-400 dark:text-gray-600">
        Propulsé par des données 100% européennes
      </p>
    </main>
  );
}
