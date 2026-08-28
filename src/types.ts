// Wire types. These mirror the Kotlin @Serializable classes in
// backend/src/main/kotlin/com/buddygo/gym/GymModels.kt. TypeScript checks that
// we *use* them consistently; it cannot check that the server really sends them.

export type SubSkill = 'FACTS' | 'FEELING' | 'INVITATION';
export type Level = 'DEVELOPING' | 'BETTER' | 'BEST';

export interface SubSkillInfo {
  skill: SubSkill;
  label: string;
  /** The instruction — what to do. */
  description: string;
  /** Why it works. Shown next to the instruction, before the learner replies. */
  purpose: string;
}

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
 * The optional four are what a unit that has not been written yet does not
 * have. Absent rather than zero, so a locked tile leaves the line out instead
 * of claiming "0 sub-skills · about 0 min".
 */
export interface UnitSummary {
  id: string;
  moduleId: string;
  title: string;
  blurb: string;
  playable: boolean;
  skill?: string | null;
  subSkillCount?: number | null;
  estimatedMinutes?: number | null;
  coverUrl?: string | null;
}

/**
 * A practice, as it begins.
 *
 * [teaches] rides along deliberately. It is what the composer puts in front of
 * the learner before they reply, and carrying it here is what lets a click on a
 * tile go straight into practice with no page in between to fetch it.
 */
export interface Practice {
  id: string;
  unitId: string;
  unitTitle: string;
  teaches: SubSkillInfo[];
  beat: Beat;
}

/** One thing the speaker says. `videoUrl` is absent on written beats. */
export interface Beat {
  id: string;
  speaker: string;
  transcript: string;
  turnNumber: number;
  videoUrl?: string;
  audioUrl?: string;
  posterUrl?: string;
  durationSeconds?: number;
}

export interface Check {
  captured: boolean;
  evidence?: string;
  missed?: string;
}

export interface Checks {
  facts: Check;
  feeling: Check;
  invitation: Check;
}

export interface Exemplar {
  tier: Level;
  text: string;
}

export interface Reflection {
  level: Level;
  checks: Checks;
  feedback: string;
  exemplar: Exemplar;
  attemptsOnBeat: number;
  /** True when the learner stays on the same beat for another try. */
  retry: boolean;
  nextBeat?: Beat;
  complete: boolean;
}

export interface Recap {
  turnsCompleted: number;
  levels: Level[];
  strongest?: SubSkill;
  focus?: SubSkill;
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
 * Mirrors MAX_ATTEMPTS_PER_BEAT in backend/.../plugins/GymRouting.kt.
 *
 * The server decides when a learner has had enough tries; this copy exists
 * only so the composer can say how many are left. If the two ever disagree,
 * the server is right and this line is the bug.
 */
export const MAX_ATTEMPTS_PER_BEAT = 3;

/** The three checks, addressable by sub-skill rather than by field name. */
export const checkBySkill = (checks: Checks): Record<SubSkill, Check> => ({
  FACTS: checks.facts,
  FEELING: checks.feeling,
  INVITATION: checks.invitation,
});

export const SUB_SKILL_ORDER: SubSkill[] = ['FACTS', 'FEELING', 'INVITATION'];

export const SUB_SKILL_LABEL: Record<SubSkill, string> = {
  FACTS: 'The facts',
  FEELING: 'The feeling',
  INVITATION: 'The invitation',
};

export const LEVEL_LABEL: Record<Level, string> = {
  DEVELOPING: 'Getting there',
  BETTER: 'Good reflection',
  BEST: 'Strong reflection',
};

/**
 * How each sub-skill is asked for on a second attempt.
 *
 * Deliberately generic: these name the move, never the answer. The rubric's
 * words — what she said, what she feels — stay on the server, so finding them
 * is still the learner's job the second time around.
 */
export const RETRY_PROMPT: Record<SubSkill, string> = {
  FACTS: 'say back what happened',
  FEELING: 'name how they feel',
  INVITATION: 'leave them an opening',
};

/** "a", "a and b", "a, b and c" — for stitching prompts into one sentence. */
export function joinPhrases(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
