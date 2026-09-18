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
repository, `./dev` starts both in one terminal, installs these packages on first
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
| [src/screens/PracticeScreen.tsx](src/screens/PracticeScreen.tsx) | The practice room: transcript, feedback or composer, the URL-driven start |
| [src/screens/RecapScreen.tsx](src/screens/RecapScreen.tsx) | The recap, turn by turn, and one line worth keeping |
| [src/hooks/usePractice.ts](src/hooks/usePractice.ts) | One practice from first line to recap — the real state machine |
| [src/hooks/useCatalog.ts](src/hooks/useCatalog.ts) | The whole curriculum in one request, plus `findUnit` and a reload |
| [src/hooks/useVoiceInput.ts](src/hooks/useVoiceInput.ts) | Microphone, recording and transcription upload |
| [src/hooks/useTheme.ts](src/hooks/useTheme.ts) | Light/dark, stored and applied to `<html>` |
| [src/components/](src/components) | Everything a screen is made of (see below) |
| [src/api.ts](src/api.ts) | The single HTTP helper, and the two failure types |
| [src/errors.ts](src/errors.ts) | One `AppError`, and where each kind is shown |
| [src/types.ts](src/types.ts) | Wire types, mirrored by hand from the Kotlin |

The components: `SiteHeader` and `SiteFooter` (chrome, and the theme toggle),
`UnitTile` (one unit on the map, or a preview that is deliberately not a button),
`Composer` (the reply box, the speak button, the attempt counter), `CoachingCard`
(the move to practise), `ReflectionScorecard` and `FeedbackPanel` (the three
checks and what to take away), `ReflectionPending` (the same shape while the
server is judging), `Utterance` (one line of the conversation), `ErrorNotice`
(every error a person sees, in three shapes), and `BeatStage`, a video player
that never renders today — see [Media](#media).

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

A unit that is in the catalogue but not written yet is answered from the
catalogue, without asking the server: the server would give the same answer one
round trip later, and with 29 previews that is now the common case.

`/units/:unitId/recap` redirects to `/` when there is nothing in flight. A
practice lives in memory only, so there is nothing to resume after a reload.

Client-side routing needs the host to serve `index.html` for every path.
`public/_redirects` covers Netlify; on GitHub Pages, copy `index.html` to
`404.html` after building.

## Talking to the API

Every request goes through one function, `request<T>()` in
[src/api.ts](src/api.ts). The base URL is `REACT_APP_API_BASE_URL`, defaulting to
`http://localhost:8080/api`. It sets JSON headers for normal requests, leaves
`FormData` untouched so audio uploads keep their own boundary, and times
everything out after 10 seconds — 45 for the two calls that wait on a model,
`/reflections` and `/transcribe`.

Five endpoints are used: `GET /catalog`, `POST /practices`, and the three under
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
| Page, replacing the content | unknown unit (404), unit not built yet (409), practice finished (409), catalogue failed to load | There is nothing else on the page worth showing. |

A 5xx keeps the server's message off screen — at that status it can be a stack
detail, and fixed copy is what a person should read; the detail goes to
`console.warn` instead. A reply that fails to send rolls the conversation back
exactly as it was, draft included.

## Media

**There is no media.** Every unit is written, every turn is text, and no turn
carries a `videoUrl`. `BeatStage` and the `hasClip` branches around it exist
because a clip is one of two normal cases rather than a fallback — the day a turn
is filmed, the data can carry it and nothing else in the loop changes — but that
component never renders today. Nothing here plays a clip, shows captions or
fetches from a CDN, and the unit covers are CSS gradients, not images.

Voice is the one media thing that is real.
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
gradient, the footer overlay and the speaker avatar — and they are exceptions,
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
- The transcript is an `aria-live="polite"` region, and a line's text is in the
  DOM throughout its typing animation — hidden with opacity, never unmounted.
- Banner and inline errors are `role="alert"`. A page-level error is not: it
  takes focus on its heading instead, so it is read as a heading rather than
  shouted over whatever the person was doing.
- `prefers-reduced-motion` is honoured in CSS *and* in JS — `Utterance` skips the
  typing pause rather than merely hiding it.
- Waiting states announce themselves through `role="status"`.

## Testing

One test file, [src/App.test.tsx](src/App.test.tsx): 34 tests that render the
real `App` under a `MemoryRouter` against a stubbed `global.fetch`, grouped as
the curriculum, getting into a practice, arriving by URL, the conversation and
the coaching. Nothing is shallow-rendered and no hook is tested alone — the tests
click tiles, type replies and read the page, which is why they survived this app
being split into screens, hooks and components.

The fixtures mirror what the API sends, taken from the authored dialog in the
parent repository's `data/episodes/start-a-conversation/dialog.json`.

[src/setupTests.ts](src/setupTests.ts) fills the jsdom gaps those tests need:
jest-dom's matchers; a stub `MediaRecorder` and `navigator.mediaDevices`, so
feature detection says "recording works" by default and the tests that care about
the other case take them away deliberately; and a `matchMedia` answering "no
preference", so tests do not all run as a visitor who asked for no motion.

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
