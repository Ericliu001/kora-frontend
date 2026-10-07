import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LEVEL_LABEL, Recap } from '../types';

/**
 * What the whole conversation added up to. Computed on the server, not generated.
 *
 * Two ways on. The main one is forward: the next unit that can be played, named
 * on the button, so finishing a unit leads into the following one. The other is
 * the same "← All units" the practice page has, in the same place — first on
 * the page.
 *
 * Which unit is next is the server's answer, sent with the recap. After the
 * last playable unit there is none, and the way back is the only way on.
 */
export default function RecapScreen({
  recap,
  startingId,
  onRestart,
  onNext,
}: {
  recap: Recap | null;
  /** The unit whose practice is being created, if any. */
  startingId: string | null;
  /** Leaves the finished practice behind and goes home. */
  onRestart: () => void;
  /** Starts a practice of the unit with this id. */
  onNext: (unitId: string) => void;
}) {
  if (!recap) return <Navigate to="/" replace />;

  const next = recap.nextUnit;
  const isStarting = !!next && startingId === next.id;

  return (
    <section className="recap-panel">
      <nav className="recap-top" aria-label="Recap">
        {/* A real link, so it can be opened like one; the click also clears
            the finished practice, which is why it does not just navigate. */}
        <Link
          className="back-to-units"
          to="/"
          onClick={(event) => {
            event.preventDefault();
            onRestart();
          }}
        >
          <span aria-hidden="true">←</span> All units
        </Link>
      </nav>

      <p className="eyebrow">PRACTICE COMPLETE</p>
      <h1>
        You stayed in it for {recap.turnsCompleted === 1 ? 'a turn' : 'the whole conversation'}.
      </h1>
      <p className="intro">{recap.summary}</p>

      {/* Turn by turn, named by the move each one taught. An anonymous row of
          pips said how well it went but never what "it" was. */}
      <ul className="level-run" aria-label="How each turn went">
        {recap.turns.map((turn) => (
          <li key={turn.turnNumber}>
            <span className={`level-pip ${turn.level.toLowerCase()}`}>
              {LEVEL_LABEL[turn.level]}
            </span>
            <span className="muted small">{turn.skillLabel}</span>
          </li>
        ))}
      </ul>

      {/* Their own reply, strengthened — which is why it is worth keeping. */}
      <div className="stronger-reply">
        <p className="card-kicker">YOUR STRONGEST VERSION</p>
        <blockquote>“{recap.suggestedLine}”</blockquote>
      </div>

      {next && (
        <button
          className="primary-button"
          onClick={() => onNext(next.id)}
          disabled={isStarting}
          aria-busy={isStarting}
        >
          {isStarting ? 'Starting…' : `Next unit: ${next.title} →`}
        </button>
      )}
    </section>
  );
}
