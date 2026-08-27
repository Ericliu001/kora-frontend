import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import { request } from './api';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import {
  Beat,
  Check,
  Checks,
  joinPhrases,
  LEVEL_LABEL,
  ModuleDetail,
  ModuleSummary,
  Practice,
  Recap,
  Reflection,
  RETRY_PROMPT,
  SUB_SKILL_LABEL,
  SUB_SKILL_ORDER,
  SubSkill,
  SubSkillInfo,
  Utterance,
} from './types';

/**
 * Mirrors MAX_ATTEMPTS_PER_BEAT in backend/.../plugins/GymRouting.kt.
 *
 * The server decides when a learner has had enough tries; this copy exists
 * only so the composer can say how many are left. If the two ever disagree,
 * the server is right and this line is the bug.
 */
const MAX_ATTEMPTS_PER_BEAT = 3;

/** The three checks, addressable by sub-skill rather than by field name. */
const checkBySkill = (checks: Checks): Record<SubSkill, Check> => ({
  FACTS: checks.facts,
  FEELING: checks.feeling,
  INVITATION: checks.invitation,
});

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

function ModuleCard({ module, onChoose }: { module: ModuleSummary; onChoose: () => void }) {
  return (
    <button className="module-card" onClick={onChoose}>
      <span className="module-icon">◠</span>
      <span className="card-kicker">MODULE 1</span>
      <strong>{module.title}</strong>
      <span className="module-blurb">{module.blurb}</span>
      <em>
        {module.subSkillCount} sub-skills · about {module.estimatedMinutes} min →
      </em>
    </button>
  );
}

/**
 * The lesson itself, not decoration: three named things a reflection should do,
 * shown in the same order every time so the learner builds a checklist.
 */
function ReflectionScorecard({ checks }: { checks: Reflection['checks'] }) {
  const bySkill = checkBySkill(checks);

  return (
    <ul className="scorecard" aria-label="Your reflection, check by check">
      {SUB_SKILL_ORDER.map((skill, index) => {
        const check = bySkill[skill];
        return (
          <li
            key={skill}
            className={check.captured ? 'check captured' : 'check missed'}
            style={{ animationDelay: `${index * 140}ms` }}
          >
            <span className="check-mark" aria-hidden="true">
              {check.captured ? '✓' : '○'}
            </span>
            <span className="check-body">
              <strong>{SUB_SKILL_LABEL[skill]}</strong>
              <span>
                {check.captured
                  ? check.evidence ?? 'You captured this.'
                  : check.missed
                    ? `Missing: ${check.missed}`
                    : 'Not yet.'}
              </span>
            </span>
            <span className="visually-hidden">
              {check.captured ? 'captured' : 'not captured'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The three sub-skills, in front of the learner while they are composing.
 *
 * These are the same three rows in the same order as [ReflectionScorecard],
 * deliberately: the list you aim at and the list you are marked against should
 * be one object seen at two moments, not two lists that happen to rhyme.
 *
 * [checks] arrives only on a second attempt, and only ever as ticks. What was
 * missed stays generic — `evidence` and `missed` carry the rubric's own words
 * and are never rendered here, so finding them is still the learner's job the
 * second time around.
 */
function ComposerGuide({
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

/**
 * What sits where the feedback will land while the server is judging.
 *
 * It mirrors the scorecard's shape so the three rows stay put when the real
 * checks arrive — and naming the sub-skills again while the learner waits is
 * one more repetition of the thing the module is teaching.
 */
function ReflectionPending() {
  return (
    <div className="feedback-panel" aria-busy="true">
      <p className="eyebrow">CHECKING YOUR REFLECTION</p>
      <ul className="scorecard" aria-label="Your reflection, check by check">
        {SUB_SKILL_ORDER.map((skill, index) => (
          <li key={skill} className="check pending" style={{ animationDelay: `${index * 140}ms` }}>
            <span className="check-mark" aria-hidden="true">
              ·
            </span>
            <span className="check-body">
              <strong>{SUB_SKILL_LABEL[skill]}</strong>
              <span className="skeleton-line" aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
      <p className="pending-note" role="status">
        Listening back over what you said…
      </p>
    </div>
  );
}

/**
 * The speaker's clip. Rendered only when there is video to play — a written
 * beat (or a clip that won't load) puts her words straight into the transcript
 * instead, so her line is never on screen in two places at once.
 *
 * The element is owned by the caller: replying mid-sentence has to be able to
 * stop her talking.
 */
function BeatStage({
  beat,
  videoRef,
  onEnded,
  onUnavailable,
}: {
  beat: Beat;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onEnded: () => void;
  onUnavailable: () => void;
}) {
  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  return (
    <div className="stage">
      <video
        ref={videoRef}
        className="beat-video"
        src={beat.videoUrl}
        poster={beat.posterUrl}
        controls
        playsInline
        onEnded={onEnded}
        // No clip on disk yet, or a codec this browser won't take.
        onError={onUnavailable}
      />
      <div className="stage-actions">
        <button className="quiet-button" onClick={replay}>
          ↺ Play again
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

/**
 * Loads whichever module the URL names.
 *
 * The fetch is keyed off the route param rather than off a click, which is what
 * makes /modules/listen-and-reflect work when it is pasted into a fresh tab.
 */
function ModuleIntro({
  moduleDetail,
  isLoading,
  onLoad,
  onBack,
  onStart,
}: {
  moduleDetail: ModuleDetail | null;
  isLoading: boolean;
  onLoad: (id: string) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const { moduleId } = useParams<{ moduleId: string }>();

  useEffect(() => {
    if (moduleId && moduleDetail?.id !== moduleId) onLoad(moduleId);
  }, [moduleId, moduleDetail?.id, onLoad]);

  if (!moduleDetail || moduleDetail.id !== moduleId) {
    return (
      <section className="intro-panel">
        <p className="muted">Opening the module…</p>
      </section>
    );
  }

  return (
    <section className="intro-panel">
      <button className="back-button" onClick={onBack}>
        ← All modules
      </button>
      <p className="eyebrow">{moduleDetail.skill.toUpperCase()}</p>
      <h1>{moduleDetail.title}</h1>
      <p className="intro">{moduleDetail.blurb}</p>

      <ol className="teaches">
        {moduleDetail.teaches.map((item, index) => (
          <li key={item.skill}>
            <span className="teach-number">{index + 1}</span>
            <span>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
              <em className="teach-purpose">{item.purpose}</em>
            </span>
          </li>
        ))}
      </ol>

      <p className="muted small">
        Repeating someone's exact words back isn't reflecting. The point is to show you understood —
        not that you were recording.
      </p>

      <button className="primary-button" disabled={isLoading} onClick={onStart}>
        {isLoading ? 'Starting…' : 'Start practising'}
      </button>
    </section>
  );
}

function App() {
  const navigate = useNavigate();

  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);

  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [clipWatched, setClipWatched] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);

  // What survives a retry. Dropping the checks with the feedback card sent the
  // learner back to an identical blank prompt with nothing to aim at, which is
  // the one moment in the loop where they most need something to aim at.
  const [carriedChecks, setCarriedChecks] = useState<Checks | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  // The two waits the learner actually notices, each with something to say.
  const [busy, setBusy] = useState<'assessing' | 'transcribing' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Which beats have already had their line written into the transcript. A ref,
  // not state, because a retry must not log her line a second time and this
  // must survive Strict Mode's double effect without causing another render.
  const loggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    request<ModuleSummary[]>('/modules')
      .then(setModules)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  /** Put her line in the transcript. Once per beat, whenever it first belongs there. */
  const revealHerLine = useCallback((current: Beat) => {
    if (loggedRef.current.has(current.id)) return;
    loggedRef.current.add(current.id);
    setUtterances((all) => [
      ...all,
      { speaker: 'THEM', name: current.speaker, text: current.transcript },
    ]);
  }, []);

  /**
   * Move a finished turn into the transcript. On a filmed beat her line has not
   * been written down yet, so it goes in just ahead of the reply.
   */
  const logReply = useCallback((current: Beat, reply: string) => {
    setUtterances((all) => {
      const hers = loggedRef.current.has(current.id)
        ? []
        : [{ speaker: 'THEM' as const, name: current.speaker, text: current.transcript }];
      loggedRef.current.add(current.id);
      return [...all, ...hers, { speaker: 'YOU' as const, name: 'You', text: reply }];
    });
  }, []);

  // No clip to watch — her words go straight into the conversation.
  const hasClip = !!beat?.videoUrl && !videoFailed;
  useEffect(() => {
    if (beat && !hasClip) {
      setClipWatched(true);
      revealHerLine(beat);
    }
  }, [beat, hasClip, revealHerLine]);

  const openModule = (id: string) => navigate(`/modules/${id}`);

  const loadModule = useCallback(async (id: string) => {
    setIsLoading(true);
    setError('');
    try {
      setModuleDetail(await request<ModuleDetail>(`/modules/${id}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open that module.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startPractice = async () => {
    if (!moduleDetail) return;
    setIsLoading(true);
    setError('');
    try {
      const practice = await request<Practice>('/practices', {
        method: 'POST',
        body: JSON.stringify({ moduleId: moduleDetail.id }),
      });
      loggedRef.current = new Set();
      setPracticeId(practice.id);
      setUtterances([]);
      setReflection(null);
      setCarriedChecks(null);
      setAttemptNumber(1);
      setDraft('');
      setVideoFailed(false);
      setClipWatched(!practice.beat.videoUrl);
      setBeat(practice.beat);
      // Last, so the route guard sees a practice in flight when it renders.
      navigate('/practice');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start practising.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitReflection = async () => {
    const text = draft.trim();
    if (!practiceId || !beat || !text || isLoading) return;

    stopHerTalking();

    // Show the reply landing straight away and wait underneath it, rather than
    // leaving the learner staring at their own unsent draft.
    const previousUtterances = utterances;
    const herLineWasLogged = loggedRef.current.has(beat.id);
    logReply(beat, text);
    setDraft('');
    setIsLoading(true);
    setBusy('assessing');
    setError('');

    try {
      setReflection(
        await request<Reflection>(`/practices/${practiceId}/reflections`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        }),
      );
    } catch (reason) {
      // Put the conversation back exactly as it was, draft included.
      setUtterances(previousUtterances);
      if (!herLineWasLogged) loggedRef.current.delete(beat.id);
      setDraft(text);
      setError(reason instanceof Error ? reason.message : 'Unable to send your reflection.');
    } finally {
      setBusy(null);
      setIsLoading(false);
    }
  };

  const continueAfterFeedback = async () => {
    if (!reflection) return;

    if (reflection.retry) {
      // Same beat, another go. Her clip has already been watched — and the
      // checks come with them, so the second attempt starts from what landed
      // rather than from nothing.
      setCarriedChecks(reflection.checks);
      setAttemptNumber(reflection.attemptsOnBeat + 1);
      setReflection(null);
      return;
    }
    if (reflection.nextBeat) {
      const next = reflection.nextBeat;
      setReflection(null);
      setCarriedChecks(null);
      setAttemptNumber(1);
      setVideoFailed(false);
      setClipWatched(!next.videoUrl);
      setBeat(next);
      return;
    }
    await finish();
  };

  const finish = async () => {
    if (!practiceId) return;
    setIsLoading(true);
    setError('');
    try {
      setRecap(await request<Recap>(`/practices/${practiceId}/complete`, { method: 'POST' }));
      navigate('/recap');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to build your recap.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    if (!practiceId || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not available in this browser. You can still type your reply.');
      return;
    }
    stopHerTalking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        setIsLoading(true);
        setBusy('transcribing');
        setError('');
        try {
          const form = new FormData();
          form.append(
            'audio',
            new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }),
            'reflection.webm',
          );
          const result = await request<{ transcript: string }>(
            `/practices/${practiceId}/transcribe`,
            { method: 'POST', body: form },
          );
          setDraft(result.transcript);
        } catch (reason) {
          setError(
            reason instanceof Error ? reason.message : 'We could not transcribe that recording.',
          );
        } finally {
          setBusy(null);
          setIsLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access was not granted. You can still type your reply.');
    }
  };

  const restart = () => {
    setModuleDetail(null);
    setPracticeId(null);
    setBeat(null);
    setUtterances([]);
    setReflection(null);
    setCarriedChecks(null);
    setAttemptNumber(1);
    setRecap(null);
    setDraft('');
    setError('');
    setBusy(null);
    loggedRef.current = new Set();
    navigate('/');
  };

  // Replying before she has finished is allowed. Cutting someone off is a real
  // thing people do, and blocking the control taught nothing about it — it just
  // made the page feel broken when a browser never fired `ended`.
  const canRespond = !reflection && !isLoading;
  const sheIsStillTalking = hasClip && !clipWatched;

  // Which of the three are still open on a second attempt. Named by move, not
  // by content: `RETRY_PROMPT` says "name how they feel", never the feeling.
  const stillOpen = carriedChecks
    ? SUB_SKILL_ORDER.filter((skill) => !checkBySkill(carriedChecks)[skill].captured)
    : [];

  const composerLabel =
    stillOpen.length > 0
      ? `Try again — this time, ${joinPhrases(stillOpen.map((skill) => RETRY_PROMPT[skill]))}.`
      : `What would you say back to ${beat?.speaker ?? 'them'}?`;

  /** She stops when the learner takes their turn — talking over each other helps nobody. */
  const stopHerTalking = () => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  };

  const landing = (
    <>
      <section className="hero bg-pattern-onion-hero">
        <div className="hero-content">
          <p className="eyebrow">THE CONVERSATION GYM</p>
          <h1>Practise one skill until it's yours.</h1>
          <p>
            Short, repeatable exercises. Someone tells you something real, you reply out loud, and
            you find out exactly what you caught and what you missed.
          </p>
        </div>
      </section>

      <div className="container landing">
        <div className="module-grid">
          {isLoading && <p className="muted">Opening the gym…</p>}
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} onChoose={() => openModule(module.id)} />
          ))}
        </div>
      </div>
    </>
  );

  const practice = beat ? (
    <section className="practice-layout">
      <aside className="practice-side">
        <p className="eyebrow">PRACTISING</p>
        <h2>{moduleDetail?.title ?? 'Listen and reflect'}</h2>
        <p className="muted small">Turn {beat.turnNumber}</p>
        <button
          className="quiet-button"
          onClick={finish}
          disabled={isLoading || utterances.every((line) => line.speaker === 'THEM')}
        >
          Finish &amp; see recap
        </button>
      </aside>

      <div className="practice-panel">
        {hasClip && (
          <BeatStage
            beat={beat}
            videoRef={videoRef}
            onEnded={() => setClipWatched(true)}
            onUnavailable={() => setVideoFailed(true)}
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

            <button className="primary-button" onClick={continueAfterFeedback} disabled={isLoading}>
              {reflection.retry
                ? 'Try that again'
                : reflection.complete
                  ? 'See your recap →'
                  : 'Continue →'}
            </button>
          </div>
        ) : (
          <div className="composer">
            <ComposerGuide
              key={`${beat.id}-${attemptNumber}`}
              teaches={moduleDetail?.teaches ?? []}
              checks={carriedChecks}
              startOpen={beat.turnNumber === 1 || attemptNumber > 1}
            />
            <label htmlFor="reflection-draft">{composerLabel}</label>
            {attemptNumber > 1 && (
              <p className="composer-attempt">
                Attempt {attemptNumber} of {MAX_ATTEMPTS_PER_BEAT}
              </p>
            )}
            <textarea
              id="reflection-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Speak or type your reply…"
              rows={3}
              disabled={!canRespond && !isRecording}
            />
            <div className="composer-actions">
              <button
                className={isRecording ? 'record-button recording' : 'record-button'}
                onClick={toggleRecording}
                disabled={(isLoading && !isRecording) || !!reflection}
              >
                {isRecording ? '■ Stop recording' : '● Speak'}
              </button>
              <button
                className="primary-button send-button"
                onClick={submitReflection}
                disabled={!canRespond || !draft.trim()}
              >
                Reflect back →
              </button>
            </div>
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
              {isRecording ? 'Recording your reply' : ''}
            </span>
          </div>
        )}
      </div>
    </section>
  ) : (
    // Someone landed on /practice cold, or reloaded mid-exercise. There is no
    // conversation to resume — the transcript only ever lived in memory.
    <Navigate to="/" replace />
  );

  return (
    <div className="app-shell">
      <SiteHeader />

      <main>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <Routes>
          <Route path="/" element={landing} />
          <Route
            path="/modules/:moduleId"
            element={
              <ModuleIntro
                moduleDetail={moduleDetail}
                isLoading={isLoading}
                onLoad={loadModule}
                onBack={restart}
                onStart={startPractice}
              />
            }
          />
          <Route path="/practice" element={practice} />
          <Route
            path="/recap"
            element={
              recap ? (
                <section className="recap-panel">
                  <p className="eyebrow">PRACTICE COMPLETE</p>
                  <h1>
                    You listened for {recap.turnsCompleted === 1 ? 'a turn' : 'the whole conversation'}.
                  </h1>
                  <p className="intro">{recap.summary}</p>

                  <div className="level-run">
                    {recap.levels.map((level, index) => (
                      <span className={`level-pip ${level.toLowerCase()}`} key={index}>
                        {LEVEL_LABEL[level]}
                      </span>
                    ))}
                  </div>

                  <div className="exemplar">
                    <p className="card-kicker">ONE TO KEEP</p>
                    <blockquote>“{recap.suggestedLine}”</blockquote>
                  </div>

                  <button className="primary-button" onClick={restart}>
                    Back to the gym
                  </button>
                </section>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SiteFooter />
    </div>
  );
}

export default App;
