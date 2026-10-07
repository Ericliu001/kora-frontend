import React from 'react';
import { Coaching, CriterionResult } from '../types';

/**
 * The move to practise, in front of the learner while they are composing.
 *
 * A card of its own, above the box they reply in and not inside it: the tip is
 * read, the box is typed in, and the two are told apart at a glance.
 *
 * One move per turn, not one fixed trio per unit: turn 1 of a unit asks for
 * something narrower than turn 3, and the card says which. It names the move
 * and says what to do, and nothing else — the reason the move works and a
 * sample sentence both arrive with the turn and are deliberately not shown.
 *
 * [openCriteria] arrives only on a second attempt, and only as labels the
 * learner has already read on the scorecard. What was missing, in the author's
 * words, stays on the server, so finding it is still their job.
 */
export default function CoachingCard({
  coaching,
  openCriteria,
}: {
  coaching: Coaching | null;
  openCriteria?: CriterionResult[] | null;
}) {
  if (!coaching) return null;

  const still = openCriteria?.filter((criterion) => !criterion.captured) ?? [];

  return (
    <section className="coaching-card coach-surface" aria-labelledby="coaching-card-title">
      <p className="card-kicker" id="coaching-card-title">
        THE MOVE TO PRACTISE
      </p>
      <p className="coaching-move">
        <strong>{coaching.label}</strong>
        <span>{coaching.instruction}</span>
      </p>
      {still.length > 0 && (
        <ul className="guide-chips" aria-label="Still open">
          {still.map((criterion) => (
            <li className="guide-chip open" key={criterion.id}>
              <span aria-hidden="true">○ </span>
              {criterion.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
