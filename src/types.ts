// Wire types. These mirror the Kotlin @Serializable classes in
// backend/src/main/kotlin/com/buddygo/gym/GymModels.kt. TypeScript checks that
// we *use* them consistently; it cannot check that the server really sends them.

export type Level = 'DEVELOPING' | 'BETTER' | 'BEST';

/**
 * One of the three things the training ground teaches, with everything under it.
 *
 * The whole curriculum arrives in one response — including the units nobody has
 * written yet — so the browser holds no list of its own to drift out of step.
 */
export interface CatalogModule {
  id: string;
  title: string;
  blurb: string;
  units: UnitSummary[];
}

/**
 * A unit as the catalogue lists it.
 *
 * `turnCount` is the one thing a preview has not got, so it is optional: the
 * tile leaves that line out rather than claiming "0 turns". What it teaches and
 * how long it takes every unit knows before anyone writes a line of it.
 */
export interface UnitSummary {
  id: string;
  moduleId: string;
  title: string;
  blurb: string;
  playable: boolean;
  skill: string;
  estimatedMinutes: number;
  turnCount?: number | null;
}

/**
 * The one move being practised on this turn.
 *
 * All of it, `example` included, is in front of the learner *before* they
 * reply. That is the shape of the teaching: here is the move, here is why it
 * works, here is one way to do it — now say it with the facts of your own life.
 */
export interface Coaching {
  skillKey: string;
  label: string;
  instruction: string;
  purpose: string;
  example: string;
}

/** A practice, as it begins. */
export interface Practice {
  id: string;
  unitId: string;
  unitTitle: string;
  userGoal: string;
  turnCount: number;
  turn: Turn;
}

/**
 * One thing the character says.
 *
 * `bridge` is their reaction to what you just said and `line` is the authored
 * continuation; they arrive separately because only the second one is fixed.
 * `videoUrl` is absent on a written turn, which today is every turn.
 */
export interface Turn {
  id: string;
  speaker: string;
  turnNumber: number;
  bridge?: string | null;
  line: string;
  coaching: Coaching;
  videoUrl?: string;
  audioUrl?: string;
  posterUrl?: string;
  durationSeconds?: number;
}

/**
 * How one check landed.
 *
 * `guidance` names what was missing, in the author's words, and arrives only
 * for a check that was missed. The requirement behind it — and the instruction
 * for repairing it — stay on the server.
 */
export interface CriterionResult {
  id: string;
  label: string;
  captured: boolean;
  evidence?: string;
  guidance?: string;
}

/**
 * A better version of *this* reply.
 *
 * `REWRITTEN` is the learner's own words with the missing parts added;
 * `EXAMPLE` is the authored line, offered when there was no model to do the
 * rewriting. The two are labelled differently on screen because they promise
 * different things.
 */
export interface StrongerReply {
  text: string;
  source: 'REWRITTEN' | 'EXAMPLE';
}

export interface Reflection {
  level: Level;
  criteria: CriterionResult[];
  feedback: string;
  strongerReply: StrongerReply;
  attemptsOnTurn: number;
  /** True when the learner stays on the same turn for another try. */
  retry: boolean;
  nextTurn?: Turn;
  complete: boolean;
}

/** One turn's worth of the recap: which move it taught, and how it went. */
export interface TurnRecap {
  turnNumber: number;
  skillLabel: string;
  level: Level;
  met: number;
}

export interface Recap {
  turnsCompleted: number;
  levels: Level[];
  turns: TurnRecap[];
  strongest?: string;
  focus?: string;
  summary: string;
  suggestedLine: string;
}

/** What the learner sees scrolling up the practice room. */
export interface Utterance {
  speaker: 'THEM' | 'YOU';
  name: string;
  text: string;
}

/**
 * Mirrors MAX_ATTEMPTS_PER_TURN in backend/.../plugins/GymRouting.kt.
 *
 * The server decides when a learner has had enough tries; this copy exists
 * only so the composer can say how many are left. If the two ever disagree,
 * the server is right and this line is the bug.
 */
export const MAX_ATTEMPTS_PER_TURN = 3;

export const LEVEL_LABEL: Record<Level, string> = {
  DEVELOPING: 'Getting there',
  BETTER: 'Good reply',
  BEST: 'Strong reply',
};

/** The character's turn as one utterance: their reaction, then their line. */
export const spokenTurn = (turn: Turn): string =>
  [turn.bridge, turn.line].filter(Boolean).join(' ');

/**
 * What a second attempt is allowed to remember.
 *
 * Only the label and whether it landed. `evidence` and `guidance` carry the
 * author's own words about what was missing, and they are dropped here — in one
 * place, so no component can render them beside an empty box and hand back the
 * answer the learner is meant to find.
 */
export const carriedCriteria = (criteria: CriterionResult[]): CriterionResult[] =>
  criteria.map(({ id, label, captured }) => ({ id, label, captured }));

/** "a", "a and b", "a, b and c" — for stitching prompts into one sentence. */
export function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
