// Local progress: attempts, FSRS review cards, passed segments and predictions. Stored per course in localStorage.
import { useSyncExternalStore } from 'react';
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import { scanDirectives } from '../course/parse';
import type { Course, Lesson, Segment } from '../course/types';
import { createStore } from './store';

export interface Attempt {
  at: number;
  score: number;
  max: number;
  hints: number;
}

export interface CourseProgress {
  attempts: Record<string, Attempt[]>;
  cards: Record<string, Card>;
  segments: Record<string, true>;
  predictions: Record<string, string>;
  /** Last lesson opened, for "continue where you left off". */
  last?: string;
}

type AllProgress = Record<string, CourseProgress>;

const KEY = 'glowworm:progress:v1';
const empty = (): CourseProgress => ({ attempts: {}, cards: {}, segments: {}, predictions: {} });

function revive(all: AllProgress): AllProgress {
  for (const p of Object.values(all)) {
    for (const c of Object.values(p.cards)) {
      c.due = new Date(c.due);
      if (c.last_review) c.last_review = new Date(c.last_review);
    }
  }
  return all;
}

export const progress = createStore<AllProgress>(revive(JSON.parse(localStorage.getItem(KEY) ?? '{}')));
progress.subscribe(() => localStorage.setItem(KEY, JSON.stringify(progress.get())));

const scheduler = fsrs();

export const useProgress = (course: string): CourseProgress =>
  useSyncExternalStore(progress.subscribe, () => progress.get()[course] ?? EMPTY);
const EMPTY = empty();

function update(course: string, fn: (p: CourseProgress) => CourseProgress) {
  progress.set((all) => ({ ...all, [course]: fn(all[course] ?? empty()) }));
}

/** Correct with no hints → Good, partial or hinted → Hard, wrong → Again. */
function grade(score: number, max: number, hints: number): Grade {
  const r = max ? score / max : 0;
  if (r >= 1) return hints ? Rating.Hard : Rating.Good;
  if (r >= 0.5) return Rating.Hard;
  return Rating.Again;
}

export function recordAttempt(course: string, qid: string, score: number, max: number, hints: number) {
  const now = new Date();
  update(course, (p) => {
    const card = p.cards[qid] ?? createEmptyCard(now);
    const next = scheduler.next(card, now, grade(score, max, hints)).card;
    return {
      ...p,
      attempts: { ...p.attempts, [qid]: [...(p.attempts[qid] ?? []), { at: now.getTime(), score, max, hints }] },
      cards: { ...p.cards, [qid]: next },
    };
  });
}

export const passSegment = (course: string, seg: string) =>
  update(course, (p) => ({ ...p, segments: { ...p.segments, [seg]: true } }));

export const setPrediction = (course: string, key: string, text: string) =>
  update(course, (p) => ({ ...p, predictions: { ...p.predictions, [key]: text } }));

export const setLast = (course: string, lesson: string) =>
  progress.get()[course]?.last === lesson ? undefined : update(course, (p) => ({ ...p, last: lesson }));

export const resetProgress = (course: string) => update(course, () => empty());

// ---------- derived ----------

export const latestRatio = (p: CourseProgress, qid: string) => {
  const a = p.attempts[qid]?.at(-1);
  return a ? (a.max ? a.score / a.max : 0) : 0;
};

/** Mastery of a concept: mean latest score across every question that cites it (unattempted counts as 0). */
export function conceptMastery(course: Course, p: CourseProgress, concept: string) {
  const qs = Object.values(course.questions).filter((q) => q.concept === concept);
  if (!qs.length) return 0;
  return qs.reduce((sum, q) => sum + latestRatio(p, q.id), 0) / qs.length;
}

export function levelMastery(course: Course, p: CourseProgress, levelId: string) {
  const level = course.meta.levels.find((l) => l.id === levelId);
  const concepts = [...new Set(level?.lessons.flatMap((l) => course.lessons[l]?.concepts ?? []) ?? [])];
  if (!concepts.length) return 0;
  return concepts.reduce((s, c) => s + conceptMastery(course, p, c), 0) / concepts.length;
}

export const dueQuestions = (course: Course, p: CourseProgress, now = new Date()) =>
  Object.entries(p.cards)
    .filter(([qid, c]) => course.questions[qid] && c.due <= now)
    .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
    .map(([qid]) => qid);

export const MASTERY_GATE = 0.7;

// ---------- lesson progress ----------

export const segmentRecalls = (seg: Segment) => scanDirectives(seg.body).recalls;

/** A segment is passed once its recall questions have been attempted (or it was skipped). */
export const segmentPassed = (p: CourseProgress, seg: Segment) =>
  !!p.segments[seg.id] || segmentRecalls(seg).every((q) => (p.attempts[q]?.length ?? 0) > 0);

export function lessonProgress(lesson: Lesson, p: CourseProgress) {
  const passed = lesson.segments.filter((s) => segmentPassed(p, s)).length;
  return { passed, total: lesson.segments.length, done: passed === lesson.segments.length };
}

/** Where "Continue" goes: the last lesson if unfinished, otherwise the first unfinished lesson. */
export function continueTarget(course: Course, p: CourseProgress): { lesson: string; fresh: boolean } | null {
  const order = course.meta.levels.flatMap((l) => l.lessons).filter((id) => course.lessons[id]);
  const unfinished = (id: string) => !lessonProgress(course.lessons[id], p).done;
  if (p.last && course.lessons[p.last] && unfinished(p.last)) return { lesson: p.last, fresh: false };
  const next = order.find(unfinished);
  if (next) return { lesson: next, fresh: !Object.keys(p.attempts).length };
  return null;
}
