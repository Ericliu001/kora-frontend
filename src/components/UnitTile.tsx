import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
function UnitCover({
  index,
  coverUrl,
  coverUrl2x,
}: {
  index: number;
  coverUrl?: string | null;
  coverUrl2x?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (!coverUrl || failed) {
    return <span className="unit-cover is-generated" data-index={index} aria-hidden="true" />;
  }
  return (
    <span className="unit-cover" aria-hidden="true">
      <img
        src={coverUrl}
        // Two widths of the same still. The browser picks by how wide the tile
        // is drawn and how dense the screen is; `sizes` tells it the first of
        // those before the stylesheet has. Mirrors COVER_WIDTH and
        // COVER_WIDTH_2X in backend/.../gym/Media.kt.
        srcSet={coverUrl2x ? `${coverUrl} 384w, ${coverUrl2x} 768w` : undefined}
        sizes={coverUrl2x ? '(max-width: 600px) 100vw, 320px' : undefined}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
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
   * A tile is a picture, a title and how long it takes — whether or not anyone
   * has written the unit. The blurb and the skill it teaches both arrive with
   * the catalogue and are deliberately left off: the title already says it.
   */
  const meta = (
    <span className="unit-meta">
      {isStarting ? 'Starting…' : `about ${unit.estimatedMinutes} min`}
      {unit.playable && !isStarting && ' →'}
    </span>
  );

  const body = (
    <>
      <UnitCover index={index} coverUrl={unit.coverUrl} coverUrl2x={unit.coverUrl2x} />
      <span className="unit-body">
        <span className="card-kicker">
          UNIT {index}
          {!unit.playable && <span className="unit-badge">Preview</span>}
        </span>
        <strong>{unit.title}</strong>
      </span>
    </>
  );

  /**
   * A unit not built yet is a link to its coming-soon page, at the unit's own
   * address. Not a disabled button: that would leave the tab order, and a
   * screen reader user tabbing the grid would never learn these units exist.
   * "Preview" is part of the link's name, so they know before following it.
   *
   * The unit rides along in router state, so that page can name it without
   * asking the server — which would only answer "not built yet".
   */
  if (!unit.playable) {
    return (
      <Link className="unit-tile is-locked" to={`/units/${unit.id}`} state={{ preview: unit }}>
        {body}
        {meta}
      </Link>
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
