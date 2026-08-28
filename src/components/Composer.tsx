import React from 'react';
import { VOICE_UNSUPPORTED } from '../errors';
import { Practising } from '../hooks/usePractice';
import {
  checkBySkill,
  joinPhrases,
  MAX_ATTEMPTS_PER_BEAT,
  RETRY_PROMPT,
  SUB_SKILL_ORDER,
} from '../types';
import ComposerGuide from './ComposerGuide';
import ErrorNotice from './ErrorNotice';

/**
 * Where the learner takes their turn.
 *
 * The label is the teaching. On a first attempt it asks the open question; on a
 * retry it names the moves still missing — by move, never by content, so the
 * answer is still theirs to find.
 */
export default function Composer({ practice }: { practice: Practising }) {
  const {
    beat,
    teaches,
    carriedChecks,
    attemptNumber,
    draft,
    setDraft,
    isLoading,
    busy,
    hasClip,
    clipWatched,
    voice,
    composerError,
    clearComposerError,
    submitReflection,
  } = practice;

  if (!beat) return null;

  const canRespond = !isLoading;
  const sheIsStillTalking = hasClip && !clipWatched;

  // Which of the three are still open on a second attempt. Named by move, not
  // by content: RETRY_PROMPT says "name how they feel", never the feeling.
  const stillOpen = carriedChecks
    ? SUB_SKILL_ORDER.filter((skill) => !checkBySkill(carriedChecks)[skill].captured)
    : [];

  const label =
    stillOpen.length > 0
      ? `Try again — this time, ${joinPhrases(stillOpen.map((skill) => RETRY_PROMPT[skill]))}.`
      : `What would you say back to ${beat.speaker}?`;

  return (
    <div className="composer">
      <ComposerGuide
        key={`${beat.id}-${attemptNumber}`}
        teaches={teaches}
        checks={carriedChecks}
        startOpen={beat.turnNumber === 1 || attemptNumber > 1}
      />
      <label htmlFor="reflection-draft">{label}</label>
      {attemptNumber > 1 && (
        <p className="composer-attempt">
          Attempt {attemptNumber} of {MAX_ATTEMPTS_PER_BEAT}
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
          Reflect back →
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
        sheIsStillTalking && (
          <p className="composer-hint">
            {beat.speaker} is still talking — reply whenever you're ready.
          </p>
        )
      )}
      <span className="visually-hidden" role="status">
        {voice.isRecording ? 'Recording your reply' : ''}
      </span>
    </div>
  );
}
