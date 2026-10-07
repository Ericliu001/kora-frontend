import React from 'react';
import ErrorNotice from '../components/ErrorNotice';
import UnitTile from '../components/UnitTile';
import { AppError } from '../errors';
import { ModuleInfo, UnitSummary } from '../types';

/** Holds the shape of the page while the catalogue is in flight. */
function GridSkeleton() {
  return (
    <ul className="unit-grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <li key={n}>
          <div className="unit-tile is-skeleton">
            <span className="unit-cover is-generated" />
            <span className="unit-body">
              <span className="skeleton-line" />
              <span className="skeleton-line" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "1 more unit", "10 more units". */
const countUnits = (n: number) => `${n} more ${n === 1 ? 'unit' : 'units'}`;

export default function HomeScreen({
  modules,
  units,
  remaining,
  hasMore,
  isLoading,
  error,
  isLoadingMore,
  moreError,
  arrived,
  startingId,
  onRetry,
  onLoadMore,
  onStart,
}: {
  modules: ModuleInfo[];
  /** Every unit loaded so far, in curriculum order, across all modules. */
  units: UnitSummary[];
  /** How many units are still to be loaded. */
  remaining: number;
  hasMore: boolean;
  isLoading: boolean;
  error: AppError | null;
  isLoadingMore: boolean;
  /** The last "show more" failed. The tiles already here are untouched. */
  moreError: AppError | null;
  /** How many units the last "show more" brought. */
  arrived: number;
  /** The unit whose practice is currently being created, if any. */
  startingId: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onStart: (unit: UnitSummary) => void;
}) {
  // A page can stop halfway through a module, so the units arrive flat and are
  // filed under their headings here. A module with nothing loaded yet has no
  // section: a heading over an empty grid would promise tiles that are not there.
  const sections = modules
    .map((module, position) => ({
      module,
      position,
      units: units.filter((unit) => unit.moduleId === module.id),
    }))
    .filter((section) => section.units.length > 0);

  return (
    <>
      <section className="hero bg-pattern-onion-hero">
        <div className="hero-content">
          <h1>Conversation practice with feedback</h1>
          <p>
            Improve your social skills by practising conversation and small talk. Watch a short
            video of someone talking to you, reply by speaking or typing, and see what you did
            well, what you missed, and how to say it better.
          </p>
        </div>
      </section>

      <div className="container landing">
        {/* A catalogue that will not load is the whole page failing, so it
            replaces the grid rather than hovering above an empty one. */}
        {error ? (
          <ErrorNotice
            error={{ ...error, action: { label: 'Try again', run: onRetry } }}
            variant="page"
          />
        ) : isLoading ? (
          <GridSkeleton />
        ) : (
          sections.map(({ module, position, units: moduleUnits }) => (
            <section
              className="module-section"
              data-module={module.id}
              key={module.id}
              aria-labelledby={`module-${module.id}`}
            >
              <header className="module-section-head">
                <p className="eyebrow">MODULE {position + 1}</p>
                <h2 id={`module-${module.id}`}>{module.title}</h2>
                <p className="module-blurb">{module.blurb}</p>
              </header>

              {/* A list, so a screen reader announces how much roadmap there is. */}
              <ul className="unit-grid">
                {moduleUnits.map((unit, index) => (
                  <li key={unit.id}>
                    <UnitTile
                      unit={unit}
                      index={index + 1}
                      isStarting={startingId === unit.id}
                      onStart={() => onStart(unit)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {/* The rest of the roadmap, when asked for. A failure here sits beside
            the button and leaves every tile above it where it was. */}
        {!error && !isLoading && hasMore && (
          <div className="load-more">
            {moreError && <ErrorNotice error={moreError} variant="inline" />}
            <button
              className="primary-button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              aria-busy={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : moreError ? 'Try again' : 'Show more units'}
            </button>
            {remaining > 0 && <p className="muted small">{countUnits(remaining)} to see</p>}
          </div>
        )}

        {/* New tiles appear above the button, out of sight of a screen reader
            sitting on it — so their arrival is said, once, here. */}
        <p className="visually-hidden" role="status">
          {arrived > 0 && !isLoadingMore ? `${countUnits(arrived)} shown.` : ''}
        </p>
      </div>
    </>
  );
}
