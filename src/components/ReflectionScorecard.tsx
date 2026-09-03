import React from 'react';
import { CriterionResult } from '../types';

/**
 * The lesson itself, not decoration: the three things this turn's move is made
 * of, in the order the author wrote them, so the learner builds a checklist.
 *
 * The three vary by turn — which is the point. Turn 1 asks for one thing and
 * turn 3 for another, and the scorecard is where the learner finds out which
 * parts of *this* move landed.
 */
export default function ReflectionScorecard({ criteria }: { criteria: CriterionResult[] }) {
  return (
    <ul className="scorecard" aria-label="Your reply, check by check">
      {criteria.map((criterion, index) => (
        <li
          key={criterion.id}
          className={criterion.captured ? 'check captured' : 'check missed'}
          style={{ animationDelay: `${index * 140}ms` }}
        >
          <span className="check-mark" aria-hidden="true">
            {criterion.captured ? '✓' : '○'}
          </span>
          <span className="check-body">
            <strong>{criterion.label}</strong>
            <span>
              {criterion.captured
                ? criterion.evidence ?? 'You captured this.'
                : criterion.guidance ?? 'Not yet.'}
            </span>
          </span>
          <span className="visually-hidden">
            {criterion.captured ? 'captured' : 'not captured'}
          </span>
        </li>
      ))}
    </ul>
  );
}
