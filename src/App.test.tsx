import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
// dialog in data/units/start-a-conversation/dialog.json.

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

const MODULES = [
  { id: 'skills', title: 'Skills', blurb: 'The moves a conversation is made of.', unitCount: 3 },
  {
    id: 'emotions',
    title: 'Emotions',
    blurb: 'Noticing what you and other people feel.',
    unitCount: 1,
  },
  { id: 'heart', title: 'Heart', blurb: 'Attention, honesty and care.', unitCount: 1 },
];

/**
 * The curriculum as the server pages it: five units over three pages.
 *
 * The pages are deliberately uneven, and the first boundary falls inside
 * Skills — the app must file units under the right heading whenever they
 * arrive, and must not assume how many a page brings.
 */
const PAGE_1 = {
  modules: MODULES,
  units: [BUILT_UNIT, preview('then-go-deep', 'skills', 'Then go deep', 'Follow-up questions')],
  next: 'then-go-deep',
  total: 5,
};

const PAGE_2 = {
  units: [
    preview('find-common-ground', 'skills', 'Find common ground', 'Finding common ground'),
    preview('sit-with-discomfort', 'emotions', 'Sit with discomfort', 'Staying present'),
  ],
  next: 'sit-with-discomfort',
  total: 5,
};

const PAGE_3 = {
  units: [preview('let-yourself-be-known', 'heart', 'Let yourself be known', 'Being known')],
  total: 5,
};

const PAGE_2_URL = '/units?after=then-go-deep';
const PAGE_3_URL = '/units?after=sit-with-discomfort';

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

/** A route that answers with an error body instead of a page. */
const refusing = (status: number, body: Record<string, string>) => ({ refusal: { status, body } });

function mockBackend(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    '/units': PAGE_1,
    [PAGE_2_URL]: PAGE_2,
    [PAGE_3_URL]: PAGE_3,
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
    const refusal = (routes[match] as { refusal?: { status: number; body: unknown } }).refusal;
    if (refusal) {
      return Promise.resolve({
        ok: false,
        status: refusal.status,
        json: () => Promise.resolve(refusal.body),
      } as Response);
    }
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

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// By role, not by label: the label is the guidance now, and it changes between
// a first attempt and a retry. The textarea is the only textbox on the page.
const composer = () => screen.findByRole('textbox');

const tile = () => screen.findByRole('button', { name: /start a conversation/i });

const showMore = () => screen.findByRole('button', { name: /show more units/i });
const tiles = (container: HTMLElement) => container.querySelectorAll('.unit-grid > li');
const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const requestsTo = (suffix: string) =>
  (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).endsWith(suffix));

/** One click. There is nothing between the grid and the practice room. */
async function reachThePracticeRoom() {
  userEvent.click(await tile());
  await composer();
}

/** The move-to-practise card, which is on the page whether or not its instruction is. */
const tipCard = () => screen.getByRole('region', { name: /the move to practise/i });

/** Asks for the instruction now, from whichever state the card is in. */
const showTheTip = () =>
  userEvent.click(screen.getByRole('button', { name: /^show (now|instruction)$/i }));

/** Lets the countdown's clock run. Only for a test that has switched to fake timers. */
const pass = (seconds: number) =>
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });

async function replyWith(text: string) {
  userEvent.type(await composer(), text);
  userEvent.click(screen.getByRole('button', { name: /send reply/i }));
}

// ---------------------------------------------------------------------------
// The curriculum
// ---------------------------------------------------------------------------

test('the home page opens on the first page of units, and says how many are left', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  expect(tiles(container)).toHaveLength(2);
  // A module nobody has loaded a unit of has no heading yet: a heading over an
  // empty grid would promise tiles that are not there.
  expect(headings()).toEqual(['Skills']);
  expect(await showMore()).toBeEnabled();
  expect(screen.getByText('3 more units to see')).toBeInTheDocument();
  expect(requestsTo(PAGE_2_URL)).toHaveLength(0);
});

test('showing more appends the next page under the right headings', async () => {
  mockBackend();
  const { container } = renderApp();
  userEvent.click(await showMore());

  // The page boundary fell inside Skills: its third unit joins the first two
  // under the heading that is already there, and Emotions arrives with its first.
  expect(await screen.findByText('Sit with discomfort')).toBeInTheDocument();
  expect(headings()).toEqual(['Skills', 'Emotions']);
  expect(tiles(container)).toHaveLength(4);
  const skills = container.querySelector('[data-module="skills"]')!;
  expect(within(skills as HTMLElement).getByText('Find common ground')).toBeInTheDocument();
  expect(screen.getByText('MODULE 2')).toBeInTheDocument();

  expect(screen.getByRole('status')).toHaveTextContent('2 more units shown.');
  expect(screen.getByText('1 more unit to see')).toBeInTheDocument();
});

test('the last page lays out all three modules, in order, and takes the button away', async () => {
  mockBackend();
  const { container } = renderApp();
  userEvent.click(await showMore());
  await screen.findByText('Sit with discomfort');
  userEvent.click(await showMore());

  expect(await screen.findByText('Let yourself be known')).toBeInTheDocument();
  expect(headings()).toEqual(['Skills', 'Emotions', 'Heart']);
  // Every unit in the catalogue is on the page, written or not.
  expect(tiles(container)).toHaveLength(5);
  expect(screen.queryByRole('button', { name: /show more units/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/to see/i)).not.toBeInTheDocument();
});

test('two clicks on show more are one request', async () => {
  mockBackend();
  renderApp();
  const button = await showMore();
  userEvent.click(button);
  userEvent.click(button);

  await screen.findByText('Sit with discomfort');
  expect(requestsTo(PAGE_2_URL)).toHaveLength(1);
});

test('a page that will not load keeps the tiles already here, and can be retried', async () => {
  mockBackend({ [PAGE_2_URL]: refusing(500, { error: 'boom', code: 'INTERNAL' }) });
  const { container } = renderApp();
  userEvent.click(await showMore());

  expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong on our side/i);
  expect(tiles(container)).toHaveLength(2);
  expect(await tile()).toBeEnabled();

  mockBackend();
  userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(await screen.findByText('Sit with discomfort')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('units loaded so far are still there after a practice', async () => {
  mockBackend();
  const { container } = renderApp();
  userEvent.click(await showMore());
  await screen.findByText('Sit with discomfort');

  await reachThePracticeRoom();
  userEvent.click(container.querySelector('.back-to-units')!);

  await tile();
  expect(tiles(container)).toHaveLength(4);
  expect(requestsTo('/units')).toHaveLength(1);
});

test('a unit nobody has written yet is on the map, but is not a door', async () => {
  mockBackend();
  renderApp();
  await tile();

  // Readable, and not a disabled button: a disabled button leaves the tab
  // order, and being read is the whole job of a roadmap.
  expect(screen.getByText('Then go deep')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /then go deep/i })).not.toBeInTheDocument();
  expect(screen.getAllByText(/preview/i).length).toBeGreaterThan(0);
});

test('a tile says how long the unit takes, and leaves the blurb and the skill off', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  // A tile is a title and a length. The skill and the blurb both arrive with
  // the catalogue and are deliberately left off the page.
  const locked = Array.from(container.querySelectorAll('.unit-tile.is-locked')).find((tile) =>
    tile.textContent?.includes('Then go deep'),
  );
  expect(locked).toHaveTextContent(/about 5 min/i);
  expect(locked).not.toHaveTextContent('Follow-up questions');
  expect(locked).not.toHaveTextContent('Then go deep — one day.');
  expect(screen.queryByText(BUILT_UNIT.blurb)).not.toBeInTheDocument();
  expect(screen.queryByText(new RegExp(BUILT_UNIT.skill))).not.toBeInTheDocument();
});

test('every tile gets a cover: a drawn one until the unit is filmed', async () => {
  mockBackend();
  const { container } = renderApp();
  await tile();

  expect(container.querySelectorAll('.unit-cover img')).toHaveLength(0);
  expect(container.querySelectorAll('.unit-cover.is-generated')).toHaveLength(2);
});

const STILL = 'units/start-a-conversation/image/image.jpg';
const resized = (width: number) =>
  `https://media.example/cdn-cgi/image/width=${width},quality=75,format=auto,onerror=redirect/${STILL}`;
const COVER = resized(384);
const COVER_2X = resized(768);
const FILMED_PAGE = {
  ...PAGE_1,
  units: [{ ...BUILT_UNIT, coverUrl: COVER, coverUrl2x: COVER_2X }, ...PAGE_1.units.slice(1)],
};

test('a filmed unit shows its still on the tile', async () => {
  mockBackend({ '/units': FILMED_PAGE });
  const { container } = renderApp();
  const button = await tile();

  const cover = button.querySelector('.unit-cover img');
  expect(cover).toHaveAttribute('src', COVER);
  // Both widths on offer, so a phone and a laptop each fetch the one they need.
  expect(cover).toHaveAttribute('srcset', `${COVER} 384w, ${COVER_2X} 768w`);
  expect(cover).toHaveAttribute('sizes');
  // Decoration beside a title that already names the unit.
  expect(cover).toHaveAttribute('alt', '');
  expect(container.querySelectorAll('.unit-cover.is-generated')).toHaveLength(1);
});

test('a server that sends one cover size still gets its still shown', async () => {
  const older = {
    ...PAGE_1,
    units: [{ ...BUILT_UNIT, coverUrl: COVER }, ...PAGE_1.units.slice(1)],
  };
  mockBackend({ '/units': older });
  renderApp();
  const cover = (await tile()).querySelector('.unit-cover img');

  expect(cover).toHaveAttribute('src', COVER);
  expect(cover).not.toHaveAttribute('srcset');
});

test('a still that will not load falls back to the drawn cover', async () => {
  mockBackend({ '/units': FILMED_PAGE });
  renderApp();
  const button = await tile();

  fireEvent.error(button.querySelector('.unit-cover img')!);
  expect(button.querySelector('.unit-cover img')).toBeNull();
  expect(button.querySelector('.unit-cover.is-generated')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// What goes on the wire
// ---------------------------------------------------------------------------

const headersSentTo = (suffix: string) => {
  const call = (global.fetch as jest.Mock).mock.calls.find(([url]) =>
    String(url).endsWith(suffix),
  );
  expect(call).toBeDefined();
  return new Headers((call![1] as RequestInit | undefined)?.headers);
};

test('a request with no body is not labelled JSON, so the browser sends no preflight', async () => {
  mockBackend();
  renderApp();
  await tile();

  expect(headersSentTo('/units').has('Content-Type')).toBe(false);
});

test('a request with a JSON body says so', async () => {
  mockBackend();
  renderApp();
  userEvent.click(await tile());
  await composer();

  expect(headersSentTo('/practices').get('Content-Type')).toBe('application/json');
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

test('a link to a unit further down the curriculum than the first page still starts', async () => {
  // The browser has loaded two units and this is neither of them. Only the
  // server can say whether it exists, so the server is who gets asked.
  mockBackend({ '/practices': { ...PRACTICE, unitId: 'find-common-ground' } });
  renderApp('/units/find-common-ground');

  expect(await composer()).toBeInTheDocument();
  expect(JSON.parse(requestsTo('/practices')[0][1].body)).toEqual({ unitId: 'find-common-ground' });
});

test('a link to an unwritten unit says so, in the server’s words', async () => {
  mockBackend({
    '/practices': refusing(409, { error: "That one isn't built yet.", code: 'UNIT_NOT_READY' }),
  });
  renderApp('/units/find-common-ground');

  expect(await screen.findByText(/isn't built yet/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /back to the training ground/i })).toBeInTheDocument();
  await waitFor(() => expect(requestsTo('/practices')).toHaveLength(1));
});

test('a link to a unit that does not exist is answered once, not forever', async () => {
  mockBackend({
    '/practices': refusing(404, { error: "We couldn't find that unit.", code: 'UNKNOWN_UNIT' }),
  });
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

test("the character's reaction opens their next page, ahead of their line", async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  // The bridge answers what the learner actually said and the line after it
  // is authored. They arrive apart and stay apart — on a filmed turn the clip
  // says the line, and nothing could have filmed the bridge.
  const page = await screen.findByRole('region', { name: /turn 2 of 3/i });
  const bridge = within(page).getByText(TURN_2.bridge);
  const line = within(page).getByText(TURN_2.line);
  expect(bridge.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('a retry stays on the same page, and the line is said once', async () => {
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
  expect(line.closest('.said')).toBeInTheDocument();
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

test('the tip is the one instruction for this turn, and nothing more', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  showTheTip();

  expect(tipCard()).toHaveTextContent(COACHING.instruction);

  // The move's name, why it works and a sample sentence all arrive with the
  // turn, and none of them is shown while the learner is composing.
  expect(tipCard()).not.toHaveTextContent(COACHING.label);
  expect(screen.queryByText(COACHING.purpose)).not.toBeInTheDocument();
  expect(screen.queryByText(new RegExp(COACHING.example))).not.toBeInTheDocument();
  expect(screen.queryByText(/one way to say it/i)).not.toBeInTheDocument();
});

test('the tip is a card of its own, not part of the box you reply in', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  showTheTip();

  const tip = tipCard();
  const composer = document.querySelector('.composer')!;
  expect(composer).not.toContainElement(tip);
  expect(composer).not.toHaveTextContent(COACHING.instruction);
  // Read first, then typed into.
  expect(tip.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('each turn asks for its own move, not the same one three times', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));

  // A new turn holds its instruction back again, like the first one did.
  await waitFor(() => expect(tipCard()).toHaveTextContent(/showing instruction in/i));
  expect(screen.queryByText(NEXT_COACHING.instruction)).not.toBeInTheDocument();

  showTheTip();
  expect(screen.getByText(NEXT_COACHING.instruction)).toBeInTheDocument();
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

  // A retry does not wait again: the instruction is out, with no countdown.
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
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
  await screen.findByRole('list', { name: /still open/i });

  const composerPanel = document.querySelector('.step-page')!;
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

// ---------------------------------------------------------------------------
// The instruction, held back
// ---------------------------------------------------------------------------

test('a filmed turn keeps its instruction back until the line has been heard', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();

  // The card and its heading are there from the start; the instruction is not.
  expect(tipCard()).toBeInTheDocument();
  expect(screen.getByText('THE MOVE TO PRACTISE')).toBeInTheDocument();
  expect(screen.queryByText(COACHING.instruction)).not.toBeInTheDocument();
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^show instruction$/i })).toBeInTheDocument();
  // The reply box is never held back with it.
  expect(screen.getByRole('textbox')).toBeEnabled();
});

test('the clip ending counts down from five, then shows the instruction', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();
  jest.useFakeTimers();

  fireEvent.ended(document.querySelector('video')!);

  // Inside the card, in a sentence that says what it is for — and alone there:
  // the heading steps aside while the seconds go by.
  const timer = within(tipCard()).getByRole('timer');
  expect(timer).toHaveTextContent('Showing instruction in 5 seconds');
  expect(screen.queryByText('THE MOVE TO PRACTISE')).not.toBeInTheDocument();
  pass(1);
  expect(timer).toHaveTextContent('Showing instruction in 4 seconds');
  pass(3);
  expect(timer).toHaveTextContent('Showing instruction in 1 second');
  expect(timer).not.toHaveTextContent('1 seconds');
  expect(screen.queryByText(COACHING.instruction)).not.toBeInTheDocument();

  pass(1);
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
  expect(screen.getByText('THE MOVE TO PRACTISE')).toBeInTheDocument();
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^show now$/i })).not.toBeInTheDocument();
});

test('showing the words starts the same countdown', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();
  jest.useFakeTimers();

  userEvent.click(screen.getByRole('button', { name: /show the words/i }));
  expect(screen.getByRole('timer')).toHaveTextContent('Showing instruction in 5 seconds');

  pass(5);
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
});

test('the instruction can be asked for at once, before or during the countdown', async () => {
  mockBackend({ '/practices': FILMED });
  const { unmount } = renderApp();
  await reachThePracticeRoom();

  // Before anything has been heard.
  userEvent.click(screen.getByRole('button', { name: /^show instruction$/i }));
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  unmount();

  // And while the seconds are going by.
  renderApp();
  await reachThePracticeRoom();
  fireEvent.ended(document.querySelector('video')!);
  expect(screen.getByRole('timer')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /^show now$/i }));
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
});

test('a written turn starts counting as soon as it opens', async () => {
  jest.useFakeTimers();
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  // Its words are already on the page, so there is nothing to wait for.
  expect(screen.getByRole('timer')).toHaveTextContent(/showing instruction in \d seconds?/i);
  expect(screen.queryByText(COACHING.instruction)).not.toBeInTheDocument();

  pass(5);
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
});

test('a clip that will not load starts the countdown, because its words are shown', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();

  fireEvent.error(document.querySelector('video')!);
  expect(await screen.findByRole('timer')).toBeInTheDocument();
});

test('there is one countdown per turn: nothing restarts it', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();
  jest.useFakeTimers();

  const video = document.querySelector('video')!;
  fireEvent.ended(video);
  pass(2);
  expect(screen.getByRole('timer')).toHaveTextContent('in 3 seconds');

  // Playing it again, hearing it out again, opening and closing the words.
  fireEvent.play(video);
  fireEvent.ended(video);
  userEvent.click(screen.getByRole('button', { name: /show the words/i }));
  userEvent.click(screen.getByRole('button', { name: /hide the words/i }));
  expect(screen.getByRole('timer')).toHaveTextContent('in 3 seconds');

  pass(3);
  expect(tipCard()).toHaveTextContent(COACHING.instruction);
});

// ---------------------------------------------------------------------------
// The recap
// ---------------------------------------------------------------------------

const RECAP = {
  turnsCompleted: 1,
  levels: ['BETTER'],
  turns: [{ turnNumber: 1, skillLabel: COACHING.label, level: 'BETTER', met: 2 }],
  strongest: COACHING.label,
  focus: COACHING.label,
  summary: 'Your strongest turn was introduce and open, where you landed 2 of three.',
  suggestedLine: "Hi Tom, I'm Alex. Good to meet you — how's your day been?",
  nextUnit: { id: 'answer-with-a-thread', title: 'Answer with a thread' },
};

/** What the server sends back when the next unit is started. */
const NEXT_PRACTICE = {
  ...PRACTICE,
  id: 'p2',
  unitId: 'answer-with-a-thread',
  unitTitle: 'Answer with a thread',
};

/** The recap's own way back — the footer has an "All units" of its own. */
const backFromRecap = () =>
  within(screen.getByRole('navigation', { name: 'Recap' })).getByRole('link', {
    name: /all units/i,
  });

async function reachTheRecap(recap: unknown = RECAP) {
  mockBackend({ '/practices/p1/complete': recap });
  renderApp();
  await reachThePracticeRoom();
  await replyWith('Hi Tom, I am Alex.');
  await screen.findByRole('button', { name: /continue/i });
  userEvent.click(screen.getByRole('button', { name: /finish & see recap/i }));
  await screen.findByText('PRACTICE COMPLETE');
}

test('the recap leads on to the next unit, by name', async () => {
  await reachTheRecap();

  const next = screen.getByRole('button', { name: /next unit: answer with a thread/i });
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(NEXT_PRACTICE),
  } as Response);
  userEvent.click(next);

  // A new practice of that unit, and its practice page.
  expect(await screen.findByRole('heading', { name: 'Answer with a thread' })).toBeInTheDocument();
  expect(screen.queryByText('PRACTICE COMPLETE')).not.toBeInTheDocument();
  const [, options] = requestsTo('/practices').pop()!;
  expect(JSON.parse(String(options.body))).toEqual({ unitId: 'answer-with-a-thread' });
});

test('the way back from the recap is All units, first on the page', async () => {
  await reachTheRecap();

  const back = backFromRecap();
  const headline = screen.getByRole('heading', { level: 1 });
  expect(back.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // The old button is gone, not kept beside the new link.
  expect(screen.queryByText(/back to the training ground/i)).not.toBeInTheDocument();

  userEvent.click(back);
  expect(await tile()).toBeInTheDocument();
  expect(screen.queryByText('PRACTICE COMPLETE')).not.toBeInTheDocument();
});

test('after the last playable unit the recap offers no next unit', async () => {
  await reachTheRecap({ ...RECAP, nextUnit: null });

  expect(screen.queryByRole('button', { name: /next unit/i })).not.toBeInTheDocument();
  expect(backFromRecap()).toBeInTheDocument();
});

test('a server that does not say what is next still gets a recap', async () => {
  const { nextUnit, ...older } = RECAP;
  await reachTheRecap(older);

  expect(screen.getByText(RECAP.summary)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /next unit/i })).not.toBeInTheDocument();
});

test('a next unit that will not start leaves the recap where it was', async () => {
  await reachTheRecap();

  failWith(500, { error: 'boom' });
  userEvent.click(screen.getByRole('button', { name: /next unit/i }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByText('PRACTICE COMPLETE')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /next unit: answer with a thread/i })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// One page per turn
// ---------------------------------------------------------------------------

async function reachTurnTwo() {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();
  await replyWith('Hi Tom, I am Alex.');
  userEvent.click(await screen.findByRole('button', { name: /continue/i }));
  return screen.findByRole('region', { name: /turn 2 of 3/i });
}

test('each turn is its own page, and a page left behind keeps what you said', async () => {
  const second = await reachTurnTwo();
  const first = screen.getByRole('region', { name: /turn 1 of 3/i });

  // The page you left: their line, your reply, how it landed — and nothing to type into.
  expect(within(first).getByText(TURN_1.line)).toBeInTheDocument();
  expect(within(first).getByText('Hi Tom, I am Alex.')).toBeInTheDocument();
  expect(within(first).getByText(/good reply/i)).toBeInTheDocument();
  expect(within(first).queryByRole('textbox')).not.toBeInTheDocument();

  // The page you are on is the only one that takes a reply.
  expect(within(second).getByRole('textbox')).toBeInTheDocument();
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
});

test('turns not reached yet cannot be jumped to', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  const nav = screen.getByRole('navigation', { name: /turns/i });
  expect(within(nav).getByRole('button', { name: 'Turn 1' })).toBeInTheDocument();
  expect(within(nav).queryByRole('button', { name: 'Turn 2' })).not.toBeInTheDocument();
  expect(within(nav).getByRole('button', { name: /next turn/i })).toBeDisabled();
  expect(within(nav).getByRole('button', { name: /previous turn/i })).toBeDisabled();
});

test('going back a page does not move the practice back', async () => {
  await reachTurnTwo();
  const nav = screen.getByRole('navigation', { name: /turns/i });
  expect(within(nav).getByText('Turn 2 of 3')).toBeInTheDocument();

  userEvent.click(within(nav).getByRole('button', { name: /previous turn/i }));
  expect(within(nav).getByText('Turn 1 of 3')).toBeInTheDocument();
  // Still turn 2's reply box — looking back is not undoing.
  expect(screen.getByText(/what would you say back to tom\?/i)).toBeInTheDocument();

  userEvent.click(within(nav).getByRole('button', { name: /back to your turn/i }));
  expect(within(nav).getByText('Turn 2 of 3')).toBeInTheDocument();
  expect(within(nav).queryByRole('button', { name: /back to your turn/i })).not.toBeInTheDocument();
});

test('the arrow keys turn pages, except while you are typing a reply', async () => {
  await reachTurnTwo();
  const nav = screen.getByRole('navigation', { name: /turns/i });
  const strip = screen.getByRole('region', { name: /one turn per page/i });

  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowLeft' });
  expect(within(nav).getByText('Turn 2 of 3')).toBeInTheDocument();

  fireEvent.keyDown(strip, { key: 'ArrowLeft' });
  expect(within(nav).getByText('Turn 1 of 3')).toBeInTheDocument();

  fireEvent.keyDown(strip, { key: 'ArrowRight' });
  expect(within(nav).getByText('Turn 2 of 3')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// Filmed turns
// ---------------------------------------------------------------------------

const FILMED = {
  ...PRACTICE,
  turn: {
    ...TURN_1,
    videoUrl: 'https://media.example/units/start-a-conversation/video/starting-chat-1/video.mp4',
    posterUrl: 'https://media.example/units/start-a-conversation/image/image.jpg',
    durationSeconds: 10,
  },
};

test('a filmed turn waits for Play, and never starts by itself', async () => {
  const play = jest.spyOn(HTMLMediaElement.prototype, 'play');
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();

  const video = document.querySelector('video')!;
  expect(video).toHaveAttribute('src', FILMED.turn.videoUrl);
  expect(video).toHaveAttribute('poster', FILMED.turn.posterUrl);
  expect(play).not.toHaveBeenCalled();
  // Nobody is talking until the learner asks them to.
  expect(screen.queryByText(/is still talking/i)).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /^▶ play$/i }));
  expect(play).toHaveBeenCalledTimes(1);

  fireEvent.play(video);
  expect(screen.queryByRole('button', { name: /^▶ play$/i })).not.toBeInTheDocument();
  expect(screen.getByText(/tom is still talking/i)).toBeInTheDocument();

  fireEvent.ended(video);
  expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
  expect(screen.queryByText(/is still talking/i)).not.toBeInTheDocument();
});

test('the words of a filmed turn are one click away', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();

  expect(screen.queryByText(TURN_1.line)).not.toBeInTheDocument();

  const toggle = screen.getByRole('button', { name: /show the words/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  userEvent.click(toggle);
  expect(screen.getByText(TURN_1.line)).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /hide the words/i }));
  expect(screen.queryByText(TURN_1.line)).not.toBeInTheDocument();
});

test('a clip that will not load leaves the words, not a hole', async () => {
  mockBackend({ '/practices': FILMED });
  renderApp();
  await reachThePracticeRoom();

  fireEvent.error(document.querySelector('video')!);
  expect(await screen.findByText(TURN_1.line)).toBeInTheDocument();
  expect(document.querySelector('video')).toBeNull();
  expect(screen.queryByRole('button', { name: /^▶ play$/i })).not.toBeInTheDocument();
});

test('the way back to all units is the first thing on the practice page', async () => {
  mockBackend();
  renderApp();
  await reachThePracticeRoom();

  // The footer has an "All units" link too; this one is the practice page's own.
  const main = document.querySelector('main')!;
  const back = within(main).getByRole('link', { name: /all units/i });
  expect(back).toHaveAttribute('href', '/');
  expect(within(main).getAllByRole('link')[0]).toBe(back);

  userEvent.click(back);
  expect(await screen.findByRole('button', { name: /start a conversation/i })).toBeInTheDocument();
});
