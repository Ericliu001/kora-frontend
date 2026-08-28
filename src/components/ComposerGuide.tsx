import React from 'react';
import { checkBySkill, Checks, SUB_SKILL_LABEL, SUB_SKILL_ORDER, SubSkill, SubSkillInfo } from '../types';

/**
 * The three sub-skills, in front of the learner while they are composing.
 *
 * These are the same three rows in the same order as ReflectionScorecard,
 * deliberately: the list you aim at and the list you are marked against should
 * be one object seen at two moments, not two lists that happen to rhyme.
 *
 * [checks] arrives only on a second attempt, and only ever as ticks. What was
 * missed stays generic — `evidence` and `missed` carry the rubric's own words
 * and are never rendered here, so finding them is still the learner's job the
 * second time around.
 */
export default function ComposerGuide({
  teaches,
  checks,
  startOpen,
}: {
  teaches: SubSkillInfo[];
  checks?: Checks | null;
  startOpen: boolean;
}) {
  if (teaches.length === 0) return null;

  const bySkill = checks ? checkBySkill(checks) : null;
  const ordered = SUB_SKILL_ORDER.map((skill) =>
    teaches.find((item) => item.skill === skill),
  ).filter((item): item is SubSkillInfo => !!item);

  const mark = (skill: SubSkill) => {
    const check = bySkill?.[skill];
    if (!check) return { symbol: '·', state: 'neutral', note: '' };
    return check.captured
      ? { symbol: '✓', state: 'captured', note: 'already captured' }
      : { symbol: '○', state: 'open', note: 'still open' };
  };

  return (
    <details className="composer-guide" open={startOpen}>
      <summary>
        <span className="card-kicker">A GOOD REFLECTION DOES THREE THINGS</span>
        <span className="guide-chips" aria-hidden="true">
          {ordered.map((item) => (
            <span className={`guide-chip ${mark(item.skill).state}`} key={item.skill}>
              {mark(item.skill).symbol} {SUB_SKILL_LABEL[item.skill]}
            </span>
          ))}
        </span>
      </summary>

      <ul aria-label="What to aim for">
        {ordered.map((item) => {
          const { symbol, state, note } = mark(item.skill);
          return (
            <li className={`guide-row ${state}`} key={item.skill}>
              <span className="guide-mark" aria-hidden="true">
                {symbol}
              </span>
              <span className="guide-body">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
                <em>{item.purpose}</em>
              </span>
              {note && <span className="visually-hidden">{note}</span>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
