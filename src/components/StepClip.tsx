import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Turn } from '../types';
import Said from './Said';

/**
 * A filmed turn: the character saying their line.
 *
 * Nothing plays until the learner presses Play. The clip sits on its poster —
 * the unit still, which is the clip's own first frame — under one large button,
 * and the button comes back whenever the clip is paused or has finished.
 * Scrolling the page away pauses it.
 *
 * The line is there as text too, behind a "Show the words" toggle: for reading
 * along, for a quiet room, or for anyone who would rather read than listen. If
 * the clip will not load, the words are simply shown, so a broken video costs
 * the video and nothing else.
 *
 * [onHeard] is told when the learner has had the line, by ear or by eye: the
 * clip played to its end, they opened the words, or the clip failed and the
 * words took its place. It may be told more than once.
 */
export default function StepClip({
  turn,
  active,
  videoRef,
  onPlayingChange,
  onHeard,
}: {
  turn: Turn;
  /** Its page is the one on screen. */
  active: boolean;
  /** Handed in on the current turn only, so speaking can stop them talking. */
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** Told when the current turn's clip starts and stops. */
  onPlayingChange?: (playing: boolean) => void;
  /** Told when the line has been heard to the end, or read. */
  onHeard?: () => void;
}) {
  const own = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [failed, setFailed] = useState(false);

  // One element, two holders: this component, and — on the current turn — the
  // practice, which pauses it when the learner starts recording.
  const attach = useCallback(
    (element: HTMLVideoElement | null) => {
      const previous = own.current;
      own.current = element;
      if (!videoRef) return;
      if (element) videoRef.current = element;
      else if (videoRef.current === previous) videoRef.current = null;
    },
    [videoRef],
  );

  const report = useCallback(
    (now: boolean) => {
      setPlaying(now);
      onPlayingChange?.(now);
    },
    [onPlayingChange],
  );

  const play = () => {
    const video = own.current;
    if (!video) return;
    if (finished) video.currentTime = 0;
    setStarted(true);
    // A real browser returns a promise; jsdom returns nothing.
    const attempt = video.play() as Promise<void> | undefined;
    attempt?.catch?.(() => report(false));
  };

  // Off screen is out of earshot.
  useEffect(() => {
    const video = own.current;
    if (!active && video && !video.paused) video.pause();
  }, [active]);

  // A page that stops being the current turn stops reporting; make sure the
  // practice is not left thinking someone is still talking.
  useEffect(() => () => onPlayingChange?.(false), [onPlayingChange]);

  if (failed) return <Said name={turn.speaker} text={turn.line} />;

  return (
    <figure className="step-clip">
      <div className="clip-frame">
        <video
          ref={attach}
          className="beat-video"
          src={turn.videoUrl}
          poster={turn.posterUrl}
          // The browser's own controls arrive with the first play, so the
          // poster is one picture and one button, not a toolbar.
          controls={started}
          playsInline
          preload="metadata"
          onPlay={() => {
            setFinished(false);
            report(true);
          }}
          onPause={() => report(false)}
          onEnded={() => {
            setFinished(true);
            report(false);
            onHeard?.();
          }}
          // No clip at that address, or a codec this browser won't take.
          onError={() => {
            setFailed(true);
            report(false);
            // The words are on the page in its place.
            onHeard?.();
          }}
        />
        {!playing && (
          <button className="clip-play" onClick={play}>
            {finished ? '↺ Play again' : started ? '▶ Resume' : '▶ Play'}
          </button>
        )}
      </div>
      <div className="stage-actions">
        <button
          className="quiet-button"
          onClick={() => {
            if (!showWords) onHeard?.();
            setShowWords(!showWords);
          }}
          aria-expanded={showWords}
        >
          {showWords ? 'Hide the words' : 'Show the words'}
        </button>
      </div>
      {showWords && (
        <figcaption>
          <Said name={turn.speaker} text={turn.line} />
        </figcaption>
      )}
    </figure>
  );
}
