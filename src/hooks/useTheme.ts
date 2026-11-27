import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

export interface ThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "banestes-theme";

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

/**
 * Gerencia o tema claro/escuro com tema claro (`"light"`) como padrão inicial
 * e persistência da escolha do usuário em `localStorage`.
 * Sincroniza `data-theme` no `<html>` e `<meta name="color-scheme">` sem estilos
 * inline, permitindo que `@media print` preserve sempre o tema claro na impressão.
 */
export function useTheme(): ThemeResult {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="color-scheme"]',
    );
    if (meta) {
      meta.content = theme;
    }
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }
      setTheme(
        event.newValue === "light" || event.newValue === "dark"
          ? event.newValue
          : "light",
      );
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const nextTheme: Theme = prevTheme === "dark" ? "light" : "dark";
      writeStoredTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  return { theme, toggleTheme };
}
