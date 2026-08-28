import React from 'react';
import { Navigate } from 'react-router-dom';
import { LEVEL_LABEL, Recap } from '../types';

/** What the whole conversation added up to. Computed on the server, not generated. */
export default function RecapScreen({ recap, onRestart }: { recap: Recap | null; onRestart: () => void }) {
  if (!recap) return <Navigate to="/" replace />;

  return (
    <section className="recap-panel">
      <p className="eyebrow">PRACTICE COMPLETE</p>
      <h1>
        You listened for {recap.turnsCompleted === 1 ? 'a turn' : 'the whole conversation'}.
      </h1>
      <p className="intro">{recap.summary}</p>

      <div className="level-run">
        {recap.levels.map((level, index) => (
          <span className={`level-pip ${level.toLowerCase()}`} key={index}>
            {LEVEL_LABEL[level]}
          </span>
        ))}
      </div>

      <div className="exemplar">
        <p className="card-kicker">ONE TO KEEP</p>
        <blockquote>“{recap.suggestedLine}”</blockquote>
      </div>

      <button className="primary-button" onClick={onRestart}>
        Back to the training ground
      </button>
    </section>
  );
}
