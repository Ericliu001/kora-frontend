import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorNotice from '../components/ErrorNotice';
import StepStrip from '../components/StepStrip';
import { isPageLevel } from '../errors';
import { Practising } from '../hooks/usePractice';

/** Holds the layout while the first turn is on its way. */
function PracticeSkeleton() {
  return (
    <section className="practice-layout" aria-busy="true">
      <aside className="practice-side">
        <p className="eyebrow">PRACTISING</p>
      </aside>
      <div className="practice-panel">
        <p className="pending-note" role="status">
          Setting up your practice…
        </p>
      </div>
    </section>
  );
}

/**
 * The practice room: one page per turn, side by side, and your turn on the last.
 *
 * The unit comes from the URL, so a pasted link starts a practice with no click
 * — the same [start] the tile calls, from the other direction.
 *
 * Nothing here reads the catalogue. The home page holds only the pages it has
 * loaded, so a unit further down the curriculum is simply not in the browser,
 * and looking it up would call a real unit unknown. The server knows every
 * unit, and already says which of "no such unit" and "not built yet" applies.
 */
export default function PracticeScreen({ practice }: { practice: Practising }) {
  const { unitId: routeUnitId } = useParams<{ unitId: string }>();
  const {
    unitId,
    unitTitle,
    userGoal,
    scene,
    turn,
    hasReplied,
    isLoading,
    error,
    start,
    finish,
  } = practice;

  // One attempt per unit. Without this, a 404 would set an error, re-render,
  // and start the same doomed request again.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!routeUnitId) return;
    if (unitId === routeUnitId && turn) return;
    if (attempted.current === routeUnitId) return;
    attempted.current = routeUnitId;
    void start(routeUnitId);
  }, [routeUnitId, unitId, turn, start]);

  const blocking = error && isPageLevel(error) ? error : null;
  if (blocking) {
    return (
      <ErrorNotice error={blocking} variant="page">
        <Link className="primary-button" to="/">
          Back to the training ground
        </Link>
      </ErrorNotice>
    );
  }

  if (!turn) return <PracticeSkeleton />;

  return (
    <section className="practice-layout">
      {/* First on the page and first in the tab order: leaving is always one
          obvious click away, on a phone as much as on a desktop. */}
      <nav className="practice-top" aria-label="Practice">
        <Link className="back-to-units" to="/">
          <span aria-hidden="true">←</span> All units
        </Link>
      </nav>
      <aside className="practice-side">
        <p className="eyebrow">PRACTISING</p>
        <h2>{unitTitle}</h2>
        {userGoal && <p className="muted small">{userGoal}</p>}
        {scene && <p className="muted small practice-scene">{scene}</p>}
        <button className="quiet-button" onClick={finish} disabled={isLoading || !hasReplied}>
          Finish &amp; see recap
        </button>
      </aside>

      <div className="practice-panel">
        <StepStrip practice={practice} />
      </div>
    </section>
  );
}
