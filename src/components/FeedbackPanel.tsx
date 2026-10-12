import React from 'react';
import { LEVEL_LABEL, Reflection } from '../types';
import ReflectionScorecard from './ReflectionScorecard';

/**
 * What the learner gets back: the three checks, one sentence of coaching, and
 * — when something was missing — one quoted line to take away.
 *
 * Which line that is depends on how the reply went.
 *
 * A reply that landed all three checks gets no line at all. Handing it a
 * "stronger version" would say it fell short when nothing was missing, and
 * quoting it back to itself adds nothing the green checks have not said.
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
  // BEST is exactly "all three captured" — see levelFor in GymModels.kt. With
  // nothing missing there is nothing stronger to show. Without the reply text
  // the rewrite is still shown, rather than nothing at all.
  const nailed = reflection.level === 'BEST' && !!yourReply.trim();
  const rewritten = reflection.strongerReply.source === 'REWRITTEN';

  return (
    <div className="feedback-panel coach-surface">
      <p className="eyebrow">{LEVEL_LABEL[reflection.level].toUpperCase()}</p>
      <ReflectionScorecard criteria={reflection.criteria} />
      <p className="feedback-line">{reflection.feedback}</p>

      {!nailed && (
        <div className="stronger-reply">
          <p className="card-kicker">
            {rewritten ? 'A STRONGER VERSION OF YOUR REPLY' : 'ONE WAY TO SAY IT'}
          </p>
          <blockquote>“{reflection.strongerReply.text}”</blockquote>
        </div>
      )}

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
