const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

/**
 * One typed HTTP helper for the whole app.
 *
 * `<T>` is a promise to the compiler, not a runtime check: nothing here inspects
 * the response shape. If the backend changes its JSON, this still compiles and
 * fails later, in the component that reads a missing field.
 */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error || 'Something went wrong. Please try again.');
  }
  return body as T;
}
