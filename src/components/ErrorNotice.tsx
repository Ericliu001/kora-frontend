import React, { useEffect, useRef } from 'react';
import { AppError, isRetryable } from '../errors';

/**
 * Every error a person sees, in three shapes.
 *
 * - `banner` sits above the page: something failed, the page is still usable.
 * - `inline` sits beside the control that failed: fixing the input is the fix.
 * - `page` replaces the content: there is nothing else worth showing.
 *
 * Only the first two are alerts. A page-level error announced as an alert would
 * read the whole panel aloud over whatever the person was doing; it takes focus
 * instead, so a screen reader lands on it and reads it as a heading.
 */
export default function ErrorNotice({
  error,
  variant,
  onDismiss,
  children,
}: {
  error: AppError;
  variant: 'banner' | 'inline' | 'page';
  onDismiss?: () => void;
  /** A way out of a page-level error: a link back, or on to the recap. */
  children?: React.ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (variant === 'page') heading.current?.focus();
  }, [variant, error.message]);

  useEffect(() => {
    if (error.detail) console.warn(`[${error.kind}] ${error.message}`, error.detail);
  }, [error]);

  if (variant === 'page') {
    return (
      <section className="error-page">
        <h1 className="error-page-title" tabIndex={-1} ref={heading}>
          {error.message}
        </h1>
        <div className="error-page-actions">
          {children}
          {error.action && (
            <button className="primary-button" onClick={error.action.run}>
              {error.action.label}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className={variant === 'banner' ? 'error-banner' : 'error-inline'} role="alert">
      <span className="error-text">{error.message}</span>
      {error.action && isRetryable(error) && (
        <button className="error-action" onClick={error.action.run}>
          {error.action.label}
        </button>
      )}
      {variant === 'banner' && onDismiss && (
        <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
