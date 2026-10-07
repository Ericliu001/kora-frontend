import React from 'react';
import { Coaching, CriterionResult } from '../types';

/**
 * The move to practise, in front of the learner while they are composing.
 *
 * A card of its own, above the box they reply in and not inside it, and a
 * different colour from it: the tip is read, the box is typed in, and the two
 * are told apart at a glance.
 *
 * The card is on the page from the moment the turn opens, but the instruction
 * inside it is not. The learner hears or reads the line first and gets a few
 * seconds to think of a reply of their own; then the instruction appears. The
 * body is one of three things:
 *
 *  - waiting: nothing has been heard yet — a "Show instruction" button;
 *  - counting: [secondsLeft] is a number — "Showing instruction in 5 seconds",
 *    with the number counting down, and a "Show now" button;
 *  - shown: the instruction, and on a retry the checks still open.
 *
 * The countdown lives inside this card, in a sentence that says what it is
 * counting to, so that it reads as "the instruction is coming" and not as time
 * left to answer. While it runs the heading steps aside: the sentence is the
 * only thing in the card, and the heading comes back with the instruction. The
 * card keeps its name for a screen reader throughout. Who decides which state
 * it is in is StepPage; this only draws it.
 *
 * One move per turn, not one fixed trio per unit. The card says what to do and
 * nothing else — the move's name, the reason it works and a sample sentence all
 * arrive with the turn and are deliberately not shown.
 *
 * [openCriteria] arrives only on a second attempt, and only as labels the
 * learner has already read on the scorecard. What was missing, in the author's
 * words, stays on the server, so finding it is still their job.
 */
export default function CoachingCard({
  coaching,
  openCriteria,
  shown,
  secondsLeft,
  onShow,
}: {
  coaching: Coaching | null;
  openCriteria?: CriterionResult[] | null;
  /** The instruction is on the page. */
  shown: boolean;
  /** The countdown, once it has started. Ignored once [shown]. */
  secondsLeft: number | null;
  /** The learner asked for the instruction now. */
  onShow: () => void;
}) {
  if (!coaching) return null;

  const still = openCriteria?.filter((criterion) => !criterion.captured) ?? [];
  const counting = !shown && secondsLeft !== null;

  return (
    <section className="coaching-card coach-surface" aria-label="The move to practise">
      {!counting && <p className="card-kicker">THE MOVE TO PRACTISE</p>}

      <div className="coaching-body">
        {/* Always here, and empty until the instruction is: a screen reader is
            told once, when it arrives, and never about the seconds going by. */}
        <div aria-live="polite">
          {shown && <p className="coaching-move">{coaching.instruction}</p>}
        </div>

        {shown ? (
          still.length > 0 && (
            <ul className="guide-chips" aria-label="Still open">
              {still.map((criterion) => (
                <li className="guide-chip open" key={criterion.id}>
                  <span aria-hidden="true">○ </span>
                  {criterion.label}
                </li>
              ))}
            </ul>
          )
        ) : secondsLeft !== null ? (
          <div className="tip-countdown">
            <p role="timer">
              Showing instruction in{' '}
              <strong className="tip-count" key={secondsLeft}>
                {secondsLeft}
              </strong>{' '}
              {secondsLeft === 1 ? 'second' : 'seconds'}
            </p>
            <button className="quiet-button" onClick={onShow}>
              Show now
            </button>
          </div>
        ) : (
          <button className="quiet-button" onClick={onShow}>
            Show instruction
          </button>
        )}
      </div>
    </section>
  );
}
