import React, { useEffect, useRef, useState } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

type OpeningMode = 'CHARACTER_GREETS' | 'USER_STARTS';
type MessageRole = 'USER' | 'CHARACTER';
type Screen = 'scenarios' | 'opening' | 'conversation' | 'recap';

interface Character { name: string; role: string; personality: string; interests: string[]; }
interface Scenario { id: string; title: string; description: string; setting: string; character: Character; }
interface Message { role: MessageRole; text: string; }
interface Session { id: string; scenario: Scenario; openingMode: OpeningMode; messages: Message[]; }
interface Turn { characterReply: string; coachPrompt: string; skillTags: string[]; conversationHealth: string; turnNumber: number; audioBase64?: string; audioContentType?: string; }
interface Recap { strengths: string[]; improvement: string; suggestedFollowUp: string; skillTags: string[]; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body as T;
}

function App() {
  const [screen, setScreen] = useState<Screen>('scenarios');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [openingMode, setOpeningMode] = useState<OpeningMode>('CHARACTER_GREETS');
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState('');
  const [coachPrompt, setCoachPrompt] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    request<Scenario[]>('/scenarios').then(setScenarios).catch((reason: Error) => setError(reason.message)).finally(() => setIsLoading(false));
  }, []);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const chooseScenario = (scenario: Scenario) => { setSelectedScenario(scenario); setOpeningMode('CHARACTER_GREETS'); setError(''); setScreen('opening'); };

  const startSession = async () => {
    if (!selectedScenario) return;
    setIsLoading(true); setError('');
    try {
      const created = await request<Session>('/sessions', { method: 'POST', body: JSON.stringify({ scenarioId: selectedScenario.id, openingMode }) });
      const ready = openingMode === 'CHARACTER_GREETS' ? await request<Session>(`/sessions/${created.id}/opening`, { method: 'POST' }) : created;
      setSession(ready);
      setCoachPrompt(openingMode === 'CHARACTER_GREETS' ? 'Listen for one detail you can respond to, then ask a curious follow-up question.' : 'Start simply: greet them, share one small detail, then ask an easy question.');
      setSkills(['curiosity']); setScreen('conversation');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start practice.'); } finally { setIsLoading(false); }
  };

  const playAudio = (turn: Turn) => {
    if (!turn.audioBase64 || !turn.audioContentType) return;
    void new Audio(`data:${turn.audioContentType};base64,${turn.audioBase64}`).play().catch(() => undefined);
  };

  const submitTurn = async () => {
    if (!session || !draft.trim() || isLoading) return;
    const userMessage: Message = { role: 'USER', text: draft.trim() };
    const submittedDraft = draft.trim();
    setDraft(''); setSession({ ...session, messages: [...session.messages, userMessage] }); setIsLoading(true); setError('');
    try {
      const turn = await request<Turn>(`/sessions/${session.id}/turns`, { method: 'POST', body: JSON.stringify({ text: submittedDraft }) });
      setSession((current) => current ? { ...current, messages: [...current.messages, { role: 'CHARACTER', text: turn.characterReply }] } : current);
      setCoachPrompt(turn.coachPrompt); setSkills(turn.skillTags); playAudio(turn);
    } catch (reason) {
      setDraft(submittedDraft); setSession((current) => current ? { ...current, messages: current.messages.slice(0, -1) } : current);
      setError(reason instanceof Error ? reason.message : 'Unable to send your reply.');
    } finally { setIsLoading(false); }
  };

  const toggleRecording = async () => {
    if (isRecording) { recorderRef.current?.stop(); return; }
    if (!session || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Voice recording is not available in this browser. You can still type your response.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = []; const recorder = new MediaRecorder(stream);
      streamRef.current = stream; recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        setIsRecording(false); stream.getTracks().forEach((track) => track.stop()); setIsLoading(true); setError('');
        try {
          const form = new FormData(); form.append('audio', new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), 'practice-response.webm');
          const result = await request<{ transcript: string }>(`/sessions/${session.id}/transcribe`, { method: 'POST', body: form }); setDraft(result.transcript);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not transcribe that recording.'); } finally { setIsLoading(false); }
      };
      recorder.start(); setIsRecording(true);
    } catch { setError('Microphone access was not granted. You can still type your response.'); }
  };

  const finishPractice = async () => {
    if (!session) return;
    setIsLoading(true); setError('');
    try { setRecap(await request<Recap>(`/sessions/${session.id}/complete`, { method: 'POST' })); setScreen('recap'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate your recap.'); } finally { setIsLoading(false); }
  };

  const restart = () => { setSession(null); setSelectedScenario(null); setRecap(null); setCoachPrompt(''); setSkills([]); setDraft(''); setError(''); setScreen('scenarios'); };

  return <main className="app-shell">
    <header className="topbar"><button className="brand" onClick={restart} aria-label="Return to scenario selection">kora<span>•</span></button><p>Small talk, made easier.</p></header>
    {error && <div className="error-banner" role="alert">{error}</div>}

    {screen === 'scenarios' && <section className="landing">
      <p className="eyebrow">PRACTICE WITHOUT THE PRESSURE</p><h1>Find your flow in conversation.</h1><p className="intro">Choose a situation, talk with a character, and get a gentle nudge when you need one.</p>
      <div className="scenario-grid">{isLoading && <p className="muted">Getting your practice rooms ready…</p>}{scenarios.map((scenario) => <button className="scenario-card" key={scenario.id} onClick={() => chooseScenario(scenario)}>
        <span className="scenario-icon">{scenario.id === 'networking' ? '⌁' : scenario.id === 'party' ? '✦' : '☀'}</span><span className="card-kicker">WITH {scenario.character.name.toUpperCase()}</span><strong>{scenario.title}</strong><span>{scenario.description}</span><em>Start practice →</em>
      </button>)}</div>
    </section>}

    {screen === 'opening' && selectedScenario && <section className="opening-panel">
      <button className="back-button" onClick={() => setScreen('scenarios')}>← All scenarios</button>
      <div className="character-intro"><div className="avatar">{selectedScenario.character.name.charAt(0)}</div><div><p className="eyebrow">{selectedScenario.title.toUpperCase()}</p><h1>Meet {selectedScenario.character.name}.</h1><p>{selectedScenario.character.name} is a {selectedScenario.character.personality.toLowerCase()} {selectedScenario.character.role.toLowerCase()} who enjoys {selectedScenario.character.interests.join(', ')}.</p></div></div>
      <fieldset className="opening-choice"><legend>Who starts the conversation?</legend><button className={openingMode === 'CHARACTER_GREETS' ? 'choice selected' : 'choice'} onClick={() => setOpeningMode('CHARACTER_GREETS')}><strong>Let {selectedScenario.character.name} greet me</strong><span>Ease in by responding to a warm opening.</span></button><button className={openingMode === 'USER_STARTS' ? 'choice selected' : 'choice'} onClick={() => setOpeningMode('USER_STARTS')}><strong>I’ll start</strong><span>Practise opening with a simple hello and question.</span></button></fieldset>
      <button className="primary-button" disabled={isLoading} onClick={startSession}>{isLoading ? 'Starting…' : 'Begin practice'}</button>
    </section>}

    {screen === 'conversation' && session && <section className="conversation-layout">
      <aside className="practice-side"><p className="eyebrow">PRACTISING</p><h2>{session.scenario.title}</h2><div className="mini-character"><span className="avatar small">{session.scenario.character.name.charAt(0)}</span><span><strong>{session.scenario.character.name}</strong><small>{session.scenario.character.role}</small></span></div><button className="quiet-button" onClick={finishPractice} disabled={isLoading || !session.messages.some((message) => message.role === 'USER')}>Finish &amp; see recap</button></aside>
      <div className="talk-panel"><div className="messages" aria-live="polite">{session.messages.length === 0 && <div className="empty-message"><div className="avatar">{session.scenario.character.name.charAt(0)}</div><h2>Your turn to open.</h2><p>Try a simple greeting, then ask an easy question about the setting.</p></div>}{session.messages.map((message, index) => <article className={`message ${message.role.toLowerCase()}`} key={`${message.role}-${index}`}><span>{message.role === 'CHARACTER' ? session.scenario.character.name : 'You'}</span><p>{message.text}</p></article>)}{isLoading && <div className="typing">{isRecording ? 'Listening…' : 'Thinking…'}</div>}</div>
        <div className="composer"><label htmlFor="practice-draft">What would you like to say?</label><textarea id="practice-draft" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Speak or type your response…" rows={3} disabled={isLoading && !isRecording} /><div className="composer-actions"><button className={isRecording ? 'record-button recording' : 'record-button'} onClick={toggleRecording} disabled={isLoading && !isRecording}>{isRecording ? '■ Stop recording' : '● Speak'}</button><button className="primary-button send-button" onClick={submitTurn} disabled={isLoading || !draft.trim()}>Send →</button></div></div>
        <aside className="coach-card"><p className="eyebrow">YOUR NEXT STEP</p><p>{coachPrompt}</p><div>{skills.map((skill) => <span className="tag" key={skill}>{skill.replace(/_/g, ' ')}</span>)}</div></aside>
      </div>
    </section>}

    {screen === 'recap' && recap && <section className="recap-panel"><p className="eyebrow">PRACTICE COMPLETE</p><h1>You kept the conversation moving.</h1><div className="recap-grid"><article><h2>What worked</h2><ul>{recap.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></article><article><h2>Try next time</h2><p>{recap.improvement}</p></article></div><blockquote>“{recap.suggestedFollowUp}”</blockquote><div className="tag-list">{recap.skillTags.map((skill) => <span className="tag" key={skill}>{skill.replace(/_/g, ' ')}</span>)}</div><button className="primary-button" onClick={restart}>Choose another scenario</button></section>}
  </main>;
}

export default App;
