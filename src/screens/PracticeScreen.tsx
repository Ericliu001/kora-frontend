import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorNotice from '../components/ErrorNotice';
import StepStrip from '../components/StepStrip';
import { AppError, isPageLevel } from '../errors';
import { Practising } from '../hooks/usePractice';
import { UnitSummary } from '../types';

const NOT_READY: AppError = {
  kind: 'conflict',
  code: 'UNIT_NOT_READY',
  message: "That one isn't built yet.",
};

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
 */
export default function PracticeScreen({
  practice,
  findUnit,
  catalogReady,
}: {
  practice: Practising;
  findUnit: (id: string) => UnitSummary | undefined;
  catalogReady: boolean;
}) {
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

  const known = routeUnitId ? findUnit(routeUnitId) : undefined;
  const notReady = !!known && !known.playable;

  useEffect(() => {
    if (!routeUnitId || !catalogReady) return;
    // A unit nobody has written is answered from the catalogue. Asking the
    // server would get the same answer, one round trip later — and with
    // twenty-nine previews on the grid this is now the common case.
    if (notReady) return;
    if (unitId === routeUnitId && turn) return;
    if (attempted.current === routeUnitId) return;
    attempted.current = routeUnitId;
    void start(routeUnitId);
  }, [routeUnitId, catalogReady, notReady, unitId, turn, start]);

  const blocking = notReady ? NOT_READY : error && isPageLevel(error) ? error : null;
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
