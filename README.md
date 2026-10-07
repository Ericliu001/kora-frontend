# Onion Loop — the web app

The React app a learner actually uses: a training ground for learning to talk to
people. Three modules — Skills, Emotions, Heart — hold 34 units, of which five
are written and 29 are previews on the map. A unit is a short conversation with
one character over three to five turns.

Every turn works the same way. The character says something. The app names the
one move being practised — its label, what to do, why it works, one worked
example — **before** the learner replies. The reply comes back graded on three
checks, each marked caught or missed with the author's evidence or guidance, and
a weak one can be tried again, up to three attempts. At the end there is a recap.

Create React App, React 19, TypeScript, React Router 6. No state library, no
CSS-in-JS, no component kit. The curriculum, the practice session and the grading
all live on the Kotlin/Ktor API; this app renders what it is given.

## Run it

Install once, then start the dev server:

```bash
npm install
npm start
```

That serves the app on `http://localhost:3000` and expects the API on
`http://localhost:8080`, so the backend has to be running too. From the parent
repository, `./launch` starts both in one terminal, installs these packages on first
run and passes the API base URL through — the usual way in.

Point the app at a deployed API instead by setting the one environment variable
it has:

```bash
REACT_APP_API_BASE_URL="https://your-api.example.com/api" npm start
```

The four scripts in `package.json` are the Create React App defaults: `start`,
`build`, `test` and `eject`. Run the suite non-interactively with
`npm test -- --watchAll=false`, which is what `make test-frontend` does upstream.

## How it is put together

`index.tsx` mounts `<App />` inside a `<BrowserRouter>` and `<React.StrictMode>`.
The router is deliberately outside `App` rather than inside it, so tests can
mount the same component under a `MemoryRouter` and drive navigation without
touching the address bar.

`App.tsx` is 93 lines and holds no feature logic. It renders the chrome, declares
the routes, clears errors and scrolls to the top on navigation, and decides
whether an error belongs in the banner above the page or to the screen itself.

The one thing it owns is state: `usePractice()` is called at the top of `App` and
handed down. A practice outlives the screen that started it — the recap is a
different route reading the same conversation — so the hook cannot live inside
the practice screen, and two consumers do not justify a context.

The layering rule underneath that is worth keeping:

- **components** render what they are given and hold nothing but local UI state;
- **hooks** hold state and are the only code that calls the network;
- **screens** compose components and read hooks, and nothing else;
- `api.ts` is imported by hooks only — no screen or component imports it.

| Path | What it is |
| --- | --- |
| [src/index.tsx](src/index.tsx) | Entry point: root, router, strict mode |
| [src/App.tsx](src/App.tsx) | The shell: chrome, routes, the one practice |
| [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) | The map: hero, three module sections, unit tiles, loading skeleton |
| [src/screens/PracticeScreen.tsx](src/screens/PracticeScreen.tsx) | The practice room: the unit beside a row of turn pages, the URL-driven start |
| [src/screens/RecapScreen.tsx](src/screens/RecapScreen.tsx) | The recap, turn by turn, one line worth keeping, and the way on to the next unit |
| [src/hooks/usePractice.ts](src/hooks/usePractice.ts) | One practice from first line to recap — the real state machine |
| [src/hooks/useCatalog.ts](src/hooks/useCatalog.ts) | The curriculum a page at a time: the first page, `loadMore`, and a reload |
| [src/hooks/useCountdown.ts](src/hooks/useCountdown.ts) | Whole seconds from 5 to 0, for the instruction's countdown |
| [src/hooks/useVoiceInput.ts](src/hooks/useVoiceInput.ts) | Microphone, recording and transcription upload |
| [src/hooks/useTheme.ts](src/hooks/useTheme.ts) | Light/dark, stored and applied to `<html>` |
| [src/components/](src/components) | Everything a screen is made of (see below) |
| [src/api.ts](src/api.ts) | The single HTTP helper, and the two failure types |
| [src/errors.ts](src/errors.ts) | One `AppError`, and where each kind is shown |
| [src/types.ts](src/types.ts) | Wire types, mirrored by hand from the Kotlin |

The components: `SiteHeader` and `SiteFooter` (chrome, and the theme toggle),
`UnitTile` (one unit on the map, or a preview that is deliberately not a button;
its cover is the unit still when the catalogue sends a `coverUrl`, offered at
two widths through `srcSet` when it also sends a `coverUrl2x`, and a drawn
gradient with the unit's number otherwise, or if the still fails to load),
`Composer` (the reply box, the speak button, the attempt counter), `CoachingCard`
(the move to practise: one instruction, in a teal card of its own above the
composer, held back behind a countdown), `ReflectionScorecard` and `FeedbackPanel` (the three
checks and what to take away), `ReflectionPending` (the same shape while the
server is judging), `ErrorNotice` (every error a person sees, in three shapes),
and the practice itself — see [One page per turn](#one-page-per-turn):
`StepStrip` (the sideways row of pages and its nav), `StepPage` (one turn),
`StepClip` (a filmed turn's clip, its Play button and its words toggle) and
`Said` (anything a person said). The way out, **← All units**, is the first
thing on the practice page, above everything else, at every width.

## One page per turn

A practice is a row of pages, one per turn reached, side by side in a
horizontal scroller that snaps a page at a time. The browser does the swiping —
touch, trackpad and scroll wheel all work with nothing listening for gestures —
and the nav above the row adds ← → buttons, one dot per turn and the arrow keys
(ignored while typing in the reply box). `overscroll-behavior-x: contain` stops
a swipe at either end from turning into the browser's own back gesture.

Each page, top to bottom: the character's reaction to your last reply (a later
turn only), their line — the clip on a filmed turn, the words on a written one —
and then either the move to practise, the composer and feedback, on the turn
being worked on, or, on a page already left, the reply you moved on with and a
folded "how it landed".

**The instruction is held back.** The move-to-practise card is on the page when
the turn opens, but its instruction is not. Once the learner has had the line —
the clip played to its end, or the words are showing — the card drops its heading, reads
"Showing instruction in 5 seconds" and counts down, then shows the heading and
the instruction. A written
turn, or a clip that fails, has its words showing already, so it counts from
the start. "Show instruction" (before) and "Show now" (during) skip the wait.
There is one countdown per turn, a retry never waits again, and the reply box
is usable throughout. `StepPage` decides which state the card is in, because it
lasts the whole turn; `CoachingCard` only draws it.

Pages exist only up to the turn being worked on: there is nothing ahead of it
until you have replied, so later dots are placeholders. **Looking is not
moving.** `usePractice` holds `steps` — each turn reached, and the outcome of the
ones left behind — and the turn being worked on is always the last step. Which
page is on screen belongs to `StepStrip` and is read back from the scroll
position, so swiping back to turn 1 never changes where the practice is.

The row is held to the height of the page on screen, not its tallest page, so a
short finished page does not sit above a screen of nothing.

## Routes

| Route | Screen |
| --- | --- |
| `/` | The training ground: three module sections of unit tiles |
| `/units/:unitId` | The practice room |
| `/units/:unitId/recap` | The recap |
| `/modules/:moduleId` | Redirects to `/units/:moduleId` — bookmarks from before units had their own name |

Anything else redirects to `/`. There is no page between the map and the practice
room: clicking a tile creates the practice and *then* navigates, in that order,
so a failure leaves the learner on the home page beside the tile they clicked
rather than on a practice screen that would have to explain itself. The same
`start()` runs from the other direction when `/units/:unitId` is pasted into a
fresh tab.

The practice screen does not read the catalogue. The home page holds only the
pages it has loaded, so a unit further down the curriculum is not in the browser
at all; the server is asked, and it already answers both "no such unit" (404)
and "not built yet" (409).

The home page opens on the first page of units and a "Show more units" button
that appends the next one. Units arrive flat and are filed under their module by
`moduleId`; a module has no heading until its first unit has loaded. Page sizes
are the server's (10 units) and nothing in the browser assumes them. A page
that fails to load shows its error beside the button and leaves the tiles alone.

The recap has two ways on. **← All units** is first on the page, as on the
practice page, and clears the finished practice. The main button, **Next unit:
<title> →**, starts the unit the server names in the recap's `nextUnit` — the
next playable one in curriculum order, which the browser cannot work out from
the catalogue pages it happens to hold. After the last playable unit there is
no `nextUnit` and no main button.

`/units/:unitId/recap` redirects to `/` when there is nothing in flight. A
practice lives in memory only, so there is nothing to resume after a reload.

Client-side routing needs the host to serve `index.html` for every path.
`public/_redirects` covers Netlify; on GitHub Pages, copy `index.html` to
`404.html` after building.

## Talking to the API

Every request goes through one function, `request<T>()` in
[src/api.ts](src/api.ts). The base URL is `REACT_APP_API_BASE_URL`, defaulting to
`http://localhost:8080/api`. It sets the JSON `Content-Type` only on a request
with a JSON body — on a request with no body, such as the catalogue, that header
would make the browser send an `OPTIONS` preflight first — leaves `FormData`
untouched so audio uploads keep their own boundary, and times
everything out after 10 seconds — 45 for the two calls that wait on a model,
`/reflections` and `/transcribe`.

Five endpoints are used: `GET /units`, `POST /practices`, and the three under
`POST /practices/:id/` — `transcribe`, `reflections` and `complete`.

> **The wire types are mirrored by hand.** [src/types.ts](src/types.ts) is a
> transcription of the Kotlin `@Serializable` classes, and nothing generates or
> checks it. `request<T>` ends in `return body as T`: the type parameter is a
> promise to the compiler, not a runtime check. If the API changes a field, this
> still compiles and fails later, in the component that reads the missing one.
> When the contract moves, this file moves by hand or not at all.

## Errors

There is no generic "something went wrong". Every failure leaves `api.ts` as one
of exactly two types — `NetworkError` (the server never answered) or `ApiError`
(the server answered and said no). `toAppError` in [src/errors.ts](src/errors.ts)
turns either into one `AppError` with a `kind`, and the `kind` decides where it
is shown:

| Where | Which failures | Why there |
| --- | --- | --- |
| Banner, above the page | offline, timeout, 5xx | The page still works. Dismissible, cleared on navigation, and carries **Try again**, because the same request could work twice. |
| Inline, beside the control | a 4xx with a message, no microphone, microphone refused | Fixing the input *is* the retry. The server's own words are used verbatim: it knows what was wrong with the request and we do not. |
| Page, replacing the content | unknown unit (404), unit not built yet (409), practice finished (409), first page of the catalogue failed to load | There is nothing else on the page worth showing. |

A 5xx keeps the server's message off screen — at that status it can be a stack
detail, and fixed copy is what a person should read; the detail goes to
`console.warn` instead. A reply that fails to send comes back off the page and
into the box, draft included.

## Media

A filmed turn arrives with `videoUrl` and `posterUrl` — absolute URLs the
backend builds from bucket paths and `MEDIA_BASE_URL` — and `StepClip` plays it.
The clip speaks the authored `line` word for word; the bridge before it is
written live after your reply, so it stays text. Units without clips work
exactly as before: the line is shown as words.

`StepClip` never starts a clip by itself. It shows the poster — the unit still,
which is the clip's own first frame — under one large **Play** button, which
comes back as Resume or Play again whenever the clip is paused or has ended;
scrolling the page away pauses it. A **Show the words** toggle under every clip
reveals the line as text. If the clip will not load, the words are shown
instead, so a broken video costs the video and nothing else. While a clip plays
the composer says "still talking — reply whenever you're ready"; replying is
never blocked, and speaking pauses the clip.

Voice input:
[useVoiceInput](src/hooks/useVoiceInput.ts) records with `MediaRecorder`, uploads
the blob as `FormData` to `/practices/:id/transcribe`, and puts the transcript
into the draft, where the learner can edit it before sending. Support is decided
at mount, not on click, so a browser that cannot record says so beside the box
rather than failing when pressed; a refused microphone says the same. Either way
you can still type, and leaving mid-recording stops the tracks.

## Styling

Two stylesheets and nothing else: [src/index.css](src/index.css) holds the design
tokens — one `:root` block for light, one `[data-theme="dark"]` block for dark —
and [src/App.css](src/App.css) holds every rule in the app. Theme switching is
one attribute on `<html>`, set by `useTheme`, with no component re-rendering.

If you add a colour, add a token. A hex baked into a rule is a light-mode colour
that survives the theme switch and breaks dark mode. The only rules that name a
colour directly are the ones whose surface is dark in both themes — the hero
gradient and the footer overlay — and they are exceptions,
not a precedent.

A few wash values (`--success-bg`, `--warn-bg`, `--tint` in dark) look like odd
numbers because they are: at rounder values the text on them lands just under
WCAG AA 4.5:1. Check contrast before tidying.

The preference is stored under the `theme` key in `localStorage`, the same key
the marketing site uses, so a visitor's choice carries across both. An inline
script in `public/index.html` applies it before first paint — that is what stops
the white flash on load — and is kept in step with `useTheme` by hand. The onion
pattern is imported from `src/assets/`, not `public/`: a root-absolute `url('/…')`
in a CRA stylesheet does not resolve at build time, and importing it from `src/`
fingerprints it too.

## Accessibility worth knowing about

- A preview unit is plain content, not a `disabled` button. A disabled button
  leaves the tab order, so a screen reader user tabbing the grid would never
  learn those units exist — and being read is the whole job of a roadmap.
- Each page is a labelled region ("Turn 2 of 4"), the current dot carries
  `aria-current="step"`, and the "Turn N of M" counter is `aria-live="polite"`,
  so moving between pages is announced.
- Banner and inline errors are `role="alert"`. A page-level error is not: it
  takes focus on its heading instead, so it is read as a heading rather than
  shouted over whatever the person was doing.
- `prefers-reduced-motion` is honoured in CSS *and* in JS — `StepStrip` jumps
  between pages instead of gliding.
- Waiting states announce themselves through `role="status"`.

## Testing

One test file, [src/App.test.tsx](src/App.test.tsx): 42 tests that render the
real `App` under a `MemoryRouter` against a stubbed `global.fetch`, grouped as
the curriculum, getting into a practice, arriving by URL, the conversation,
the coaching, one page per turn and filmed turns. Nothing is shallow-rendered and no hook is tested alone — the tests
click tiles, type replies and read the page, which is why they survived this app
being split into screens, hooks and components.

The fixtures mirror what the API sends, taken from the authored dialog in the
parent repository's `data/units/start-a-conversation/dialog.json`.

[src/setupTests.ts](src/setupTests.ts) fills the jsdom gaps those tests need:
jest-dom's matchers; a stub `MediaRecorder` and `navigator.mediaDevices`, so
feature detection says "recording works" by default and the tests that care about
the other case take them away deliberately; a `matchMedia` answering "no
preference", so tests do not all run as a visitor who asked for no motion; and
`play()`/`pause()` on media elements, which jsdom does not implement.

## Where to read more

Long-form explanations live in the parent repository, and resolve from here with
this submodule checked out inside it.

- [The frontend as it is](../codelab/part2-kora/modules/03-the-frontend-as-it-is.md)
  — this app read in the order it is built, with `usePractice` read closely.
- [One request, end to end](../codelab/part2-kora/modules/04-one-request-end-to-end.md)
  — every hop of a reply, file and symbol at each one.
- [Frontend/backend boundary](../codelab/part2-kora/reference/frontend-backend-boundary.md)
  — what crosses, what deliberately does not, and who owns which decision.
- [API contract](../codelab/part2-kora/reference/api-contract.md)
  — every route and both wire types, with a change log.
- [Debugging the frontend](../codelab/part1-foundations/reference/debugging-the-frontend.md)
  — symptom first.

## Adding a unit

Nothing changes in this repository: the catalogue is served by the API, previews
included, so the browser holds no list of titles to keep in step. Units are
authored in the parent repository's `data/`, from which the Kotlin is generated.
