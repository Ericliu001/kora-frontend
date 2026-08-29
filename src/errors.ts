import { ApiError, NetworkError } from './api';

export type ErrorKind =
  /** The request never left the building. */
  | 'offline'
  /** We gave up waiting. */
  | 'timeout'
  /** There is no such thing. */
  | 'notFound'
  /** There is such a thing, but not in a state this request can use. */
  | 'conflict'
  /** The server read the request and declined it, in words worth showing. */
  | 'rejected'
  /** Our fault. Whatever the server said about it is not for a person to read. */
  | 'server'
  /** This browser cannot do it. */
  | 'unsupported'
  /** This browser could, and was told not to. */
  | 'permission';

export interface AppError {
  kind: ErrorKind;
  /** The server's stable code, when it sent one. Branch on this, never on prose. */
  code?: string;
  /** What a person reads. */
  message: string;
  /** Technical detail, for the console. Never rendered. */
  detail?: string;
  /** Offered beside the message when the same action could work a second time. */
  action?: { label: string; run: () => void };
}

/** Worth offering a retry: nothing about the request itself was wrong. */
export function isRetryable(error: AppError): boolean {
  return error.kind === 'offline' || error.kind === 'timeout' || error.kind === 'server';
}

/** Takes over the page, because there is nothing else on it worth showing. */
export function isPageLevel(error: AppError): boolean {
  return error.kind === 'notFound' || error.kind === 'conflict';
}

/**
 * Every failure in the app becomes one of these.
 *
 * The copy lives here rather than at the call sites so that the same failure
 * reads the same way wherever it happens.
 */
export function toAppError(reason: unknown, fallback = 'Something went wrong.'): AppError {
  if (reason instanceof NetworkError) {
    return reason.kind === 'timeout'
      ? {
          kind: 'timeout',
          message: "That's taking longer than it should.",
          detail: reason.detail,
        }
      : {
          kind: 'offline',
          message: "We couldn't reach the server. Check your connection and try again.",
          detail: reason.detail,
        };
  }

  if (reason instanceof ApiError) {
    if (reason.status >= 500) {
      // Deliberately not the server's message: at this status it can be a stack
      // detail, and this is the one string a person actually reads.
      return {
        kind: 'server',
        code: reason.code,
        message: 'Something went wrong on our side. Nothing you typed was lost.',
        detail: reason.detail,
      };
    }
    if (reason.status === 404) {
      return { kind: 'notFound', code: reason.code, message: reason.message };
    }
    if (reason.status === 409) {
      return { kind: 'conflict', code: reason.code, message: reason.message };
    }
    // A 4xx with something to say. The server's words are the whole point —
    // it knows what was wrong with the request and we do not.
    return { kind: 'rejected', code: reason.code, message: reason.message };
  }

  return {
    kind: 'server',
    message: fallback,
    detail: reason instanceof Error ? reason.message : String(reason),
  };
}

export const VOICE_UNSUPPORTED: AppError = {
  kind: 'unsupported',
  message: "This browser can't record audio — you can still type your reply.",
};

export const VOICE_DENIED: AppError = {
  kind: 'permission',
  message: 'Microphone access was blocked. You can still type your reply.',
};
