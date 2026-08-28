import React from 'react';
import ErrorNotice from '../components/ErrorNotice';
import UnitTile from '../components/UnitTile';
import { AppError } from '../errors';
import { CatalogModule, UnitSummary } from '../types';

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

export default function HomeScreen({
  modules,
  isLoading,
  error,
  startingId,
  onRetry,
  onStart,
}: {
  modules: CatalogModule[];
  isLoading: boolean;
  error: AppError | null;
  /** The unit whose practice is currently being created, if any. */
  startingId: string | null;
  onRetry: () => void;
  onStart: (unit: UnitSummary) => void;
}) {
  return (
    <>
      <section className="hero bg-pattern-onion-hero">
        <div className="hero-content">
          <p className="eyebrow">THE TRAINING GROUND</p>
          <h1>Learn to talk to people, one unit at a time.</h1>
          <p>
            Short, repeatable exercises. Someone tells you something real, you reply out loud, and
            you find out exactly what you caught and what you missed.
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
          modules.map((module, position) => (
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
                {module.units.map((unit, index) => (
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
      </div>
    </>
  );
}
