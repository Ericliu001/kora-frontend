import React from 'react';
import { WAITLIST_FORM_URL, WAITLIST_OFFER } from '../waitlist';

/**
 * "Join the waitlist", and what joining gets you.
 *
 * A link, not a button: it takes you to another page (the Google Form). It
 * opens in a new tab so nobody loses the page they were on — on the recap,
 * that is the result they just earned.
 *
 * Three weights:
 * - `hero`: white, on the home page's gradient.
 * - `primary`: filled, where joining is the main thing to do (a unit that is
 *   not built yet).
 * - `quiet`: outlined, under another page's main action (the recap's Next unit).
 *
 * Without a form address there is nothing to join, so nothing is drawn.
 */
export type WaitlistVariant = 'hero' | 'primary' | 'quiet';

const LINK_CLASS: Record<WaitlistVariant, string> = {
  hero: 'hero-button',
  primary: 'primary-button',
  quiet: 'secondary-button',
};

export default function WaitlistCta({
  variant,
  href = WAITLIST_FORM_URL,
}: {
  variant: WaitlistVariant;
  href?: string;
}) {
  if (!href) return null;

  return (
    <div className={`waitlist is-${variant}`}>
      <a className={LINK_CLASS[variant]} href={href} target="_blank" rel="noopener noreferrer">
        Join the waitlist
        <span className="visually-hidden"> (opens a Google Form in a new tab)</span>
      </a>
      <p className="waitlist-offer">{WAITLIST_OFFER}</p>
    </div>
  );
}
