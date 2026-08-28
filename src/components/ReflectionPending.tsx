import React from 'react';
import { SUB_SKILL_LABEL, SUB_SKILL_ORDER } from '../types';

/**
 * What sits where the feedback will land while the server is judging.
 *
 * It mirrors the scorecard's shape so the three rows stay put when the real
 * checks arrive — and naming the sub-skills again while the learner waits is
 * one more repetition of the thing the unit is teaching.
 */
export default function ReflectionPending() {
  return (
    <div className="feedback-panel" aria-busy="true">
      <p className="eyebrow">CHECKING YOUR REFLECTION</p>
      <ul className="scorecard" aria-label="Your reflection, check by check">
        {SUB_SKILL_ORDER.map((skill, index) => (
          <li key={skill} className="check pending" style={{ animationDelay: `${index * 140}ms` }}>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <span className="check-body">
              <strong>{SUB_SKILL_LABEL[skill]}</strong>
              <span className="skeleton-line" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
      <p className="pending-note" role="status">
        Listening back over what you said…
      </p>
    </div>
  );
}
