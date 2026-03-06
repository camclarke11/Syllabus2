import type { Chapter, Course, Subsection, UserProgress } from "@/lib/types";

export interface CourseProgressSummary {
  completedSubsections: number;
  totalSubsections: number;
  percent: number;
}

export interface CoursePointer {
  chapter: Chapter;
  subsection: Subsection;
}

export function flattenCourse(course: Course) {
  return course.chapters.flatMap((chapter) =>
    chapter.subsections.map((subsection) => ({ chapter, subsection })),
  );
}

export function getSubsectionByOrders(
  course: Course,
  chapterOrder: number,
  subsectionOrder: number,
) {
  const chapter = course.chapters.find((item) => item.order === chapterOrder);
  const subsection = chapter?.subsections.find((item) => item.order === subsectionOrder);

  if (!chapter || !subsection) {
    return null;
  }

  return { chapter, subsection };
}

export function getAdjacentPointers(
  course: Course,
  chapterOrder: number,
  subsectionOrder: number,
) {
  const flattened = flattenCourse(course);
  const currentIndex = flattened.findIndex(
    ({ chapter, subsection }) =>
      chapter.order === chapterOrder && subsection.order === subsectionOrder,
  );

  return {
    previous: currentIndex > 0 ? flattened[currentIndex - 1] : null,
    next:
      currentIndex >= 0 && currentIndex < flattened.length - 1
        ? flattened[currentIndex + 1]
        : null,
  };
}

export function getProgressSummary(
  course: Course,
  progressMap: Record<string, UserProgress>,
): CourseProgressSummary {
  const totalSubsections = flattenCourse(course).length;
  const completedSubsections = flattenCourse(course).filter(
    ({ subsection }) => progressMap[subsection.id]?.completed,
  ).length;
  const percent =
    totalSubsections === 0
      ? 0
      : Math.round((completedSubsections / totalSubsections) * 100);

  return {
    completedSubsections,
    totalSubsections,
    percent,
  };
}

export function getChapterProgress(
  chapter: Chapter,
  progressMap: Record<string, UserProgress>,
) {
  const total = chapter.subsections.length;
  const completed = chapter.subsections.filter(
    (subsection) => progressMap[subsection.id]?.completed,
  ).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}

export function getContinuePointer(
  course: Course,
  progressMap: Record<string, UserProgress>,
  lastOpenedSubsectionId?: string | null,
): CoursePointer | null {
  const flattened = flattenCourse(course);

  if (lastOpenedSubsectionId) {
    const match = flattened.find(
      ({ subsection }) => subsection.id === lastOpenedSubsectionId,
    );

    if (match) {
      return match;
    }
  }

  return (
    flattened.find(({ subsection }) => !progressMap[subsection.id]?.completed) ??
    flattened[0] ??
    null
  );
}

export function isChapterLocked(
  course: Course,
  chapter: Chapter,
  progressMap: Record<string, UserProgress>,
) {
  if (chapter.order === 1) {
    return false;
  }

  const previousChapter = course.chapters.find((item) => item.order === chapter.order - 1);

  if (!previousChapter) {
    return false;
  }

  return getChapterProgress(previousChapter, progressMap).percent < 100;
}

export function getCoursePointerHref(courseId: string, pointer: CoursePointer) {
  return `/course/${courseId}/${pointer.chapter.order}/${pointer.subsection.order}`;
}
