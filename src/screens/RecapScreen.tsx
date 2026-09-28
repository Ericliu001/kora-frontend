import React from 'react';
import { Navigate } from 'react-router-dom';
import { LEVEL_LABEL, Recap } from '../types';

/** What the whole conversation added up to. Computed on the server, not generated. */
export default function RecapScreen({
  recap,
  onRestart,
}: {
  recap: Recap | null;
  onRestart: () => void;
}) {
  if (!recap) return <Navigate to="/" replace />;

  return (
    <section className="recap-panel">
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

      <button className="primary-button" onClick={onRestart}>
        Back to the training ground
      </button>
    </section>
  );
}
