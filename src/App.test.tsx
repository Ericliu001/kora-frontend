import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// App reads the route, so it needs a router around it. MemoryRouter keeps that
// entirely in memory — no jsdom history to reset between tests.
const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

// Fixtures mirroring what the Ktor backend sends.
const TEACHES = [
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
];

const BUILT_UNIT = {
  id: 'listen-and-reflect',
  moduleId: 'skills',
  title: "Show that you're listening",
  blurb: 'Practise paraphrasing, noticing emotions, and holding advice back.',
  playable: true,
  skill: 'Reflective listening',
  subSkillCount: 3,
  estimatedMinutes: 5,
  coverUrl: 'https://media.onionloop.com/beats/new-job-1/5014424cade0/poster.jpg',
};

/** A unit that is on the map and nothing more. */
const soon = (id: string, moduleId: string, title: string) => ({
  id,
  moduleId,
  title,
  blurb: `${title} — one day.`,
  playable: false,
});

const CATALOG = [
  {
    id: 'skills',
    title: 'Skills',
    blurb: 'The moves a conversation is made of.',
    units: [
      BUILT_UNIT,
      soon('go-wide-first', 'skills', 'Go wide first'),
      soon('find-common-ground', 'skills', 'Find common ground'),
    ],
  },
  {
    id: 'emotions',
    title: 'Emotions',
    blurb: 'Noticing what you and other people feel.',
    units: [soon('sit-with-discomfort', 'emotions', 'Sit with discomfort')],
  },
  {
    id: 'heart',
    title: 'Heart',
    blurb: 'Attention, honesty and care.',
    units: [soon('let-yourself-be-known', 'heart', 'Let yourself be known')],
  },
];

const FILMED_BEAT = {
  id: 'new-job-1',
  speaker: 'Nadia',
  transcript:
    "I started a new job last week. Everyone's been really friendly, but there's so much to learn.",
  turnNumber: 1,
  videoUrl: 'https://media.onionloop.com/beats/new-job-1/5014424cade0/720.mp4',
};

const WRITTEN_BEAT = {
  id: 'new-job-2b',
  speaker: 'Nadia',
  transcript: 'Exactly. And I keep worrying I will ask something I should already know.',
  turnNumber: 2,
};

const PRACTICE = {
  id: 'p1',
  unitId: 'listen-and-reflect',
  unitTitle: BUILT_UNIT.title,
  teaches: TEACHES,
  beat: FILMED_BEAT,
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
    '/catalog': CATALOG,
    '/practices': PRACTICE,
    '/practices/p1/reflections': REFLECTION,
    ...overrides,
  };

  jest.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const match = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((path) => url.endsWith(path));
    if (!match) return Promise.reject(new Error(`unmocked route: ${url}`));
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(routes[match]),
    } as Response);
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

const tile = () => screen.findByRole('button', { name: /show that you're listening/i });

/** One click. There is nothing between the grid and the practice room. */
async function reachThePracticeRoom() {
  userEvent.click(await tile());
  await composer();
}

async function reflectWith(text: string) {
  userEvent.type(await composer(), text);
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));
}

// ---------------------------------------------------------------------------
// The curriculum
// ---------------------------------------------------------------------------

test('the home page lays out all three modules, in order', async () => {
  mockBackend();
  const { container } = renderApp();

  await screen.findByRole('heading', { name: 'Skills' });
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Skills', 'Emotions', 'Heart']);

  // Every unit in the catalogue is on the page, written or not.
  expect(container.querySelectorAll('.unit-grid > li')).toHaveLength(5);
});

test('a unit nobody has written yet is on the map, but is not a door', async () => {
  mockBackend();
  renderApp();
  await tile();

  // Readable, and not a disabled button: a disabled button leaves the tab
  // order, and being read is the whole job of a roadmap.
  expect(screen.getByText('Find common ground')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /find common ground/i })).not.toBeInTheDocument();
  expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
});

test('a unit with no cover art still gets a cover', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  // One real still, four stand-ins.
  expect(container.querySelectorAll('.unit-cover img')).toHaveLength(1);
  expect(container.querySelectorAll('.unit-cover.is-generated')).toHaveLength(4);
});

test('cover art that will not load falls back rather than showing a broken image', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  const image = container.querySelector('.unit-cover img') as HTMLImageElement;
  image.dispatchEvent(new Event('error'));

  await waitFor(() => expect(container.querySelectorAll('.unit-cover img')).toHaveLength(0));
  expect(container.querySelectorAll('.unit-cover.is-generated')).toHaveLength(5);
});

// ---------------------------------------------------------------------------
// Getting into a practice
// ---------------------------------------------------------------------------

test('clicking a unit starts training, with nothing in between', async () => {
  mockBackend();
  renderApp();
  userEvent.click(await tile());

  expect(await composer()).toBeInTheDocument();
  const [, options] = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
    String(url).endsWith('/practices'),
  );
  expect(JSON.parse(options.body)).toEqual({ unitId: 'listen-and-reflect' });
});

test('the tile says it is starting while the server is thinking', async () => {
  mockBackend();
  renderApp();
  await tile();

  // Held open after the catalogue has landed, so it is the practice we are
  // waiting on and not the grid.
  let release = () => {};
  (global.fetch as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () =>
          resolve({ ok: true, status: 200, json: () => Promise.resolve(PRACTICE) } as Response);
      }),
  );
  userEvent.click(await tile());

  expect(await screen.findByText(/starting…/i)).toBeInTheDocument();
  release();
  expect(await composer()).toBeInTheDocument();
});

test('a start that fails leaves you on the home page, beside the tile you clicked', async () => {
  mockBackend();
  renderApp();
  await tile();

  failWith(500, { error: 'boom', code: 'INTERNAL' });
  userEvent.click(await tile());

  expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong on our side/i);
  // Still here, and still clickable — no bouncing to a practice screen that
  // would then have to explain itself.
  expect(await tile()).toBeEnabled();

  userEvent.click(await tile());
  expect(await composer()).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// Arriving by URL
// ---------------------------------------------------------------------------

test('a pasted unit link starts training with no click', async () => {
  mockBackend();
  renderApp('/units/listen-and-reflect');
  expect(await composer()).toBeInTheDocument();
});

test('a link to an unwritten unit says so, and asks the server nothing', async () => {
  mockBackend();
  renderApp('/units/find-common-ground');

  expect(await screen.findByText(/isn't built yet/i)).toBeInTheDocument();
  const asked = (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
    String(url).endsWith('/practices'),
  );
  expect(asked).toHaveLength(0);
});

test('a link to a unit that does not exist is answered once, not forever', async () => {
  mockBackend();
  (global.fetch as jest.Mock).mockImplementationOnce((input) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CATALOG) } as Response),
  );
  failWith(404, { error: "We couldn't find that unit.", code: 'UNKNOWN_UNIT' });
  renderApp('/units/nonsense');

  expect(await screen.findByText(/couldn't find that unit/i)).toBeInTheDocument();
  await waitFor(() =>
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
        String(url).endsWith('/practices'),
      ),
    ).toHaveLength(1),
  );
});

test('a link from before units had their own name still works', async () => {
  mockBackend();
  renderApp('/modules/listen-and-reflect');
  expect(await composer()).toBeInTheDocument();
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

/** A response the server never meant a person to read. */
const failWith = (status: number, body: Record<string, string>) =>
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);

test('a failed reflection rolls the conversation back, draft included', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  userEvent.type(await composer(), 'Sounds like a lot.');

  failWith(502, { error: 'grok call failed: Read timed out', code: 'UPSTREAM_FAILED' });
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));

  // Our fault, so our words: the server's own message at this status can be a
  // stack detail, and this is the string a person actually reads.
  const banner = await screen.findByRole('alert');
  expect(banner).toHaveTextContent(/something went wrong on our side/i);
  expect(banner).not.toHaveTextContent(/read timed out/i);
  expect(await composer()).toHaveValue('Sounds like a lot.');

  // The optimistic turn is gone again — hers and the learner's both.
  expect(screen.queryByText('Sounds like a lot.', { selector: 'p' })).not.toBeInTheDocument();
  expect(screen.queryByText(FILMED_BEAT.transcript)).not.toBeInTheDocument();

  // The draft is already back, so trying again is one click.
  userEvent.click(within(banner).getByRole('button', { name: /try again/i }));
  expect(await screen.findByText(REFLECTION.feedback)).toBeInTheDocument();
});

test('a request that never leaves says so, in words', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  userEvent.type(await composer(), 'Sounds like a lot.');
  (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach the server/i);
  expect(document.body.textContent).not.toMatch(/failed to fetch/i);
});

test('a reply the server can read and declines is answered next to the box', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  const box = await composer();
  userEvent.type(box, 'hm');
  failWith(400, { error: 'Say a little something back to her.', code: 'REFLECTION_EMPTY' });
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));

  // Its words, verbatim — the server knows what was wrong with the request and
  // we do not — and beside the box, because editing is the retry.
  expect(await screen.findByRole('alert')).toHaveTextContent('Say a little something back to her.');
  expect(await composer()).toBeInvalid();
});

test('editing clears the complaint about what was typed', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  userEvent.type(await composer(), 'hm');
  failWith(400, { error: 'Say a little something back to her.', code: 'REFLECTION_EMPTY' });
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));
  await screen.findByRole('alert');

  userEvent.type(await composer(), ' that sounds like a lot');
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('a banner can be dismissed', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  fireOnVideo('ended');

  userEvent.type(await composer(), 'Sounds like a lot.');
  failWith(500, { error: 'boom', code: 'INTERNAL' });
  userEvent.click(screen.getByRole('button', { name: /reflect back/i }));

  const banner = await screen.findByRole('alert');
  userEvent.click(within(banner).getByRole('button', { name: /dismiss/i }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('a browser that cannot record says so instead of offering a dead button', async () => {
  const recorder = window.MediaRecorder;
  (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = undefined;
  try {
    mockBackend();
    renderApp();
    await reachThePracticeRoom();

    expect(screen.queryByRole('button', { name: /speak/i })).not.toBeInTheDocument();
    expect(screen.getByText(/can't record audio/i)).toBeInTheDocument();
    // And typing still works, which is the whole point of saying it up front.
    expect(await composer()).toBeEnabled();
  } finally {
    (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = recorder;
  }
});

test('a refused microphone leaves the learner somewhere to go', async () => {
  const original = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('NotAllowedError'));
  try {
    mockBackend();
    renderApp();
    await reachThePracticeRoom();

    userEvent.click(screen.getByRole('button', { name: /speak/i }));
    expect(await screen.findByText(/microphone access was blocked/i)).toBeInTheDocument();
    expect(await composer()).toBeEnabled();
  } finally {
    navigator.mediaDevices.getUserMedia = original;
  }
});

test('a catalogue that will not load replaces the grid, and can be retried', async () => {
  mockBackend();
  (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  renderApp();

  expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Skills' })).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await tile()).toBeInTheDocument();
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
