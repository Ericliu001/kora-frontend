import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import BeatStage from '../components/BeatStage';
import Composer from '../components/Composer';
import ErrorNotice from '../components/ErrorNotice';
import FeedbackPanel from '../components/FeedbackPanel';
import ReflectionPending from '../components/ReflectionPending';
import { AppError, isPageLevel } from '../errors';
import { Practising } from '../hooks/usePractice';
import { UnitSummary } from '../types';

const NOT_READY: AppError = {
  kind: 'conflict',
  code: 'UNIT_NOT_READY',
  message: "That one isn't built yet.",
};

/** Holds the layout while the first beat is on its way. */
function PracticeSkeleton() {
  return (
    <section className="practice-layout" aria-busy="true">
      <aside className="practice-side">
        <p className="eyebrow">PRACTISING</p>
      </aside>
      <div className="practice-panel">
        <div className="stage">
          <div className="beat-video is-skeleton" />
        </div>
        <p className="pending-note" role="status">
          Setting up your practice…
        </p>
      </div>
    </section>
  );
}

/**
 * The practice room: her clip, the conversation so far, and your turn.
 *
 * The unit comes from the URL, so a pasted link starts a practice with no click
 * — the same [start] the tile calls, from the other direction.
 */
export default function PracticeScreen({
  practice,
  findUnit,
  catalogReady,
}: {
  practice: Practising;
  findUnit: (id: string) => UnitSummary | undefined;
  catalogReady: boolean;
}) {
  const { unitId: routeUnitId } = useParams<{ unitId: string }>();
  const {
    unitId,
    unitTitle,
    beat,
    utterances,
    hasClip,
    reflection,
    busy,
    isLoading,
    error,
    videoRef,
    start,
    finish,
    continueAfterFeedback,
    markClipWatched,
    markClipUnavailable,
  } = practice;

  // One attempt per unit. Without this, a 404 would set an error, re-render,
  // and start the same doomed request again.
  const attempted = useRef<string | null>(null);

  const known = routeUnitId ? findUnit(routeUnitId) : undefined;
  const notReady = !!known && !known.playable;

  useEffect(() => {
    if (!routeUnitId || !catalogReady) return;
    // A unit nobody has written is answered from the catalogue. Asking the
    // server would get the same answer, one round trip later.
    if (notReady) return;
    if (unitId === routeUnitId && beat) return;
    if (attempted.current === routeUnitId) return;
    attempted.current = routeUnitId;
    void start(routeUnitId);
  }, [routeUnitId, catalogReady, notReady, unitId, beat, start]);

  const blocking = notReady ? NOT_READY : error && isPageLevel(error) ? error : null;
  if (blocking) {
    return (
      <ErrorNotice error={blocking} variant="page">
        <Link className="primary-button" to="/">
          Back to the training ground
        </Link>
      </ErrorNotice>
    );
  }

  if (!beat) return <PracticeSkeleton />;

  return (
    <section className="practice-layout">
      <aside className="practice-side">
        <p className="eyebrow">PRACTISING</p>
        <h2>{unitTitle}</h2>
        <p className="muted small">Turn {beat.turnNumber}</p>
        <button
          className="quiet-button"
          onClick={finish}
          disabled={isLoading || utterances.every((line) => line.speaker === 'THEM')}
        >
          Finish &amp; see recap
        </button>
        <Link className="quiet-button" to="/">
          ← All units
        </Link>
      </aside>

      <div className="practice-panel">
        {hasClip && (
          <BeatStage
            beat={beat}
            videoRef={videoRef}
            onEnded={markClipWatched}
            onUnavailable={markClipUnavailable}
          />
        )}

        {utterances.length > 0 && (
          <div className="transcript" aria-live="polite">
            {utterances.map((line, index) => (
              <article
                className={`utterance ${line.speaker.toLowerCase()}`}
                key={`${line.speaker}-${index}`}
              >
                <span>{line.name}</span>
                <p>{line.text}</p>
              </article>
            ))}
          </div>
        )}

        {busy === 'assessing' ? (
          <ReflectionPending />
        ) : reflection ? (
          <FeedbackPanel
            reflection={reflection}
            onContinue={continueAfterFeedback}
            isLoading={isLoading}
          />
        ) : (
          <Composer practice={practice} />
        )}
      </div>
    </section>
  );
}
