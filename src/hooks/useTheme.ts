import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export interface ThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "banestes-theme";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Armazenamento bloqueado (ex.: modo privado estrito): mantém o tema apenas na sessão.
  }
}

function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_MEDIA_QUERY).matches
  ) {
    return "dark";
  }
  return "light";
}

/**
 * Gerencia o tema claro/escuro com prioridade para a preferência salva em `localStorage`
 * e fallback reativo para `prefers-color-scheme` do sistema operacional.
 * Sincroniza `data-theme` no `<html>` e `<meta name="color-scheme">` sem sobrescrever
 * estilos inline, permitindo que `@media print` preserve o tema claro na impressão.
 */
export function useTheme(): ThemeResult {
  const [storedTheme, setStoredTheme] = useState<Theme | null>(readStoredTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  const theme: Theme = storedTheme ?? systemTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]',
    );
    if (meta) {
      meta.content = storedTheme ?? "light dark";
    }
  }, [theme, storedTheme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }
      setStoredTheme(
        event.newValue === "light" || event.newValue === "dark"
          ? event.newValue
          : null,
      );
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    writeStoredTheme(nextTheme);
    setStoredTheme(nextTheme);
  }, [theme]);

  return { theme, toggleTheme };
}
