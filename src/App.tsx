import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { request } from './api';
import {
  Beat,
  Check,
  LEVEL_LABEL,
  ModuleDetail,
  ModuleSummary,
  Practice,
  Recap,
  Reflection,
  SUB_SKILL_LABEL,
  SUB_SKILL_ORDER,
  SubSkill,
  Utterance,
} from './types';

type Screen = 'modules' | 'intro' | 'practice' | 'recap';

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
  const bySkill: Record<SubSkill, Check> = {
    FACTS: checks.facts,
    FEELING: checks.feeling,
    INVITATION: checks.invitation,
  };

  return (
    <ul className="scorecard">
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
      <ul className="scorecard">
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

function App() {
  const [screen, setScreen] = useState<Screen>('modules');
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

  const openModule = async (id: string) => {
    setIsLoading(true);
    setError('');
    try {
      setModuleDetail(await request<ModuleDetail>(`/modules/${id}`));
      setScreen('intro');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open that module.');
    } finally {
      setIsLoading(false);
    }
  };

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
      setDraft('');
      setVideoFailed(false);
      setClipWatched(!practice.beat.videoUrl);
      setBeat(practice.beat);
      setScreen('practice');
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
      // Same beat, another go. Her clip has already been watched.
      setReflection(null);
      return;
    }
    if (reflection.nextBeat) {
      const next = reflection.nextBeat;
      setReflection(null);
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
      setScreen('recap');
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
    setScreen('modules');
    setModuleDetail(null);
    setPracticeId(null);
    setBeat(null);
    setUtterances([]);
    setReflection(null);
    setRecap(null);
    setDraft('');
    setError('');
    setBusy(null);
    loggedRef.current = new Set();
  };

  // Replying before she has finished is allowed. Cutting someone off is a real
  // thing people do, and blocking the control taught nothing about it — it just
  // made the page feel broken when a browser never fired `ended`.
  const canRespond = !reflection && !isLoading;
  const sheIsStillTalking = hasClip && !clipWatched;

  /** She stops when the learner takes their turn — talking over each other helps nobody. */
  const stopHerTalking = () => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={restart} aria-label="Back to the gym">
          kora<span>•</span>
        </button>
        <p>One conversation skill at a time.</p>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {screen === 'modules' && (
        <section className="landing">
          <p className="eyebrow">THE CONVERSATION GYM</p>
          <h1>Practise one skill until it's yours.</h1>
          <p className="intro">
            Short, repeatable exercises. Someone tells you something real, you reply out loud, and
            you find out exactly what you caught and what you missed.
          </p>
          <div className="module-grid">
            {isLoading && <p className="muted">Opening the gym…</p>}
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} onChoose={() => openModule(module.id)} />
            ))}
          </div>
        </section>
      )}

      {screen === 'intro' && moduleDetail && (
        <section className="intro-panel">
          <button className="back-button" onClick={restart}>
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
                </span>
              </li>
            ))}
          </ol>

          <p className="muted small">
            Repeating someone's exact words back isn't reflecting. The point is to show you
            understood — not that you were recording.
          </p>

          <button className="primary-button" disabled={isLoading} onClick={startPractice}>
            {isLoading ? 'Starting…' : 'Start practising'}
          </button>
        </section>
      )}

      {screen === 'practice' && beat && (
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
                <label htmlFor="reflection-draft">
                  What would you say back to {beat.speaker}?
                </label>
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
      )}

      {screen === 'recap' && recap && (
        <section className="recap-panel">
          <p className="eyebrow">PRACTICE COMPLETE</p>
          <h1>You listened for {recap.turnsCompleted === 1 ? 'a turn' : 'the whole conversation'}.</h1>
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
      )}
    </main>
  );
}

export default App;
