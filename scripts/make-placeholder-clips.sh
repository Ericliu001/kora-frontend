#!/usr/bin/env bash
#
# Generate a stand-in clip so the practice loop is testable before any footage
# exists. Writes to the exact paths the real recording will use, so swapping in
# the real video is dropping in files — no code change.
#
# The output is gitignored. This script is the thing that's committed.
# Delete both once the real clip lands (see the README beside the output).
#
# Usage:  frontend/scripts/make-placeholder-clips.sh
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "ffmpeg is required"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/modules/listen-and-reflect"
mkdir -p "$OUT"

BEAT_ID="new-job-1"
DURATION=18          # ~15s of speech plus the ~3s hold at the end
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# drawtext reads from a file, which sidesteps every quoting rule ffmpeg has
# about commas, colons and apostrophes inside filter arguments.
cat > "$WORK/line.txt" <<'TXT'
Nadia (placeholder — no footage yet)

"I started a new job last week.
Everyone's been really friendly, but there's
so much to learn — new systems, new names,
a whole way of doing things.
I keep smiling and nodding,
and I feel completely overwhelmed."
TXT

FILTER="drawtext=textfile=$WORK/line.txt:fontcolor=white:fontsize=34:line_spacing=14:x=80:y=140"

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x25342E:s=1280x720" \
  -vf "$FILTER" -frames:v 1 "$OUT/$BEAT_ID.jpg"

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x25342E:s=1280x720:d=$DURATION" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t "$DURATION" \
  -vf "$FILTER" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -c:a aac -shortest \
  "$OUT/$BEAT_ID.mp4"

cat > "$OUT/$BEAT_ID.vtt" <<'CAPTIONS'
WEBVTT

00:00:00.500 --> 00:00:04.000
I started a new job last week.

00:00:04.000 --> 00:00:07.500
Everyone's been really friendly,

00:00:07.500 --> 00:00:10.000
but there's so much to learn —

00:00:10.000 --> 00:00:12.500
new systems, new names, a whole way of doing things.

00:00:12.500 --> 00:00:16.000
I keep smiling and nodding, and I feel completely overwhelmed.
CAPTIONS

echo "wrote placeholders to $OUT"
ls -la "$OUT"
