import React from 'react';
import { Coaching, CriterionResult } from '../types';

/**
 * The move to practise, in front of the learner while they are composing.
 *
 * One move per turn, not one fixed trio per unit: turn 1 of a unit asks for
 * something narrower than turn 3, and the card says which. The example is here
 * deliberately — the exercise is not "guess the answer", it is "say this with
 * the facts of your own life".
 *
 * [openCriteria] arrives only on a second attempt, and only as labels the
 * learner has already read on the scorecard. What was missing, in the author's
 * words, stays on the server, so finding it is still their job.
 */
export default function CoachingCard({
  coaching,
  openCriteria,
  startOpen,
}: {
  coaching: Coaching | null;
  openCriteria?: CriterionResult[] | null;
  startOpen: boolean;
}) {
  if (!coaching) return null;

  const still = openCriteria?.filter((criterion) => !criterion.captured) ?? [];

  return (
    <details className="coaching-card" open={startOpen}>
      <summary>
        <span className="card-kicker">THE MOVE TO PRACTISE</span>
        <span className="guide-chips" aria-hidden="true">
          <span className="guide-chip neutral">{coaching.label}</span>
          {still.map((criterion) => (
            <span className="guide-chip open" key={criterion.id}>
              ○ {criterion.label}
            </span>
          ))}
        </span>
      </summary>

      <ul aria-label="What to aim for">
        <li className="guide-row">
          <span className="guide-mark" aria-hidden="true">
            ·
          </span>
          <span className="guide-body">
            <strong>{coaching.label}</strong>
            <span>{coaching.instruction}</span>
            <em>{coaching.purpose}</em>
          </span>
        </li>
      </ul>

      <div className="coaching-example">
        <p className="card-kicker">ONE WAY TO SAY IT</p>
        <blockquote>“{coaching.example}”</blockquote>
      </div>
    </details>
  );
}
