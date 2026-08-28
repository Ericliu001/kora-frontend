import React, { useState } from 'react';
import { UnitSummary } from '../types';

/**
 * The cover, or a stand-in for it.
 *
 * Almost no unit has footage yet, and generating twenty placeholder images to
 * fill a grid would be twenty files to delete later. A gradient and the unit's
 * own number does the same job: tiles that differ from each other at a glance,
 * and nothing to throw away when the real still arrives.
 *
 * `coverUrl` is server-supplied and the file may not be on disk, so a broken
 * image falls back to the same stand-in rather than showing a torn-page icon.
 */
function UnitCover({ unit, index }: { unit: UnitSummary; index: number }) {
  const [failed, setFailed] = useState(false);
  const generated = !unit.coverUrl || failed;

  return (
    <span
      className={generated ? 'unit-cover is-generated' : 'unit-cover'}
      data-index={index}
      aria-hidden="true"
    >
      {!generated && <img src={unit.coverUrl as string} alt="" onError={() => setFailed(true)} />}
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
  const body = (
    <>
      <UnitCover unit={unit} index={index} />
      <span className="unit-body">
        <span className="card-kicker">
          UNIT {index}
          {!unit.playable && <span className="unit-badge">Coming soon</span>}
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
    return <article className="unit-tile is-locked">{body}</article>;
  }

  return (
    <button
      className={isStarting ? 'unit-tile is-starting' : 'unit-tile'}
      onClick={onStart}
      disabled={isStarting}
      aria-busy={isStarting}
    >
      {body}
      <span className="unit-meta">
        {isStarting ? (
          'Starting…'
        ) : (
          <>
            {unit.subSkillCount} sub-skills · about {unit.estimatedMinutes} min →
          </>
        )}
      </span>
    </button>
  );
}
