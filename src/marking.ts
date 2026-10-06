// Marking tiers. Deterministic marking runs in the player; written answers go to a marker.
// Prototype: no marker is configured, so written answers are self-marked against the mark scheme.
// Next: a Jev marker (one typed yes/no question per marking point, with calibrated confidence) and an LLM fallback.
import type { McqQuestion, NumericQuestion, ShortQuestion } from './course/types';

export interface MarkResult {
  score: number;
  max: number;
  /** Per marking point: awarded, plus confidence when a model marked it. */
  points?: { awarded: boolean; confidence?: number }[];
}

export const markMcq = (q: McqQuestion, choice: number): MarkResult => ({ score: choice === q.answer ? 1 : 0, max: 1 });

export function markNumeric(q: NumericQuestion, input: string): MarkResult {
  const v = Number(input.replace(/[^0-9eE.+-]/g, ''));
  return { score: Number.isFinite(v) && Math.abs(v - q.answer) <= q.tolerance ? 1 : 0, max: 1 };
}

export interface ShortMarker {
  name: string;
  mark: (q: ShortQuestion, answer: string) => Promise<MarkResult>;
}

/** Configured written-answer marker; null means self-marking. */
export const shortMarker: ShortMarker | null = null;

export const shortMax = (q: ShortQuestion) => q.markScheme.reduce((s, p) => s + p.marks, 0);
