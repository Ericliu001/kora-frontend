import React from 'react';
import { checkBySkill, Reflection, SUB_SKILL_LABEL, SUB_SKILL_ORDER } from '../types';

/**
 * The lesson itself, not decoration: three named things a reflection should do,
 * shown in the same order every time so the learner builds a checklist.
 */
export default function ReflectionScorecard({ checks }: { checks: Reflection['checks'] }) {
  const bySkill = checkBySkill(checks);

  return (
    <ul className="scorecard" aria-label="Your reflection, check by check">
      {SUB_SKILL_ORDER.map((skill, index) => {
        const check = bySkill[skill];
        return (
          <li
            key={skill}
            className={check.captured ? 'check captured' : 'check missed'}
            style={{ animationDelay: `${index * 140}ms` }}
          >
            <span className="check-mark" aria-hidden="true">
              {check.captured ? '✓' : '○'}
            </span>
            <span className="check-body">
              <strong>{SUB_SKILL_LABEL[skill]}</strong>
              <span>
                {check.captured
                  ? check.evidence ?? 'You captured this.'
                  : check.missed
                    ? `Missing: ${check.missed}`
                    : 'Not yet.'}
              </span>
            </span>
            <span className="visually-hidden">
              {check.captured ? 'captured' : 'not captured'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
