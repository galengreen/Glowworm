export interface Level {
  id: string;
  title: string;
  lessons: string[];
}

export interface CourseMeta {
  id: string;
  title: string;
  subtitle?: string;
  sample?: boolean;
  levels: Level[];
}

export interface Segment {
  id: string; // stable block id
  title: string;
  body: string; // markdown
}

export interface Lesson {
  id: string;
  file: string;
  title: string;
  level: string;
  concepts: string[];
  segments: Segment[];
}

export interface DiagramRef {
  widget: string;
  params: Record<string, string>;
}

export interface WikiPage {
  id: string;
  file: string;
  title: string;
  summary: string;
  sources: string[]; // e.g. notes#gradient
  prerequisites: string[];
  related: string[];
  diagram?: DiagramRef; // the concept's standard diagram
  body: string;
}

export interface SourceDoc {
  id: string; // file name without extension
  file: string;
  title: string;
  body: string;
  anchors: string[]; // heading slugs
}

export interface MarkPoint {
  point: string;
  marks: number;
  feedback: string;
}

interface QuestionBase {
  id: string;
  file: string;
  concept: string; // wiki page this question cites
  prompt: string; // markdown
  hints: string[];
  explain?: string;
  exam?: boolean; // exam-style, used in Practice
}

export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  choices: string[];
  answer: number;
}

export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  answer: number;
  tolerance: number;
  unit?: string;
}

export interface ShortQuestion extends QuestionBase {
  type: 'short';
  markScheme: MarkPoint[];
  model?: string;
}

export type Question = McqQuestion | NumericQuestion | ShortQuestion;

export interface Course {
  meta: CourseMeta;
  root: string; // e.g. /courses/neural-nets
  lessons: Record<string, Lesson>;
  wiki: Record<string, WikiPage>;
  sources: Record<string, SourceDoc>;
  questions: Record<string, Question>;
  widgetIds: string[];
}

export interface Issue {
  level: 'error' | 'warn';
  file: string;
  message: string;
}
