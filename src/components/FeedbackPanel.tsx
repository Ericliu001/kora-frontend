import React from 'react';
import { LEVEL_LABEL, Reflection } from '../types';
import ReflectionScorecard from './ReflectionScorecard';

/**
 * What the learner gets back: the three checks, one sentence of coaching, and
 * one quoted line to take away.
 *
 * Which line that is depends on how the reply went, and there are three cases.
 *
 * A reply that landed all three checks is quoted back to itself. Handing it a
 * "stronger version" would say it fell short when nothing was missing — so the
 * model answer becomes the learner's own sentence, under a heading that says
 * what it is. Nothing to read but the thing they already did.
 *
 * A reply that missed something gets a rewrite: their own facts with the
 * missing parts added, which is a version they could actually have said. A
 * canned model answer is easy to admire and impossible to learn from, because
 * it is about somebody else's life.
 *
 * When there was no model to do the rewriting, the authored example is offered
 * instead — under a different heading, because it promises something different.
 */
export default function FeedbackPanel({
  reflection,
  yourReply,
  onContinue,
  isLoading,
}: {
  reflection: Reflection;
  yourReply: string;
  onContinue: () => void;
  isLoading: boolean;
}) {
  // BEST is exactly "all three captured" — see levelFor in GymModels.kt. The
  // reply itself is the takeaway only if we still have it; without it the
  // rewrite is better than an empty box.
  const nailed = reflection.level === 'BEST' && !!yourReply.trim();
  const rewritten = reflection.strongerReply.source === 'REWRITTEN';

  const kicker = nailed
    ? 'THIS IS THE MOVE'
    : rewritten
      ? 'A STRONGER VERSION OF YOUR REPLY'
      : 'ONE WAY TO SAY IT';

  return (
    <div className="feedback-panel coach-surface">
      <p className="eyebrow">{LEVEL_LABEL[reflection.level].toUpperCase()}</p>
      <ReflectionScorecard criteria={reflection.criteria} />
      <p className="feedback-line">{reflection.feedback}</p>

      <div className={nailed ? 'stronger-reply is-your-words' : 'stronger-reply'}>
        <p className="card-kicker">{kicker}</p>
        <blockquote>“{nailed ? yourReply.trim() : reflection.strongerReply.text}”</blockquote>
      </div>

      <button className="primary-button" onClick={onContinue} disabled={isLoading}>
        {reflection.retry
          ? 'Try that again'
          : reflection.complete
            ? 'See your recap →'
            : 'Continue →'}
      </button>
    </div>
  );
}
