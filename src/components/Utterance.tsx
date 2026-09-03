import React, { useEffect, useState } from 'react';
import { Utterance as Line } from '../types';

/** How long a line spends as three dots before it is said. */
const TYPING_MS = 500;

/** Optional-called, like useTheme: jsdom has no matchMedia. */
const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * One line of the conversation.
 *
 * The chat is deliberately not built like the rest of the practice room. The
 * coaching layer is flat, tinted and full width; a line is a bubble with an
 * avatar, a shadow and a side of its own. Two languages, so the eye never has
 * to work out which one it is reading.
 *
 * `justArrived` is the parent's answer to "is this new since the last render",
 * which is the only way a mounted-on-navigation transcript can tell itself
 * apart from a line that genuinely just landed. Only a new line from the other
 * person types; your own reply is already written by the time it appears.
 *
 * The text is in the DOM throughout the typing phase — hidden with opacity,
 * never unmounted — so nothing that reads the page has to wait for the
 * animation to finish.
 */
export default function Utterance({
  line,
  isSending,
  justArrived,
}: {
  line: Line;
  isSending: boolean;
  justArrived: boolean;
}) {
  const [arriving, setArriving] = useState(
    () => justArrived && line.speaker === 'THEM' && !prefersReducedMotion(),
  );

  useEffect(() => {
    if (!arriving) return;
    const timer = window.setTimeout(() => setArriving(false), TYPING_MS);
    return () => window.clearTimeout(timer);
    // Runs once: `arriving` only ever goes true → false, and the timer that
    // does it is the one being cleaned up.
  }, [arriving]);

  // The entrance animation is not in this list on purpose: a CSS animation
  // runs when the element mounts, and appending a line never remounts the ones
  // above it. Nothing has to remember which line is new to make that work.
  const classes = ['utterance', line.speaker.toLowerCase(), isSending ? 'is-sending' : '', arriving ? 'is-arriving' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      <span className="utterance-avatar" aria-hidden="true">
        {line.name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="utterance-body">
        <span className="utterance-name">{line.name}</span>
        <p className="bubble">
          {arriving && (
            <span className="typing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <span className="bubble-text">{line.text}</span>
        </p>
      </div>
      {isSending && <span className="visually-hidden">Sending</span>}
    </article>
  );
}
