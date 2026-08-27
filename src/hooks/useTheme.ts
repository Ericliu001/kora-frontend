import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** What the OS is asking for, when the visitor has not asked for anything. */
function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    // Private mode, or a browser with site data switched off. Not worth failing over.
    return null;
  }
}

/**
 * Light/dark for the whole app, ported from the Onion Loop site's script.js so
 * both surfaces honour the same stored preference under the same key.
 *
 * The initial value has usually already been applied to <html> by the inline
 * script in index.html — this reads it back rather than deciding again, so the
 * pre-paint choice and React's first render always agree.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Follow the OS only while the visitor has not made an explicit choice.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;

    const onChange = (event: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(event.matches ? 'dark' : 'light');
    };

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // The theme still applies for this page view; it just won't be remembered.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

export default useTheme;
