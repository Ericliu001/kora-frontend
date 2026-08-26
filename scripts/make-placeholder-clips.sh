#!/usr/bin/env bash
#
# Generate stand-in clips so the practice loop is testable before any footage
# exists. Writes to the exact paths the real recordings will use, so swapping in
# real video is dropping in files — no code change.
#
# The output is gitignored. This script is the thing that's committed.
#
# Usage:  frontend/scripts/make-placeholder-clips.sh
set -euo pipefail

command -v ffmpeg >/dev/null || { echo "ffmpeg is required"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/modules/listen-and-reflect"
mkdir -p "$OUT"

BEAT_ID="new-job-1"
DURATION=18
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# drawtext reads from a file, which sidesteps every quoting rule ffmpeg has
# about commas, colons and apostrophes inside filter arguments.
cat > "$WORK/line.txt" <<'TXT'
Nadia (placeholder — no footage yet)

"I started a new job last week.
Everyone seems friendly, but there's so
much to learn that I feel overwhelmed."
TXT

FILTER="drawtext=textfile=$WORK/line.txt:fontcolor=white:fontsize=38:line_spacing=16:x=80:y=170"

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x25342E:s=1280x720" \
  -vf "$FILTER" -frames:v 1 "$OUT/$BEAT_ID.jpg"

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x25342E:s=1280x720:d=$DURATION" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t "$DURATION" \
  -vf "$FILTER" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -c:a aac -shortest \
  "$OUT/$BEAT_ID.mp4"

cat > "$OUT/$BEAT_ID.vtt" <<'VTT'
WEBVTT

00:00:01.000 --> 00:00:06.000
I started a new job last week.

00:00:06.000 --> 00:00:11.000
Everyone seems friendly, but there's so

00:00:11.000 --> 00:00:18.000
much to learn that I feel overwhelmed.
VTT

echo "wrote placeholders to $OUT"
ls -la "$OUT"
