"use client";

import type { Course, CourseLibraryEntry, UserProgress } from "@/lib/types";

const COURSE_LIBRARY_KEY = "syllabus:v1:courses";
const COURSE_PROGRESS_KEY = "syllabus:v1:progress";
const LAST_OPENED_KEY = "syllabus:v1:last-opened";

function safeParse<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function saveCourseToLibrary(course: Course) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  const library = safeParse<Record<string, CourseLibraryEntry>>(
    storage.getItem(COURSE_LIBRARY_KEY),
    {},
  );

  library[course.id] = {
    course,
    lastViewedAt: new Date().toISOString(),
  };

  storage.setItem(COURSE_LIBRARY_KEY, JSON.stringify(library));
}

export function removeCourseFromLibrary(courseId: string) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  const library = safeParse<Record<string, CourseLibraryEntry>>(
    storage.getItem(COURSE_LIBRARY_KEY),
    {},
  );

  delete library[courseId];
  storage.setItem(COURSE_LIBRARY_KEY, JSON.stringify(library));

  const progress = safeParse<Record<string, Record<string, UserProgress>>>(
    storage.getItem(COURSE_PROGRESS_KEY),
    {},
  );
  delete progress[courseId];
  storage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(progress));

  const lastOpened = safeParse<Record<string, string>>(storage.getItem(LAST_OPENED_KEY), {});
  delete lastOpened[courseId];
  storage.setItem(LAST_OPENED_KEY, JSON.stringify(lastOpened));
}

export function getCourseFromLibrary(courseId: string) {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  const library = safeParse<Record<string, CourseLibraryEntry>>(
    storage.getItem(COURSE_LIBRARY_KEY),
    {},
  );

  return library[courseId]?.course ?? null;
}

export function listCourseLibrary() {
  const storage = getLocalStorage();

  if (!storage) {
    return [];
  }

  const library = safeParse<Record<string, CourseLibraryEntry>>(
    storage.getItem(COURSE_LIBRARY_KEY),
    {},
  );

  return Object.values(library).sort(
    (left, right) =>
      new Date(right.lastViewedAt).getTime() - new Date(left.lastViewedAt).getTime(),
  );
}

export function loadCourseProgress(courseId: string) {
  const storage = getLocalStorage();

  if (!storage) {
    return {};
  }

  const progress = safeParse<Record<string, Record<string, UserProgress>>>(
    storage.getItem(COURSE_PROGRESS_KEY),
    {},
  );

  return progress[courseId] ?? {};
}

export function upsertCourseProgress(courseId: string, entry: UserProgress) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  const progress = safeParse<Record<string, Record<string, UserProgress>>>(
    storage.getItem(COURSE_PROGRESS_KEY),
    {},
  );

  progress[courseId] ??= {};
  progress[courseId][entry.subsectionId] = entry;
  storage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(progress));
}

export function setLastOpenedSubsection(courseId: string, subsectionId: string) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  const state = safeParse<Record<string, string>>(storage.getItem(LAST_OPENED_KEY), {});
  state[courseId] = subsectionId;
  storage.setItem(LAST_OPENED_KEY, JSON.stringify(state));
}

export function getLastOpenedSubsection(courseId: string) {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  const state = safeParse<Record<string, string>>(storage.getItem(LAST_OPENED_KEY), {});
  return state[courseId] ?? null;
}
