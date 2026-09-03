import React from 'react';
import { UnitSummary } from '../types';

/**
 * The cover.
 *
 * No unit has footage yet, and generating thirty-four placeholder images to
 * fill a grid would be thirty-four files to delete later. A gradient and the
 * unit's own number does the same job: tiles that differ from each other at a
 * glance, and nothing to throw away when a real still arrives.
 */
function UnitCover({ index }: { index: number }) {
  return <span className="unit-cover is-generated" data-index={index} aria-hidden="true" />;
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
      <UnitCover index={index} />
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
