/**
 * One typed HTTP helper for the whole app.
 *
 * `<T>` is a promise to the compiler, not a runtime check: nothing here inspects
 * the response shape. If the backend changes its JSON, this still compiles and
 * fails later, in the component that reads a missing field.
 *
 * What this file does guarantee is that every failure leaves here as one of two
 * known types. A raw `TypeError: Failed to fetch` must never reach a person.
 */
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

/** Requests that wait on a model get a long leash; everything else should be quick. */
const SLOW_PATHS = ['/reflections', '/transcribe'];
const TIMEOUT_MS = 10_000;
const SLOW_TIMEOUT_MS = 45_000;

/** The server answered, and said no. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    /** The server's own words, kept off-screen when they are not fit to show. */
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The server never answered. */
export class NetworkError extends Error {
  constructor(
    readonly kind: 'offline' | 'timeout',
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Not every runtime has it, and a missing timeout is better than a crash. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  const factory = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  return typeof factory === 'function' ? factory(ms) : undefined;
}

function aborted(reason: unknown): boolean {
  const name = (reason as { name?: string } | null)?.name;
  return name === 'AbortError' || name === 'TimeoutError';
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ms = SLOW_PATHS.some((slow) => path.endsWith(slow)) ? SLOW_TIMEOUT_MS : TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: timeoutSignal(ms),
      ...options,
      headers:
        options.body instanceof FormData
          ? options.headers
          : { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : String(reason);
    // fetch rejects for exactly two reasons we care about: we gave up waiting,
    // or the request never left the building.
    throw aborted(reason)
      ? new NetworkError('timeout', 'The server took too long to answer.', detail)
      : new NetworkError('offline', 'Could not reach the server.', detail);
  }

  let body: unknown = null;
  let parsed = true;
  try {
    body = await response.json();
  } catch {
    parsed = false;
  }

  const status = typeof response.status === 'number' ? response.status : 500;

  if (!response.ok) {
    const { error, code } = (body ?? {}) as { error?: string; code?: string };
    throw new ApiError(status, code, error || 'Something went wrong.', error);
  }

  // A 2xx we cannot read is a server problem, not an empty object to be
  // discovered three components later as a missing field.
  if (!parsed) {
    throw new ApiError(status, 'INVALID_BODY', 'The server sent something we could not read.');
  }

  return body as T;
}
