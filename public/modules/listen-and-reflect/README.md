# Where the video goes

**Put the finished clip in this folder, named exactly `new-job-1.mp4`.**

```
frontend/public/modules/listen-and-reflect/
├── new-job-1.mp4    ← the video          (required)
├── new-job-1.png    ← the still shown before it plays  (required)
└── README.md        ← this file
```

Three placeholder files are sitting there now. **Overwrite them.** The names and
the folder are what the app looks for — get those right and nothing in the code
needs to change.

Anything under `frontend/public/` is served at the site root, so this folder is
reachable in the browser at `/modules/listen-and-reflect/…`. That is the path
the backend hands to the page, in
`backend/src/main/kotlin/com/buddygo/gym/Modules.kt`:

```kotlin
private const val ASSET_ROOT = "/modules/listen-and-reflect"
...
videoUrl  = "$ASSET_ROOT/new-job-1.mp4"
posterUrl = "$ASSET_ROOT/new-job-1.png"
```

---

## Step by step

### 1. Convert whatever you got into what browsers want

From the repository root:

```bash
cd frontend/public/modules/listen-and-reflect

ffmpeg -i /path/to/your-raw-video.mp4 \
  -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:-2" \
  -crf 26 -preset slow -c:a aac -b:a 96k -movflags +faststart \
  new-job-1.mp4
```

`libx264` + `yuv420p` is the combination every browser plays; `+faststart` lets
it begin before the whole file downloads. Aim to stay under about 2 MB — check
with `ls -lh new-job-1.mp4`, and raise `-crf` (28, 30) if it's fat.

### 2. Grab the still frame

```bash
ffmpeg -i new-job-1.mp4 -ss 00:00:02 -frames:v 1 -q:v 3 new-job-1.png
```

Pick a second where she looks settled and isn't mid-blink — this is the first
thing the learner sees. Try a different `-ss` value if the frame is unflattering.

### 3. Check the length

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 new-job-1.mp4
```

`durationSeconds` in `Modules.kt` is 18 — about 15 seconds of speech followed by
a ~3 second hold. If yours is meaningfully different, change it to match.

There are no captions. The clip plays without a text track; her words live in
`Beat.transcript` and are shown as a text card only when the video fails to
load.

### 4. Let git keep the real files

`frontend/.gitignore` currently ignores everything in here, because the
placeholders shouldn't be committed. Delete these two lines from it:

```
*.mp4
/public/modules/**/*.jpg
```

Then `git add` this folder. You can also delete
`frontend/scripts/make-placeholder-clips.sh` — you won't need stand-ins again.

### 5. Look at it

```bash
cd frontend && npm start
```

Open the module, click into practice, and check two things:

- The video plays and the **Speak** button stays disabled until it ends.
- After the last word there's a pause where it feels like your turn.

---

## If the video doesn't play

The app is built to survive this: when a clip fails to load, her words appear as
text instead and the exercise carries on. So if you see her line as a text card
rather than a video, the file is missing, misnamed, or in a codec the browser
won't take — check the filename first, then re-run step 1.

---

## The words must match the code

The spoken line has to match `new-job-1.transcript` in `Modules.kt`:

> "I started a new job last week. Everyone's been really friendly, but there's
> so much to learn — new systems, new names, a whole way of doing things.
> I keep smiling and nodding, and I feel completely overwhelmed."

The feedback the learner gets is graded against a hand-written answer key tied to
that sentence — the facts she gives, the feeling behind it. If the recording
drifts ("a couple of weeks ago", or dropping "friendly"), correct reflections
start getting marked wrong. Change the wording only by changing the transcript
and the rubric together.

Full direction for producing the clip: `plan/module-1-video-brief.md`.
