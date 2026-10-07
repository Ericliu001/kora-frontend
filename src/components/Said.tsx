import React from 'react';

/**
 * Something a person said: the character's line, or your reply.
 *
 * The practice room speaks two visual languages and this is one of them. What
 * anybody said is a bubble with a name over it; everything the app says about
 * it sits on the tinted coaching surface. Nothing here takes the rail, and
 * nothing there takes a bubble.
 *
 * `kind` picks the voice: `line` is the thing being answered and the loudest
 * text on the page, `you` is your own words.
 */
export default function Said({
  name,
  text,
  kind = 'line',
  isSending = false,
}: {
  name: string;
  text: string;
  kind?: 'line' | 'you';
  isSending?: boolean;
}) {
  const classes = ['said', kind, isSending ? 'is-sending' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <span className="said-name">{name}</span>
      <p>{text}</p>
      {isSending && <span className="visually-hidden">Sending</span>}
    </div>
  );
}
