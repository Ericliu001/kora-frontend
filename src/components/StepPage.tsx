import React, { useCallback, useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { Practising } from '../hooks/usePractice';
import { LEVEL_LABEL, Step } from '../types';
import CoachingCard from './CoachingCard';
import Composer from './Composer';
import FeedbackPanel from './FeedbackPanel';
import ReflectionPending from './ReflectionPending';
import ReflectionScorecard from './ReflectionScorecard';
import Said from './Said';
import StepClip from './StepClip';

/**
 * One turn, as one page: what they said, then your part.
 *
 * Top to bottom: their line (the clip, or the words when the turn is not
 * filmed), then — on the turn being worked on — the move to
 * practise and the composer as two separate cards, or the feedback; or, on a
 * page already left, what you said and how it went.
 *
 * The instruction in the move-to-practise card is held back. It shows itself
 * [TIP_DELAY_SECONDS] after the learner has had the line — the clip ended, or
 * the words are on the page — or at once if they ask. That is decided here,
 * not in the card, because this component lasts the whole turn: the card comes
 * and goes with the feedback, and a retry must find its instruction still out.
 */
/** How long the learner has to think of their own reply before the instruction shows. */
const TIP_DELAY_SECONDS = 5;

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

  // A written turn has its words on the page from the start, so it has been
  // "heard" as soon as it opens. A filmed one waits for the clip to say so.
  const [heard, setHeard] = useState(!turn.videoUrl);
  const [asked, setAsked] = useState(false);
  const markHeard = useCallback(() => setHeard(true), []);
  const showTip = useCallback(() => setAsked(true), []);
  // One countdown per turn. Nothing restarts it, and it runs on whether or not
  // this page is the one on screen.
  const secondsLeft = useCountdown(isCurrent && heard && !asked, TIP_DELAY_SECONDS);
  // A retry never waits again: the chips for what is still open live in the card.
  const tipShown = asked || secondsLeft === 0 || practice.attemptNumber > 1;

  return (
    <div className="step-page">
      {turn.videoUrl ? (
        <StepClip
          turn={turn}
          active={isActive}
          videoRef={isCurrent ? practice.videoRef : undefined}
          onPlayingChange={isCurrent ? practice.markClipPlaying : undefined}
          onHeard={markHeard}
        />
      ) : (
        <Said name={turn.speaker} text={turn.line} />
      )}

      {isCurrent ? (
        <YourTurn
          practice={practice}
          tip={{ shown: tipShown, secondsLeft, onShow: showTip }}
        />
      ) : (
        outcome && <Outcome outcome={outcome} />
      )}
    </div>
  );
}

/** The turn being worked on: the tip and the composer, or your reply and what came back. */
function YourTurn({
  practice,
  tip,
}: {
  practice: Practising;
  tip: { shown: boolean; secondsLeft: number | null; onShow: () => void };
}) {
  const { busy, reflection, lastReply, coaching, carriedCriteria, continueAfterFeedback, isLoading } =
    practice;
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
        <>
          <CoachingCard coaching={coaching} openCriteria={carriedCriteria} {...tip} />
          <Composer practice={practice} />
        </>
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
