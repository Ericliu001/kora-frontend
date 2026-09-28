import React from 'react';
import { Coaching } from '../types';

/**
 * What sits where the feedback will land while the server is judging.
 *
 * It mirrors the scorecard's shape so the three rows stay put when the real
 * checks arrive. The rows are blank because the checks are per turn and have
 * not come back yet — but naming the move again while the learner waits is one
 * more repetition of the thing this turn is teaching.
 */
export default function ReflectionPending({ coaching }: { coaching?: Coaching | null }) {
  return (
    <div className="feedback-panel coach-surface" aria-busy="true">
      <p className="eyebrow">
        {coaching ? `CHECKING: ${coaching.label.toUpperCase()}` : 'CHECKING YOUR REPLY'}
      </p>
      <ul className="scorecard" aria-label="Your reply, check by check">
        {[0, 1, 2].map((row) => (
          <li key={row} className="check pending" style={{ animationDelay: `${row * 140}ms` }}>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <span className="check-body">
              <span className="skeleton-line" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
      <p className="pending-note" role="status">
        Reading your reply back…
      </p>
    </div>
  );
}
