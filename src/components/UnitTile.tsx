import React, { useState } from 'react';
import { UnitSummary } from '../types';

/**
 * The cover.
 *
 * A filmed unit shows its still — the frame every one of its clips starts on,
 * so the face on the tile is the face you are about to talk to. Every other
 * unit, and any still that fails to load, gets a gradient and the unit's own
 * number instead: tiles that differ at a glance, and nothing to throw away when
 * a real still arrives.
 *
 * The image is decoration beside a title that already says what the unit is,
 * so it has empty alt text rather than a description to read out.
 */
function UnitCover({ index, coverUrl }: { index: number; coverUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!coverUrl || failed) {
    return <span className="unit-cover is-generated" data-index={index} aria-hidden="true" />;
  }
  return (
    <span className="unit-cover" aria-hidden="true">
      <img src={coverUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

export default function UnitTile({
  unit,
  index,
  isStarting,
  onStart,
}: {
  unit: UnitSummary;
  /** Position within its module, 1-based. What the learner calls it out loud. */
  index: number;
  isStarting: boolean;
  onStart: () => void;
}) {
  /**
   * Every tile says what it teaches and roughly how long it takes, whether or
   * not anyone has written it. A roadmap that will not say what is on it is not
   * much of a roadmap — and the catalogue knows both facts about all of them.
   */
  const meta = (
    <span className="unit-meta">
      {isStarting ? 'Starting…' : `${unit.skill} · about ${unit.estimatedMinutes} min`}
      {unit.playable && !isStarting && ' →'}
    </span>
  );

  const body = (
    <>
      <UnitCover index={index} coverUrl={unit.coverUrl} />
      <span className="unit-body">
        <span className="card-kicker">
          UNIT {index}
          {!unit.playable && <span className="unit-badge">Preview</span>}
        </span>
        <strong>{unit.title}</strong>
        <span className="unit-blurb">{unit.blurb}</span>
      </span>
    </>
  );

  /**
   * Not a disabled button.
   *
   * A `disabled` button leaves the tab order in every browser, so a screen
   * reader user tabbing the grid would never learn these units exist — and
   * being read is the entire job of a roadmap. Plain content is fully readable
   * in browse mode, has nothing focusable to disappoint, and nothing to click.
   */
  if (!unit.playable) {
    return (
      <article className="unit-tile is-locked">
        {body}
        {meta}
      </article>
    );
  }

  return (
    <button
      className={isStarting ? 'unit-tile is-starting' : 'unit-tile'}
      onClick={onStart}
      disabled={isStarting}
      aria-busy={isStarting}
    >
      {body}
      {meta}
    </button>
  );
}
