import React from 'react';
import { LEVEL_LABEL, Reflection } from '../types';
import ReflectionScorecard from './ReflectionScorecard';

/**
 * What the learner gets back: the three checks, one sentence of coaching, and a
 * reply one tier above their own. The perfect answer two steps early teaches
 * nothing, which is why the server picks the tier rather than always sending
 * the best one.
 */
export default function FeedbackPanel({
  reflection,
  onContinue,
  isLoading,
}: {
  reflection: Reflection;
  onContinue: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="feedback-panel">
      <p className="eyebrow">{LEVEL_LABEL[reflection.level].toUpperCase()}</p>
      <ReflectionScorecard checks={reflection.checks} />
      <p className="feedback-line">{reflection.feedback}</p>

      <div className="exemplar">
        <p className="card-kicker">
          {reflection.level === 'BEST' ? 'ANOTHER STRONG REPLY' : 'A STRONGER REPLY'}
        </p>
        <blockquote>“{reflection.exemplar.text}”</blockquote>
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
