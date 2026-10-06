import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';
import { AppError, toAppError } from '../errors';
import { CatalogPage, ModuleInfo, UnitSummary } from '../types';

/**
 * The curriculum, a page at a time.
 *
 * The first page is asked for when the app starts; each one after it is asked
 * for by [loadMore], with the cursor the last page handed over. Pages are only
 * ever appended, in the order the server sent them, so the list here is always
 * the start of the roadmap and never a rearrangement of it. How long a page is,
 * the server decides — this hook never counts.
 *
 * Nothing is merged or renamed either: adding a unit stays a backend-only
 * change, because the browser holds no list of titles to forget to update.
 *
 * Two kinds of failure, answered differently. The first page failing is the
 * whole page failing, so it comes back as [error], rendered in place of the
 * grid with [reload] as its retry. A later page failing costs nothing already
 * on screen, so it comes back as [moreError], shown beside the button that
 * asked for it.
 */
export function useCatalog() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [units, setUnits] = useState<UnitSummary[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<AppError | null>(null);
  // How many units the latest "more" brought, so the page can say so out loud.
  const [arrived, setArrived] = useState(0);
  // State would be a render late for this: two clicks in one tick must still
  // be one request.
  const inFlight = useRef(false);

  useEffect(() => {
    let live = true;
    setIsLoading(true);
    setError(null);
    request<CatalogPage>('/units')
      .then((page) => {
        if (!live) return;
        setModules(page.modules ?? []);
        setUnits(page.units);
        setNext(page.next ?? null);
        setTotal(page.total);
        setArrived(0);
        setMoreError(null);
      })
      .catch((reason) => live && setError(toAppError(reason, "We couldn't load the training ground.")))
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const loadMore = useCallback(async () => {
    if (!next || inFlight.current) return;
    inFlight.current = true;
    setIsLoadingMore(true);
    setMoreError(null);
    try {
      const page = await request<CatalogPage>(`/units?after=${encodeURIComponent(next)}`);
      setUnits((loaded) => [...loaded, ...page.units]);
      setNext(page.next ?? null);
      setTotal(page.total);
      setArrived(page.units.length);
    } catch (reason) {
      setMoreError(toAppError(reason, "We couldn't load more units."));
    } finally {
      inFlight.current = false;
      setIsLoadingMore(false);
    }
  }, [next]);

  return {
    modules,
    units,
    /** Units the curriculum has that are not on the page yet. */
    remaining: Math.max(total - units.length, 0),
    hasMore: next !== null,
    isLoading,
    error,
    reload,
    isLoadingMore,
    moreError,
    arrived,
    loadMore,
  };
}

export default useCatalog;
