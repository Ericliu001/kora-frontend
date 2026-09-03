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

// Fixtures mirroring what the Ktor backend sends, taken from the authored
// dialog in data/dialogs/start-a-conversation.json.

/** One move, belonging to one turn — not one trio belonging to the unit. */
const COACHING = {
  skillKey: 'INTRODUCE_AND_OPEN',
  label: 'Introduce and open',
  instruction: 'Greet Tom, introduce yourself by name, then ask how his day is going.',
  purpose: 'Introducing yourself and asking an easy question turns the meeting into a conversation.',
  example: "Hello, Tom. I'm Alex. How's your day going?",
};

const NEXT_COACHING = {
  skillKey: 'ANSWER_WITH_A_PLAN',
  label: 'Answer with a plan',
  instruction: 'Say what you are doing later, then ask Tom the same thing back.',
  purpose: 'A concrete answer gives the other person something to ask about.',
  example: "I'm cooking tonight, nothing exciting. What about you?",
};

const BUILT_UNIT = {
  id: 'start-a-conversation',
  moduleId: 'skills',
  title: 'Start a conversation',
  blurb: 'Greet someone and ask one easy question, then leave room for a real answer.',
  playable: true,
  skill: 'Opening a conversation',
  estimatedMinutes: 4,
  turnCount: 3,
};

/**
 * A unit that is on the map and nothing more.
 *
 * It still says what it teaches and how long it takes: units.csv knows both
 * before anybody writes a line of dialog.
 */
const preview = (id: string, moduleId: string, title: string, skill: string) => ({
  id,
  moduleId,
  title,
  blurb: `${title} — one day.`,
  playable: false,
  skill,
  estimatedMinutes: 5,
});

const CATALOG = [
  {
    id: 'skills',
    title: 'Skills',
    blurb: 'The moves a conversation is made of.',
    units: [
      BUILT_UNIT,
      preview('then-go-deep', 'skills', 'Then go deep', 'Follow-up questions'),
      preview('find-common-ground', 'skills', 'Find common ground', 'Finding common ground'),
    ],
  },
  {
    id: 'emotions',
    title: 'Emotions',
    blurb: 'Noticing what you and other people feel.',
    units: [preview('sit-with-discomfort', 'emotions', 'Sit with discomfort', 'Staying present')],
  },
  {
    id: 'heart',
    title: 'Heart',
    blurb: 'Attention, honesty and care.',
    units: [preview('let-yourself-be-known', 'heart', 'Let yourself be known', 'Being known')],
  },
];

const TURN_1 = {
  id: 'starting-chat-1',
  speaker: 'Tom',
  turnNumber: 1,
  line: "Hi, I don't think we've properly met. I'm Tom. Nice to meet you!",
  coaching: COACHING,
};

/** A later turn arrives with the character's reaction in front of its line. */
const TURN_2 = {
  id: 'starting-chat-2',
  speaker: 'Tom',
  turnNumber: 2,
  bridge: 'Thanks for asking.',
  line: "My day's been fairly quiet, mostly emails. What are you up to later?",
  coaching: NEXT_COACHING,
};

const PRACTICE = {
  id: 'p1',
  unitId: 'start-a-conversation',
  unitTitle: BUILT_UNIT.title,
  userGoal: 'Say hello, answer briefly and ask an easy everyday question.',
  turnCount: 3,
  turn: TURN_1,
};

const REFLECTION = {
  level: 'BETTER',
  criteria: [
    { id: 'greeting', label: 'You greeted him', captured: true, evidence: 'you opened with hello' },
    {
      id: 'introduce_self',
      label: 'You introduced yourself',
      captured: true,
      evidence: 'you gave him your name',
    },
    {
      id: 'ask_about_day',
      label: 'You asked about his day',
      captured: false,
      guidance: 'Ask Tom how his day is going.',
    },
  ],
  feedback: 'You greeted him and gave your name. Now try handing the question back.',
  strongerReply: {
    text: "Hi Tom, I'm Alex. Good to meet you — how's your day been?",
    source: 'REWRITTEN',
  },
  attemptsOnTurn: 1,
  retry: false,
  nextTurn: TURN_2,
  complete: false,
};

/** A reply with nothing missing. Every check landed, so the level is BEST. */
const BEST_REFLECTION = {
  ...REFLECTION,
  level: 'BEST',
  criteria: REFLECTION.criteria.map((criterion) => ({
    ...criterion,
    captured: true,
    evidence: criterion.evidence ?? 'you did this',
    guidance: undefined,
  })),
  feedback: 'You did all three parts of introduce and open.',
};

/** A first attempt that lands one check only, so the learner is sent back. */
const RETRY_REFLECTION = {
  ...REFLECTION,
  level: 'DEVELOPING',
  criteria: [
    { id: 'greeting', label: 'You greeted him', captured: true, evidence: 'you opened with hello' },
    {
      id: 'introduce_self',
      label: 'You introduced yourself',
      captured: false,
      guidance: 'Introduce yourself by name.',
    },
    {
      id: 'ask_about_day',
      label: 'You asked about his day',
      captured: false,
      guidance: 'Ask Tom how his day is going.',
    },
  ],
  retry: true,
  nextTurn: undefined,
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

/** A response the server never meant a person to read. */
const failWith = (status: number, body: Record<string, string>) =>
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);

afterEach(() => jest.restoreAllMocks());

// By role, not by label: the label is the guidance now, and it changes between
// a first attempt and a retry. The textarea is the only textbox on the page.
const composer = () => screen.findByRole('textbox');

const tile = () => screen.findByRole('button', { name: /start a conversation/i });

/** One click. There is nothing between the grid and the practice room. */
async function reachThePracticeRoom() {
  userEvent.click(await tile());
  await composer();
}

async function replyWith(text: string) {
  userEvent.type(await composer(), text);
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));
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
  expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
});

test('a preview says what it will teach and how long it takes', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  // A roadmap that will not say what is on it is not much of a roadmap, and
  // the catalogue knows both facts about every unit before anyone writes one.
  const locked = Array.from(container.querySelectorAll('.unit-tile.is-locked')).find((tile) =>
    tile.textContent?.includes('Find common ground'),
  );
  expect(locked).toHaveTextContent('Finding common ground');
  expect(locked).toHaveTextContent(/about 5 min/i);
});

test('every tile gets a cover, because no unit has been filmed', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  expect(container.querySelectorAll('.unit-cover img')).toHaveLength(0);
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
  expect(JSON.parse(options.body)).toEqual({ unitId: 'start-a-conversation' });
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
  renderApp('/units/start-a-conversation');
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
  (global.fetch as jest.Mock).mockImplementationOnce(() =>
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
  renderApp('/modules/start-a-conversation');
  expect(await composer()).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// The conversation
// ---------------------------------------------------------------------------

test("the character's line is in the conversation before the learner replies", async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  // Nothing is filmed, so there is no clip to wait through and nothing to
  // signpost: the words are simply there, once, ready to answer.
  expect(await screen.findByText(TURN_1.line)).toBeInTheDocument();
  expect(document.querySelector('video')).toBeNull();
  expect(screen.queryByText(/is still talking/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /speak/i })).toBeEnabled();
});

test("the character's reaction is part of their next line, not a turn of its own", async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  // The bridge answers what the learner actually said; the line after it is
  // authored. They arrive apart and are spoken as one turn.
  const spoken = `${TURN_2.bridge} ${TURN_2.line}`;
  expect(await screen.findByText(spoken)).toBeInTheDocument();
});

test('a retry does not log the line to the transcript twice', async () => {
  mockBackend({ '/practices/p1/reflections': RETRY_REFLECTION });
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));
  await replyWith('Hi Tom, I am Alex.');

  await waitFor(() => expect(screen.getAllByText(TURN_1.line)).toHaveLength(1));
});

test('submitting a reply shows all three checks, the feedback and a stronger reply', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');

  // Wait for the real feedback — the pending card renders a scorecard too.
  await screen.findByText(REFLECTION.feedback);

  const scorecard = screen.getByRole('list', { name: /your reply/i });
  const items = within(scorecard).getAllByRole('listitem');
  expect(items).toHaveLength(3);

  expect(items[0]).toHaveTextContent('You greeted him');
  expect(items[0]).toHaveTextContent('you opened with hello');
  expect(items[0]).toHaveClass('captured');

  expect(items[2]).toHaveTextContent('You asked about his day');
  expect(items[2]).toHaveTextContent('Ask Tom how his day is going.');
  expect(items[2]).toHaveClass('missed');

  expect(screen.getByText('Hi Tom, I am Alex.')).toBeInTheDocument();
});

/**
 * The point of the whole feedback panel. A canned model answer is easy to
 * admire and impossible to learn from, because it is about somebody else's
 * life; a rewrite of your own reply is one you could actually have said.
 */
test('the stronger reply is the learner’s own words, and says so', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  await screen.findByText(REFLECTION.feedback);

  expect(screen.getByText(`“${REFLECTION.strongerReply.text}”`)).toBeInTheDocument();
  expect(screen.getByText(/a stronger version of your reply/i)).toBeInTheDocument();
});

test('an authored example is never passed off as a rewrite of what you said', async () => {
  mockBackend({
    '/practices/p1/reflections': {
      ...REFLECTION,
      strongerReply: { text: COACHING.example, source: 'EXAMPLE' },
    },
  });
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  await screen.findByText(REFLECTION.feedback);

  expect(screen.queryByText(/a stronger version of your reply/i)).not.toBeInTheDocument();
  expect(screen.getAllByText(/one way to say it/i).length).toBeGreaterThan(0);
});

/**
 * A rewrite of a reply that was already right says it fell short when nothing
 * was missing. The strongest version of a strong reply is the one they wrote.
 */
test('a reply that lands all three is shown its own words, not a better version', async () => {
  mockBackend({ '/practices/p1/reflections': BEST_REFLECTION });
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex. How has your day been?');
  await screen.findByText(BEST_REFLECTION.feedback);

  expect(screen.getByText(/this is the move/i)).toBeInTheDocument();
  expect(screen.getByText('“Hi Tom, I am Alex. How has your day been?”')).toBeInTheDocument();
  expect(screen.queryByText(/a stronger version of your reply/i)).not.toBeInTheDocument();
  expect(
    screen.queryByText(`“${REFLECTION.strongerReply.text}”`),
  ).not.toBeInTheDocument();
});

test('a reply that missed something still gets the rewrite', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  await screen.findByText(REFLECTION.feedback);

  expect(screen.getByText(/a stronger version of your reply/i)).toBeInTheDocument();
  expect(screen.queryByText(/this is the move/i)).not.toBeInTheDocument();
});

/**
 * The two layers of the practice room must not be told apart by reading them.
 * A line someone said is a bubble; everything the app says about it sits on
 * the coaching surface.
 */
test('what the app says is on a different surface from what anybody said', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const line = await screen.findByText(TURN_1.line);
  expect(line.closest('.utterance')).toBeInTheDocument();
  expect(line.closest('.coach-surface')).toBeNull();

  expect(screen.getByText(/your turn/i).closest('.coach-surface')).toBeInTheDocument();
});

test('the reply lands immediately and a pending card holds the place', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  // Hold the assessment open so the waiting state is observable.
  let release: () => void = () => undefined;
  jest.spyOn(global, 'fetch').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ ok: true, json: () => Promise.resolve(REFLECTION) } as Response);
      }),
  );

  await replyWith('Hi Tom, I am Alex.');

  // The reply is already in the conversation, and the composer has stood down.
  expect(await screen.findByText('Hi Tom, I am Alex.')).toBeInTheDocument();
  expect(screen.getByText(/reading your reply back/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /send reply/i })).not.toBeInTheDocument();
  // Naming the move again while they wait is one more repetition of it.
  expect(screen.getByText(/checking: introduce and open/i)).toBeInTheDocument();

  release();

  expect(await screen.findByText(REFLECTION.feedback)).toBeInTheDocument();
  expect(screen.queryByText(/reading your reply back/i)).not.toBeInTheDocument();
});

test('a failed reply rolls the conversation back, draft included', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  userEvent.type(await composer(), 'Hi Tom.');

  failWith(502, { error: 'model call failed: Read timed out', code: 'UPSTREAM_FAILED' });
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));

  // Our fault, so our words: the server's own message at this status can be a
  // stack detail, and this is the string a person actually reads.
  const banner = await screen.findByRole('alert');
  expect(banner).toHaveTextContent(/something went wrong on our side/i);
  expect(banner).not.toHaveTextContent(/read timed out/i);
  expect(await composer()).toHaveValue('Hi Tom.');

  // The optimistic turn is gone again.
  expect(screen.queryByText('Hi Tom.', { selector: 'p' })).not.toBeInTheDocument();

  // The draft is already back, so trying again is one click.
  userEvent.click(within(banner).getByRole('button', { name: /try again/i }));
  expect(await screen.findByText(REFLECTION.feedback)).toBeInTheDocument();
});

test('a request that never leaves says so, in words', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  userEvent.type(await composer(), 'Hi Tom.');
  (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach the server/i);
  expect(document.body.textContent).not.toMatch(/failed to fetch/i);
});

test('a reply the server can read and declines is answered next to the box', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const box = await composer();
  userEvent.type(box, 'hm');
  failWith(400, { error: 'Say a little something back.', code: 'REFLECTION_EMPTY' });
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));

  // Its words, verbatim — the server knows what was wrong with the request and
  // we do not — and beside the box, because editing is the retry.
  expect(await screen.findByRole('alert')).toHaveTextContent('Say a little something back.');
  expect(await composer()).toBeInvalid();
});

test('editing clears the complaint about what was typed', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  userEvent.type(await composer(), 'hm');
  failWith(400, { error: 'Say a little something back.', code: 'REFLECTION_EMPTY' });
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));
  await screen.findByRole('alert');

  userEvent.type(await composer(), ' hello Tom');
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('a banner can be dismissed', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  userEvent.type(await composer(), 'Hi Tom.');
  failWith(500, { error: 'boom', code: 'INTERNAL' });
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));

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

// ---------------------------------------------------------------------------
// The coaching
// ---------------------------------------------------------------------------

test('the composer names the one move being practised, and why it works', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const guide = screen.getByRole('list', { name: /what to aim for/i });
  const rows = within(guide).getAllByRole('listitem');
  expect(rows).toHaveLength(1);

  expect(rows[0]).toHaveTextContent(COACHING.label);
  expect(rows[0]).toHaveTextContent(COACHING.instruction);
  expect(rows[0]).toHaveTextContent(COACHING.purpose);
  // The example is shown before the reply on purpose: the exercise is saying
  // this with the facts of your own life, not guessing what to say.
  expect(screen.getByText(`“${COACHING.example}”`)).toBeInTheDocument();
});

test('each turn asks for its own move, not the same one three times', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  expect(await screen.findByText(NEXT_COACHING.instruction)).toBeInTheDocument();
  expect(screen.queryByText(COACHING.instruction)).not.toBeInTheDocument();
});

test('a retry keeps what landed and asks for what is still open', async () => {
  mockBackend({ '/practices/p1/reflections': RETRY_REFLECTION });
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));

  expect(await screen.findByText(/2 of the three is still open/i)).toBeInTheDocument();
  expect(screen.getByText(/attempt 2 of 3/i)).toBeInTheDocument();

  // The two that are open are named; the one that landed is not repeated back.
  const chips = document.querySelectorAll('.guide-chip.open');
  expect(chips).toHaveLength(2);
  expect(chips[0]).toHaveTextContent('You introduced yourself');
});

/**
 * Where the wire decision is encoded.
 *
 * The labels were earned — the learner read them on the scorecard a moment
 * ago, so repeating them is not a leak. What the author wrote about *what was
 * missing* is a different thing, and it must not sit above an empty box.
 */
test('the retry guidance points at the missing move without giving the answer', async () => {
  mockBackend({ '/practices/p1/reflections': RETRY_REFLECTION });
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi.');
  userEvent.click(await screen.findByRole('button', { name: /try that again/i }));
  await screen.findByRole('list', { name: /what to aim for/i });

  const composerPanel = document.querySelector('.composer')!;
  expect(composerPanel).not.toHaveTextContent('Introduce yourself by name.');
  expect(composerPanel).not.toHaveTextContent('Ask Tom how his day is going.');
  expect(composerPanel).not.toHaveTextContent('you opened with hello');
});

test('moving to the next turn clears the retry guidance', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  expect(await screen.findByText(/what would you say back to tom\?/i)).toBeInTheDocument();
  expect(screen.queryByText(/attempt 2 of 3/i)).not.toBeInTheDocument();
});
