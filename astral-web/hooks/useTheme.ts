"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<string>("dark");
  const [lang, setLang] = useState<string>("fr");

  useEffect(() => {
    const savedTheme = localStorage.getItem("astral-theme") || "dark";
    const savedLang = localStorage.getItem("astral-lang") || "fr";
    applyTheme(savedTheme);
    setLang(savedLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = useCallback((val: string) => {
    let resolved = val;
    if (val === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    document.documentElement.setAttribute("data-theme", resolved);
    setTheme(val);
    localStorage.setItem("astral-theme", val);
  }, []);

  const applyLang = useCallback((val: string) => {
    setLang(val);
    localStorage.setItem("astral-lang", val);
  }, []);

  return { theme, lang, applyTheme, applyLang };
}
