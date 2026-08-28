import { useCallback, useEffect, useState } from 'react';
import { request } from '../api';
import { AppError, toAppError } from '../errors';
import { CatalogModule } from '../types';

/**
 * The whole curriculum, in one request.
 *
 * Nothing is merged, ordered or renamed here: the response is the roadmap, in
 * the order the server sent it. That is what keeps adding a unit a backend-only
 * change — the browser never holds a list of titles to forget to update.
 *
 * A failure is the whole page failing, so it comes back as an error the caller
 * renders in place of the grid, with [reload] wired to its retry.
 */
export function useCatalog() {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setIsLoading(true);
    setError(null);
    request<CatalogModule[]>('/catalog')
      .then((loaded) => live && setModules(loaded))
      .catch((reason) => live && setError(toAppError(reason, "We couldn't load the training ground.")))
      .finally(() => live && setIsLoading(false));
    return () => {
      live = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /** Known to the catalogue, whether or not it can be practised yet. */
  const findUnit = useCallback(
    (id: string) => modules.flatMap((module) => module.units).find((unit) => unit.id === id),
    [modules],
  );

  return { modules, isLoading, error, reload, findUnit };
}

export default useCatalog;
