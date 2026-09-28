import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import { AppError, isRetryable, toAppError } from '../errors';
import {
  carriedCriteria as strip,
  Coaching,
  CriterionResult,
  Practice,
  Recap,
  Reflection,
  Step,
} from '../types';
import { useVoiceInput } from './useVoiceInput';

/**
 * One practice, from the first line to the recap.
 *
 * Everything here is one conversation's worth of state, which is why it is one
 * hook rather than several: the steps, the draft and the feedback all change
 * together, and splitting them would mean keeping them in step by hand.
 *
 * The practice is a list of steps, one per turn reached. The last step is the
 * one being worked on — its draft, attempt number and feedback are the loose
 * state below — and every step before it carries the outcome it was left with.
 * Which step is on screen is not here: that is the view's business, and
 * swiping back to an old page must never change where the practice is.
 *
 * Called once, at the top of the app, and handed down. Two screens read it;
 * that is not enough consumers to justify a context.
 */
export function usePractice() {
  const navigate = useNavigate();

  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitTitle, setUnitTitle] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [scene, setScene] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  // Which tile is waiting on the server. Held here rather than in the grid so
  // the spinner belongs to the practice being created, not to a component that
  // is about to unmount.
  const [startingId, setStartingId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  // The current turn's clip is playing right now. Clips never start by
  // themselves, so this is false until the learner presses Play.
  const [clipPlaying, setClipPlaying] = useState(false);
  const [draft, setDraft] = useState('');
  // The reply now being judged. Kept because a reply that lands all three
  // checks is shown its own words back as the model — see FeedbackPanel.
  const [lastReply, setLastReply] = useState('');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);

  // What survives a retry. Dropping the checks with the feedback card sent the
  // learner back to an identical blank prompt with nothing to aim at, which is
  // the one moment in the loop where they most need something to aim at. Only
  // the labels are kept — see `carriedCriteria` in types.ts.
  const [carried, setCarried] = useState<CriterionResult[] | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [isBusy, setIsBusy] = useState(false);
  const [assessing, setAssessing] = useState(false);

  // Two error slots, because they are answered differently. `error` is
  // something that happened to the request; `composerError` is something wrong
  // with what was typed, and belongs next to the box you fix it in.
  const [error, setError] = useState<AppError | null>(null);
  const [composerError, setComposerError] = useState<AppError | null>(null);

  // The clip on the step being worked on. Older steps keep their own elements;
  // only this one has to be stoppable when the learner starts to speak.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Lets a failed request offer itself back as a retry without any of these
  // callbacks having to name itself inside its own body.
  const ops = useRef<{
    start?: (id: string) => void;
    submit?: () => void;
    finish?: () => void;
  }>({});

  /** Attach "Try again" to the failures where trying again could work. */
  const retryable = (failure: AppError, run: () => void): AppError =>
    isRetryable(failure) ? { ...failure, action: { label: 'Try again', run } } : failure;

  /** They stop when the learner takes their turn — talking over each other helps nobody. */
  const stopThemTalking = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  }, []);

  const voice = useVoiceInput({
    practiceId,
    onBeforeStart: stopThemTalking,
    onTranscript: setDraft,
  });

  const isLoading = isBusy || voice.isTranscribing;
  const busy: 'assessing' | 'transcribing' | null = assessing
    ? 'assessing'
    : voice.isTranscribing
      ? 'transcribing'
      : null;

  /** The turn being worked on: always the last step's. */
  const turn = steps.length > 0 ? steps[steps.length - 1].turn : null;

  /**
   * Begin a unit. One entry point, two callers: a click on a tile, and a
   * pasted URL arriving at the practice screen with nothing in flight.
   *
   * Navigation is last and only on success, so a failure leaves the learner on
   * the page they were on — beside the tile they clicked — rather than on a
   * practice screen that then has to explain itself.
   */
  const start = useCallback(
    async (id: string) => {
      setStartingId(id);
      setIsBusy(true);
      setError(null);
      try {
        const practice = await request<Practice>('/practices', {
          method: 'POST',
          body: JSON.stringify({ unitId: id }),
        });
        setPracticeId(practice.id);
        setUnitId(practice.unitId);
        setUnitTitle(practice.unitTitle);
        setUserGoal(practice.userGoal);
        setScene(practice.scene ?? '');
        setTurnCount(practice.turnCount);
        setReflection(null);
        setRecap(null);
        setCarried(null);
        setComposerError(null);
        setAttemptNumber(1);
        setDraft('');
        setLastReply('');
        setClipPlaying(false);
        setSteps([{ turn: practice.turn }]);
        // Last, so the route guard sees a practice in flight when it renders.
        navigate(`/units/${practice.unitId}`);
      } catch (reason) {
        setError(
          retryable(toAppError(reason, 'Unable to start practising.'), () =>
            ops.current.start?.(id),
          ),
        );
      } finally {
        setStartingId(null);
        setIsBusy(false);
      }
    },
    [navigate],
  );

  const finish = useCallback(async () => {
    if (!practiceId) return;
    setIsBusy(true);
    setError(null);
    try {
      setRecap(await request<Recap>(`/practices/${practiceId}/complete`, { method: 'POST' }));
      navigate(`/units/${unitId}/recap`);
    } catch (reason) {
      setError(
        retryable(toAppError(reason, 'Unable to build your recap.'), () => ops.current.finish?.()),
      );
    } finally {
      setIsBusy(false);
    }
  }, [practiceId, unitId, navigate]);

  const submitReflection = useCallback(async () => {
    const text = draft.trim();
    if (!practiceId || !turn || !text || isLoading) return;

    stopThemTalking();

    // Show the reply landing straight away and wait underneath it, rather than
    // leaving the learner staring at their own unsent draft.
    setLastReply(text);
    setDraft('');
    setIsBusy(true);
    setAssessing(true);
    setError(null);
    setComposerError(null);

    try {
      setReflection(
        await request<Reflection>(`/practices/${practiceId}/reflections`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        }),
      );
    } catch (reason) {
      // Take the reply back off the page and put it back in the box.
      setLastReply('');
      setDraft(text);

      const failure = toAppError(reason, 'Unable to send your reply.');
      // The server read it and said what was wrong with it — that belongs by
      // the box, where fixing it is the retry. Everything else is the request's
      // fault, and the draft is already back, so retrying is one click.
      if (failure.kind === 'rejected') setComposerError(failure);
      else setError(retryable(failure, () => ops.current.submit?.()));
    } finally {
      setAssessing(false);
      setIsBusy(false);
    }
  }, [draft, practiceId, turn, isLoading, stopThemTalking]);

  const continueAfterFeedback = useCallback(async () => {
    if (!reflection) return;

    if (reflection.retry) {
      // Same turn, another go. The checks come along — stripped to their labels
      // — so the second attempt starts from what landed rather than from
      // nothing, without handing back the words that were missing.
      setCarried(strip(reflection.criteria));
      setAttemptNumber(reflection.attemptsOnTurn + 1);
      setReflection(null);
      return;
    }
    // Moving on: the page being left keeps the attempt it was left with, so
    // swiping back to it shows what was said and how it landed.
    const outcome = { reply: lastReply, reflection };
    const next = reflection.nextTurn;
    setSteps((all) => [
      ...all.slice(0, -1),
      { ...all[all.length - 1], outcome },
      ...(next ? [{ turn: next }] : []),
    ]);
    if (next) {
      setReflection(null);
      setCarried(null);
      setAttemptNumber(1);
      setLastReply('');
      setClipPlaying(false);
      return;
    }
    await finish();
  }, [reflection, lastReply, finish]);

  const restart = useCallback(() => {
    setUnitId(null);
    setUnitTitle('');
    setUserGoal('');
    setScene('');
    setTurnCount(0);
    setPracticeId(null);
    setSteps([]);
    setReflection(null);
    setCarried(null);
    setAttemptNumber(1);
    setRecap(null);
    setDraft('');
    setLastReply('');
    setError(null);
    setComposerError(null);
    setAssessing(false);
    navigate('/');
  }, [navigate]);

  ops.current = { start, submit: submitReflection, finish };

  /** The move being practised right now. Per turn, not per unit. */
  const coaching: Coaching | null = turn?.coaching ?? null;

  return {
    unitId,
    unitTitle,
    userGoal,
    scene,
    turnCount,
    startingId,
    practiceId,
    steps,
    turn,
    coaching,
    /** Something has been said back, so there is something to recap. */
    hasReplied: steps.some((step) => !!step.outcome) || !!reflection,
    clipPlaying,
    draft,
    setDraft,
    lastReply,
    reflection,
    carriedCriteria: carried,
    attemptNumber,
    recap,
    isLoading,
    busy,
    error,
    composerError,
    clearError: useCallback(() => setError(null), []),
    clearComposerError: useCallback(() => setComposerError(null), []),
    videoRef,
    voice,
    start,
    submitReflection,
    continueAfterFeedback,
    finish,
    restart,
    markClipPlaying: setClipPlaying,
  };
}

export type Practising = ReturnType<typeof usePractice>;

export default usePractice;
