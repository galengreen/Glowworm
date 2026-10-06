import { createContext, useContext } from 'react';
import type { Course } from '../course/types';

export interface CourseCtx {
  course: Course;
  dir: string;
}

export const CourseContext = createContext<CourseCtx | null>(null);
export const useCourse = () => {
  const c = useContext(CourseContext);
  if (!c) throw new Error('useCourse outside CourseContext');
  return c;
};
