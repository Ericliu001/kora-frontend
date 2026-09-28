import React from 'react';
import { Practising } from '../hooks/usePractice';
import { LEVEL_LABEL, Step } from '../types';
import Composer from './Composer';
import FeedbackPanel from './FeedbackPanel';
import ReflectionPending from './ReflectionPending';
import ReflectionScorecard from './ReflectionScorecard';
import Said from './Said';
import StepClip from './StepClip';

/**
 * One turn, as one page: what they said, then your part.
 *
 * Top to bottom: their reaction to your last reply (a later turn only — it is
 * written live, so no clip can say it), their line (the clip, or the words when
 * the turn is not filmed), then either the composer and feedback — on the turn
 * being worked on — or, on a page already left, what you said and how it went.
 */
export default function StepPage({
  step,
  isCurrent,
  isActive,
  practice,
}: {
  step: Step;
  /** The turn being worked on: the last step. */
  isCurrent: boolean;
  /** The page on screen. */
  isActive: boolean;
  practice: Practising;
}) {
  const { turn, outcome } = step;

  return (
    <div className="step-page">
      {turn.bridge && <Said name={turn.speaker} text={turn.bridge} kind="bridge" />}

      {turn.videoUrl ? (
        <StepClip
          turn={turn}
          active={isActive}
          videoRef={isCurrent ? practice.videoRef : undefined}
          onPlayingChange={isCurrent ? practice.markClipPlaying : undefined}
        />
      ) : (
        <Said name={turn.speaker} text={turn.line} />
      )}

      {isCurrent ? <YourTurn practice={practice} /> : outcome && <Outcome outcome={outcome} />}
    </div>
  );
}

/** The turn being worked on: the composer, or your reply and what came back. */
function YourTurn({ practice }: { practice: Practising }) {
  const { busy, reflection, lastReply, coaching, continueAfterFeedback, isLoading } = practice;
  const assessing = busy === 'assessing';

  return (
    <>
      {/* On the page before the server has read it. Dimmed rather than
          withheld: it was said, it is just not answered yet. */}
      {(assessing || reflection) && lastReply && (
        <Said name="You" text={lastReply} kind="you" isSending={assessing} />
      )}
      {assessing ? (
        <ReflectionPending coaching={coaching} />
      ) : reflection ? (
        <FeedbackPanel
          reflection={reflection}
          yourReply={lastReply}
          onContinue={continueAfterFeedback}
          isLoading={isLoading}
        />
      ) : (
        <Composer practice={practice} />
      )}
    </>
  );
}

/** A page already left: the reply you moved on with, and — folded — how it landed. */
function Outcome({ outcome }: { outcome: NonNullable<Step['outcome']> }) {
  const { reply, reflection } = outcome;
  return (
    <>
      <Said name="You" text={reply} kind="you" />
      <details className="step-outcome coach-surface">
        <summary>
          <span className="eyebrow">{LEVEL_LABEL[reflection.level].toUpperCase()}</span>
          <span className="step-outcome-hint">How it landed</span>
        </summary>
        <ReflectionScorecard criteria={reflection.criteria} />
        <p className="feedback-line">{reflection.feedback}</p>
      </details>
    </>
  );
}
