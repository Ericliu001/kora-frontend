import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// App reads the route, so it needs a router around it. MemoryRouter keeps that
// entirely in memory — no jsdom history to reset between tests.
const renderApp = () => render(<MemoryRouter><App /></MemoryRouter>);

// Fixtures mirroring what the Ktor backend sends.
const MODULE_SUMMARY = {
  id: 'listen-and-reflect',
  title: 'Listen and reflect',
  skill: 'Reflective listening',
  blurb: 'Show someone you heard them.',
  subSkillCount: 3,
  estimatedMinutes: 5,
};

const MODULE_DETAIL = {
  ...MODULE_SUMMARY,
  teaches: [
    {
      skill: 'FACTS',
      label: 'Reflect the facts',
      description: 'Say back what happened.',
      purpose: 'Their words back at them proves you were recording.',
    },
    {
      skill: 'FEELING',
      label: 'Recognise the emotion',
      description: 'Name how they feel.',
      purpose: 'This is what makes someone feel heard.',
    },
    {
      skill: 'INVITATION',
      label: 'Invite them to continue',
      description: 'Leave an opening.',
      purpose: 'It hands the conversation back.',
    },
  ],
  exerciseCount: 1,
};

const FILMED_BEAT = {
  id: 'new-job-1',
  speaker: 'Nadia',
  transcript:
    "I started a new job last week. Everyone's been really friendly, but there's so much to learn.",
  turnNumber: 1,
  videoUrl: '/modules/listen-and-reflect/new-job-1.mp4',
};

const WRITTEN_BEAT = {
  id: 'new-job-2b',
  speaker: 'Nadia',
  transcript: 'Exactly. And I keep worrying I will ask something I should already know.',
  turnNumber: 2,
};

const REFLECTION = {
  level: 'BETTER',
  checks: {
    facts: { captured: true, evidence: 'you reflected that she started a new job' },
    feeling: { captured: true, evidence: 'you named that she feels overwhelmed' },
    invitation: { captured: false, missed: 'an invitation to keep going' },
  },
  feedback: 'You caught both what happened and how she feels. Now try leaving her an opening.',
  exemplar: { tier: 'BEST', text: 'Starting somewhere new can be a lot. What has been hardest?' },
  attemptsOnBeat: 1,
  retry: false,
  nextBeat: WRITTEN_BEAT,
  complete: false,
};

/** A first attempt that lands the facts only, so the learner is sent back. */
const RETRY_REFLECTION = {
  ...REFLECTION,
  level: 'DEVELOPING',
  checks: {
    facts: { captured: true, evidence: 'you reflected that she started a new job' },
    feeling: { captured: false, missed: 'overwhelmed' },
    invitation: { captured: false, missed: 'an invitation to keep going' },
  },
  exemplar: { tier: 'BETTER', text: 'It sounds like that has left you overwhelmed.' },
  attemptsOnBeat: 1,
  retry: true,
  nextBeat: undefined,
};

function mockBackend(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    '/modules': [MODULE_SUMMARY],
    '/modules/listen-and-reflect': MODULE_DETAIL,
    '/practices': { id: 'p1', moduleId: 'listen-and-reflect', beat: FILMED_BEAT },
    '/practices/p1/reflections': REFLECTION,
    ...overrides,
  };

  jest.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((path) => url.endsWith(path));
    if (!match) return Promise.reject(new Error(`unmocked route: ${url}`));
    return Promise.resolve({ ok: true, json: () => Promise.resolve(routes[match]) } as Response);
  });
}

afterEach(() => jest.restoreAllMocks());

/** jsdom never fires `ended` on its own — the clip has to be told it finished. */
function fireOnVideo(event: 'ended' | 'error') {
  const video = document.querySelector('video');
  if (!video) throw new Error('no video on the stage');
  video.dispatchEvent(new Event(event));
}

// By role, not by label: the label is the guidance now, and it changes between
// a first attempt and a retry. The textarea is the only textbox on the page.
const composer = () => screen.findByRole('textbox');

async function reachThePracticeRoom() {
  userEvent.click(await screen.findByRole('button', { name: /listen and reflect/i }));
  userEvent.click(await screen.findByRole('button', { name: /start practising/i }));
  await composer();
}

async function reflectWith(text: string) {
  userEvent.type(await composer(), text);
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));
}

test('the gym lists its modules', async () => {
  mockBackend();
  renderApp();
  expect(await screen.findByRole('button', { name: /listen and reflect/i })).toBeInTheDocument();
});

test('the module intro names all three sub-skills before practice starts', async () => {
  mockBackend();
  renderApp();

  userEvent.click(await screen.findByRole('button', { name: /listen and reflect/i }));

  expect(await screen.findByText('Reflect the facts')).toBeInTheDocument();
  expect(screen.getByText('Recognise the emotion')).toBeInTheDocument();
  expect(screen.getByText('Invite them to continue')).toBeInTheDocument();
});

test('the learner can reply before the clip has finished', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  // Nothing is blocked while she is still talking — only signposted.
  expect(screen.getByRole('button', { name: /speak/i })).toBeEnabled();
  expect(screen.getByText(/nadia is still talking/i)).toBeInTheDocument();

  fireOnVideo('ended');

  await waitFor(() =>
    expect(screen.queryByText(/nadia is still talking/i)).not.toBeInTheDocument(),
  );
});

test('taking your turn stops her talking', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const video = document.querySelector('video')!;
  Object.defineProperty(video, 'paused', { value: false, configurable: true });
  const pause = jest.spyOn(video, 'pause').mockImplementation(() => undefined);

  await reflectWith('That sounds like a lot.');

  // Otherwise she keeps talking over the feedback the learner is trying to read.
  expect(pause).toHaveBeenCalled();
});

test('her filmed words stay out of the transcript until the learner has replied', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  // The clip is the presentation; showing the text too would let them read
  // instead of listen.
  expect(screen.queryByText(FILMED_BEAT.transcript)).not.toBeInTheDocument();

  await reflectWith('That sounds like a lot.');

  expect(await screen.findByText(FILMED_BEAT.transcript)).toBeInTheDocument();
});

test('a retry does not log her line to the transcript twice', async () => {
  mockBackend({
    '/practices/p1/reflections': { ...REFLECTION, retry: true, nextBeat: undefined, level: 'DEVELOPING' },
  });
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('You started a new job.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));
  await reflectWith('You started a new job and it sounds like a lot.');

  await waitFor(() => expect(screen.getAllByText(FILMED_BEAT.transcript)).toHaveLength(1));
});

test('submitting a reflection shows all three checks, the feedback and a stronger reply', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('That sounds like a lot to take in.');

  // Wait for the real feedback — the pending card renders a scorecard too.
  await screen.findByText(REFLECTION.feedback);

  const scorecard = screen.getByRole('list', { name: /your reflection/i });
  const items = within(scorecard).getAllByRole('listitem');
  expect(items).toHaveLength(3);

  expect(items[0]).toHaveTextContent('The facts');
  expect(items[0]).toHaveTextContent(REFLECTION.checks.facts.evidence);
  expect(items[0]).toHaveClass('captured');

  expect(items[2]).toHaveTextContent('The invitation');
  expect(items[2]).toHaveTextContent('an invitation to keep going');
  expect(items[2]).toHaveClass('missed');

  expect(screen.getByText(`“${REFLECTION.exemplar.text}”`)).toBeInTheDocument();
  expect(screen.getByText('That sounds like a lot to take in.')).toBeInTheDocument();
});

test('continuing moves to the written beat, which needs no clip', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('A lot to take in.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  expect(await screen.findByText(WRITTEN_BEAT.transcript)).toBeInTheDocument();
  expect(document.querySelector('video')).toBeNull();
  // Nothing to wait for, so the learner can answer straight away.
  expect(screen.getByRole('button', { name: /speak/i })).toBeEnabled();
});

test('a written beat shows her line once, not on the stage and in the transcript', async () => {
  mockBackend({
    '/practices/p1/reflections': { ...REFLECTION, nextBeat: undefined, complete: false, retry: true },
  });
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('error');

  // Her words are in the conversation exactly once before the reply...
  await waitFor(() => expect(screen.getAllByText(FILMED_BEAT.transcript)).toHaveLength(1));

  await reflectWith('That sounds like a lot.');
  await screen.findByText(REFLECTION.feedback);

  // ...and still exactly once while the feedback is on screen.
  expect(screen.getAllByText(FILMED_BEAT.transcript)).toHaveLength(1);
});

test('the reply lands immediately and a pending card holds the place', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  // Hold the assessment open so the waiting state is observable.
  let release: () => void = () => undefined;
  jest.spyOn(global, 'fetch').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ ok: true, json: () => Promise.resolve(REFLECTION) } as Response);
      }),
  );

  await reflectWith('That sounds like a lot to take in.');

  // The reply is already in the conversation, and the composer has stood down.
  expect(await screen.findByText('That sounds like a lot to take in.')).toBeInTheDocument();
  expect(screen.getByText(/listening back over what you said/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /reflect back/i })).not.toBeInTheDocument();

  release();

  expect(await screen.findByText(REFLECTION.feedback)).toBeInTheDocument();
  expect(screen.queryByText(/listening back over what you said/i)).not.toBeInTheDocument();
});

test('a failed reflection rolls the conversation back, draft included', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  userEvent.type(await composer(), 'Sounds like a lot.');

  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: 'Assessment failed (502).' }),
  } as Response);
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Assessment failed (502).');
  expect(await composer()).toHaveValue('Sounds like a lot.');

  // The optimistic turn is gone again — hers and the learner's both.
  expect(screen.queryByText('Sounds like a lot.', { selector: 'p' })).not.toBeInTheDocument();
  expect(screen.queryByText(FILMED_BEAT.transcript)).not.toBeInTheDocument();
});

test('the composer names the three sub-skills, and why each one works', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const guide = screen.getByRole('list', { name: /what to aim for/i });
  const rows = within(guide).getAllByRole('listitem');
  expect(rows).toHaveLength(3);

  // The instruction and the reason for it, in scorecard order.
  expect(rows[0]).toHaveTextContent('Reflect the facts');
  expect(rows[0]).toHaveTextContent('Their words back at them proves you were recording.');
  expect(rows[1]).toHaveTextContent('Recognise the emotion');
  expect(rows[2]).toHaveTextContent('It hands the conversation back.');
});

test('a retry keeps what landed and asks for what is still open', async () => {
  mockBackend({ '/practices/p1/reflections': RETRY_REFLECTION });
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('You started a new job.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));

  // The prompt now names the two moves that are missing, and only those.
  expect(
    await screen.findByText(/try again — this time, name how they feel and leave them an opening\./i),
  ).toBeInTheDocument();
  expect(screen.getByText(/attempt 2 of 3/i)).toBeInTheDocument();

  const rows = within(screen.getByRole('list', { name: /what to aim for/i })).getAllByRole(
    'listitem',
  );
  expect(rows[0]).toHaveClass('captured');
  expect(rows[1]).toHaveClass('open');
  expect(rows[2]).toHaveClass('open');
});

test('the retry guidance points at the missing move without giving the answer', async () => {
  mockBackend({ '/practices/p1/reflections': RETRY_REFLECTION });
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('You started a new job.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));
  await screen.findByRole('list', { name: /what to aim for/i });

  // The rubric's own words live in `missed` and `evidence`. They belong in the
  // scorecard after an attempt, never in front of the next one — otherwise the
  // second try is copying, not reflecting.
  const composerPanel = document.querySelector('.composer')!;
  expect(composerPanel).not.toHaveTextContent('overwhelmed');
  expect(composerPanel).not.toHaveTextContent('an invitation to keep going');
  expect(composerPanel).not.toHaveTextContent(RETRY_REFLECTION.checks.facts.evidence);
});

test('moving to the next beat clears the retry guidance', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  await reflectWith('A lot to take in.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  expect(await screen.findByText(/what would you say back to nadia\?/i)).toBeInTheDocument();
  expect(screen.queryByText(/attempt 2 of 3/i)).not.toBeInTheDocument();
});

test('a missing clip falls back to her words rather than blocking the exercise', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  fireOnVideo('error');

  // Her words take the stage, exactly once, and the exercise carries on.
  await waitFor(() => expect(screen.getAllByText(FILMED_BEAT.transcript)).toHaveLength(1));
  expect(screen.getByRole('button', { name: /speak/i })).toBeEnabled();
});
