import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Practising } from '../hooks/usePractice';
import StepPage from './StepPage';

/** Long enough for a smooth scroll to land; after this, the learner's scrolling counts again. */
const SETTLE_MS = 900;

/** Optional-called, like useTheme: jsdom has no matchMedia. */
const prefersReducedMotion = () =>
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Keys typed into the reply box are the reply, not navigation. */
const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.tagName === 'TEXTAREA' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.isContentEditable)
  );
};

/**
 * The practice as a row of pages, one per turn, scrolled sideways.
 *
 * The browser does the swiping: the row is a horizontal scroller that snaps
 * page by page, so a phone swipe, a trackpad and a scroll wheel all work with
 * nothing listening for gestures. Arrow buttons, dots and the ← → keys move it
 * too, for everyone without either.
 *
 * Pages exist only up to the turn being worked on — there is nothing to show
 * ahead of it until the learner has replied — so the dots for later turns are
 * placeholders, not links. When a turn is reached its page is added and the
 * row scrolls to it.
 *
 * Which page is on screen is read back from the scroll position rather than
 * held as the source of truth, so a swipe and a button can never disagree.
 */
export default function StepStrip({ practice }: { practice: Practising }) {
  const { steps, turnCount } = practice;
  const last = steps.length - 1;

  const strip = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(last);

  // While a scroll we started is still travelling, the pages it passes are not
  // destinations: without this a clip two pages back would start and stop as
  // the row slid past it.
  const heading = useRef<number | null>(null);
  const settle = useRef<number | undefined>(undefined);

  const goTo = useCallback(
    (index: number, smooth = true) => {
      const element = strip.current;
      const target = Math.max(0, Math.min(index, last));
      setActive(target);
      if (!element) return;
      const left = target * element.clientWidth;
      heading.current = target;
      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => (heading.current = null), SETTLE_MS);
      const behavior: ScrollBehavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto';
      // jsdom has no Element.scrollTo.
      if (typeof element.scrollTo === 'function') element.scrollTo({ left, behavior });
      else element.scrollLeft = left;
    },
    [last],
  );

  // A new page is where the practice went, so go there. The first page is
  // already in place; jumping to it would only be a scroll with nowhere to go.
  const shown = useRef(steps.length);
  useEffect(() => {
    const grew = steps.length > shown.current;
    shown.current = steps.length;
    goTo(steps.length - 1, grew);
  }, [steps.length, goTo]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  // A resized window changes the page width; stay on the same page.
  useEffect(() => {
    const onResize = () => {
      const element = strip.current;
      if (element) element.scrollLeft = active * element.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // The row is as tall as the page on screen, not as its tallest page: a page
  // already left is short, and would otherwise sit above a screen of nothing.
  // Followed as the page grows — feedback arriving, a panel opening.
  useEffect(() => {
    const element = strip.current;
    const page = element?.children[active] as HTMLElement | undefined;
    if (!element || !page) return;
    const fit = () => {
      element.style.height = `${page.offsetHeight}px`;
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(page);
    return () => observer.disconnect();
  }, [active, steps.length]);

  const onScroll = () => {
    const element = strip.current;
    if (!element || element.clientWidth === 0) return;
    const index = Math.round(element.scrollLeft / element.clientWidth);
    if (heading.current !== null) {
      if (index !== heading.current) return;
      heading.current = null;
    }
    setActive(Math.max(0, Math.min(index, last)));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (isTyping(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(active - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(active + 1);
    }
  };

  return (
    <div className="steps" onKeyDown={onKeyDown}>
      <nav className="step-nav" aria-label="Turns">
        <button
          className="step-arrow"
          onClick={() => goTo(active - 1)}
          disabled={active <= 0}
          aria-label="Previous turn"
        >
          ←
        </button>
        <ol className="step-dots">
          {Array.from({ length: Math.max(turnCount, steps.length) }, (_, index) => (
            <li key={index}>
              {index <= last ? (
                <button
                  className={index === active ? 'step-dot is-active' : 'step-dot is-reached'}
                  onClick={() => goTo(index)}
                  aria-label={`Turn ${index + 1}`}
                  aria-current={index === active ? 'step' : undefined}
                />
              ) : (
                <span className="step-dot is-locked" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
        <button
          className="step-arrow"
          onClick={() => goTo(active + 1)}
          disabled={active >= last}
          aria-label="Next turn"
        >
          →
        </button>
        <span className="step-count" aria-live="polite">
          Turn {active + 1} of {turnCount}
        </span>
        {active < last && (
          <button className="quiet-button step-return" onClick={() => goTo(last)}>
            Back to your turn →
          </button>
        )}
      </nav>

      <div
        className="step-strip"
        ref={strip}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="The conversation, one turn per page"
      >
        {steps.map((step, index) => (
          <section
            className="step"
            key={step.turn.id}
            aria-label={`Turn ${step.turn.turnNumber} of ${turnCount}`}
            aria-current={index === active ? 'step' : undefined}
          >
            <StepPage
              step={step}
              isCurrent={index === last}
              isActive={index === active}
              practice={practice}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
