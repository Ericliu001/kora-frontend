import { useEffect } from 'react';

/**
 * Names the browser tab after the page on screen, and puts the previous title
 * back when that page goes away.
 *
 * The title in public/index.html is the home page's. A page that calls this
 * borrows the tab for as long as it is shown.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Onion Loop`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
