import React from 'react';
import { VOICE_UNSUPPORTED } from '../errors';
import { Practising } from '../hooks/usePractice';
import { MAX_ATTEMPTS_PER_TURN } from '../types';
import ErrorNotice from './ErrorNotice';

/**
 * Where the learner takes their turn.
 *
 * Only the reply lives here. The instructions are a card of their own, above
 * this one — see CoachingCard. The label asks the open question on a first
 * attempt; on a retry it says how much is still open, and the chips in that
 * card say which parts — by the names the learner already read on the
 * scorecard, never by the words that were missing.
 */
export default function Composer({ practice }: { practice: Practising }) {
  const {
    turn,
    carriedCriteria,
    attemptNumber,
    draft,
    setDraft,
    isLoading,
    busy,
    clipPlaying,
    voice,
    composerError,
    clearComposerError,
    submitReflection,
  } = practice;

  if (!turn) return null;

  const canRespond = !isLoading;
  const stillTalking = clipPlaying;

  const stillOpen = carriedCriteria?.filter((criterion) => !criterion.captured) ?? [];
  const label =
    stillOpen.length > 0
      ? `Try again — ${stillOpen.length} of the three is still open.`
      : `What would you say back to ${turn.speaker}?`;

  return (
    <div className="composer coach-surface">
      <p className="card-kicker composer-kicker">YOUR TURN</p>
      <label htmlFor="reflection-draft">{label}</label>
      {attemptNumber > 1 && (
        <p className="composer-attempt">
          Attempt {attemptNumber} of {MAX_ATTEMPTS_PER_TURN}
        </p>
      )}
      <textarea
        id="reflection-draft"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          // Editing is the retry for a rejected reply, so the complaint goes
          // away the moment they act on it.
          if (composerError) clearComposerError();
        }}
        placeholder="Speak or type your reply…"
        rows={3}
        disabled={!canRespond && !voice.isRecording}
        aria-invalid={!!composerError}
        aria-describedby={composerError ? 'composer-error' : undefined}
      />
      {composerError && (
        <div id="composer-error">
          <ErrorNotice error={composerError} variant="inline" />
        </div>
      )}
      <div className="composer-actions">
        {voice.supported && (
          <button
            className={voice.isRecording ? 'record-button recording' : 'record-button'}
            onClick={voice.toggle}
            disabled={isLoading && !voice.isRecording}
          >
            {voice.isRecording ? '■ Stop recording' : '● Speak'}
          </button>
        )}
        <button
          className="primary-button send-button"
          onClick={submitReflection}
          disabled={!canRespond || !draft.trim()}
        >
          Send reply →
        </button>
      </div>
      {/* Said once, up front, rather than as a failure after they press it. */}
      {!voice.supported && <ErrorNotice error={VOICE_UNSUPPORTED} variant="inline" />}
      {voice.error && <ErrorNotice error={voice.error} variant="inline" />}
      {busy === 'transcribing' ? (
        <p className="pending-note" role="status">
          Writing down what you said…
        </p>
      ) : (
        stillTalking && (
          <p className="composer-hint">
            {turn.speaker} is still talking — reply whenever you're ready.
          </p>
        )
      )}
      <span className="visually-hidden" role="status">
        {voice.isRecording ? 'Recording your reply' : ''}
      </span>
    </div>
  );
}
