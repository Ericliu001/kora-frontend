import React from 'react';
import { Link } from 'react-router-dom';
import WaitlistCta from '../components/WaitlistCta';
import { usePageTitle } from '../hooks/usePageTitle';
import { UnitSummary } from '../types';

/**
 * A unit on the map that nobody has written yet.
 *
 * It lives at the unit's own address, /units/:unitId, so a link shared today
 * becomes a practice the day the unit is built, with no redirect.
 *
 * Two ways in. From a Preview tile, the tile hands over the unit it showed, so
 * the page can name it. From a pasted link or a reload, all that is known is
 * the server's answer — "not built yet" — which carries no title, so the page
 * says that instead.
 *
 * Joining the waitlist is the only thing to do here, so it gets the filled
 * button.
 */
export default function ComingSoonScreen({ unit }: { unit?: UnitSummary | null }) {
  usePageTitle(unit ? `${unit.title} (coming soon)` : 'Coming soon');

  return (
    <section className="coming-soon">
      <nav className="recap-top" aria-label="Coming soon">
        <Link className="back-to-units" to="/">
          <span aria-hidden="true">←</span> All units
        </Link>
      </nav>

      <p className="eyebrow">COMING SOON</p>
      <h1>{unit ? unit.title : "This unit isn't built yet"}</h1>
      {unit ? (
        <>
          <p className="intro">{unit.blurb}</p>
          <p className="muted small">About {unit.estimatedMinutes} min</p>
        </>
      ) : (
        <p className="intro">It's on the way, with the rest of the full course.</p>
      )}

      <WaitlistCta variant="primary" />
    </section>
  );
}
