"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContentRenderer } from "@/components/content-renderer";
import { getAdjacentPointers, getSubsectionByOrders } from "@/lib/course-helpers";
import {
  getCourseFromLibrary,
  loadCourseProgress,
  saveCourseToLibrary,
  setLastOpenedSubsection,
  upsertCourseProgress,
} from "@/lib/client-storage";
import type { Course, LessonContent, UserProgress } from "@/lib/types";
import { clamp, formatMinutes } from "@/lib/utils";

interface LessonClientProps {
  courseId: string;
  chapterOrder: number;
  subsectionOrder: number;
}

function injectContentIntoCourse(
  course: Course,
  chapterOrder: number,
  subsectionOrder: number,
  content: LessonContent,
) {
  return {
    ...course,
    updatedAt: new Date().toISOString(),
    chapters: course.chapters.map((chapter) =>
      chapter.order === chapterOrder
        ? {
            ...chapter,
            subsections: chapter.subsections.map((subsection) =>
              subsection.order === subsectionOrder ? { ...subsection, content } : subsection,
            ),
          }
        : chapter,
    ),
  } satisfies Course;
}

export function LessonClient({
  courseId,
  chapterOrder,
  subsectionOrder,
}: LessonClientProps) {
  const router = useRouter();
  const hasRestoredPosition = useRef(false);
  const progressRef = useRef<Record<string, UserProgress>>({});
  const [course, setCourse] = useState<Course | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [isCourseLoading, setIsCourseLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const localCourse = getCourseFromLibrary(courseId);

    if (localCourse) {
      setCourse(localCourse);
    }

    setProgressMap(loadCourseProgress(courseId));

    async function load() {
      try {
        const response = await fetch(`/api/courses/${courseId}`, { cache: "no-store" });

        if (!response.ok) {
          if (!localCourse) {
            throw new Error("Course not found.");
          }
        } else {
          const payload = (await response.json()) as { course: Course };
          setCourse(payload.course);
          saveCourseToLibrary(payload.course);
        }
      } catch (caughtError) {
        if (!localCourse) {
          setError(
            caughtError instanceof Error ? caughtError.message : "Unable to load this lesson.",
          );
        }
      } finally {
        setIsCourseLoading(false);
      }
    }

    void load();
  }, [courseId]);

  const located = useMemo(
    () => (course ? getSubsectionByOrders(course, chapterOrder, subsectionOrder) : null),
    [course, chapterOrder, subsectionOrder],
  );

  const adjacent = useMemo(
    () => (course ? getAdjacentPointers(course, chapterOrder, subsectionOrder) : null),
    [course, chapterOrder, subsectionOrder],
  );

  const progressEntry = located ? progressMap[located.subsection.id] : null;

  useEffect(() => {
    progressRef.current = progressMap;
  }, [progressMap]);

  useEffect(() => {
    hasRestoredPosition.current = false;
  }, [courseId, chapterOrder, subsectionOrder]);

  useEffect(() => {
    if (!course || !located) {
      return;
    }

    const activeCourse = course;
    const activeLocated = located;

    setLastOpenedSubsection(activeCourse.id, activeLocated.subsection.id);

    if (activeLocated.subsection.content) {
      return;
    }

    let cancelled = false;

    async function loadOrGenerate() {
      setIsContentLoading(true);
      setError(null);

      try {
        const existing = await fetch(
          `/api/courses/${activeCourse.id}/content/${activeLocated.subsection.id}`,
          {
            cache: "no-store",
          },
        );

        let content: LessonContent | null = null;

        if (existing.ok) {
          const payload = (await existing.json()) as { content: LessonContent };
          content = payload.content;
        } else {
          const generated = await fetch(`/api/courses/${activeCourse.id}/content`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              course: activeCourse,
              chapterOrder,
              subsectionOrder,
            }),
          });

          const payload = (await generated.json()) as {
            content?: LessonContent;
            course?: Course;
            error?: string;
          };

          if (!generated.ok || !payload.content) {
            throw new Error(payload.error ?? "Lesson generation failed.");
          }

          content = payload.content;
        }

        if (cancelled || !content) {
          return;
        }

        const updatedCourse = injectContentIntoCourse(
          activeCourse,
          chapterOrder,
          subsectionOrder,
          content,
        );

        setCourse(updatedCourse);
        saveCourseToLibrary(updatedCourse);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to generate the lesson right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      }
    }

    void loadOrGenerate();

    return () => {
      cancelled = true;
    };
  }, [course, located, courseId, chapterOrder, subsectionOrder]);

  useEffect(() => {
    if (!located?.subsection.content || hasRestoredPosition.current) {
      return;
    }

    const savedPosition = progressMap[located.subsection.id]?.scrollPosition;

    if (!savedPosition || savedPosition <= 0) {
      hasRestoredPosition.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * savedPosition);
      hasRestoredPosition.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [located, progressMap]);

  useEffect(() => {
    if (!located?.subsection.content) {
      return;
    }

    const activeLocated = located;

    function handleScroll() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? clamp(window.scrollY / maxScroll) : 1;
      setScrollProgress(ratio);

      const currentEntry = progressRef.current[activeLocated.subsection.id];

      const nextEntry: UserProgress = {
        courseId,
        subsectionId: activeLocated.subsection.id,
        completed: ratio >= 0.96,
        completedAt:
          ratio >= 0.96
            ? currentEntry?.completedAt ?? new Date().toISOString()
            : currentEntry?.completedAt,
        scrollPosition: ratio,
      };

      upsertCourseProgress(courseId, nextEntry);
      setProgressMap((current) => ({
        ...current,
        [activeLocated.subsection.id]: nextEntry,
      }));
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [courseId, located]);

  useEffect(() => {
    if (!course || !located || !adjacent) {
      return;
    }

    const activeCourse = course;
    const activeAdjacent = adjacent;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      ) {
        return;
      }

      if (
        (event.key === "ArrowRight" || event.key.toLowerCase() === "j") &&
        activeAdjacent.next
      ) {
        event.preventDefault();
        router.push(
          `/course/${activeCourse.id}/${activeAdjacent.next.chapter.order}/${activeAdjacent.next.subsection.order}`,
        );
      }

      if (
        (event.key === "ArrowLeft" || event.key.toLowerCase() === "k") &&
        activeAdjacent.previous
      ) {
        event.preventDefault();
        router.push(
          `/course/${activeCourse.id}/${activeAdjacent.previous.chapter.order}/${activeAdjacent.previous.subsection.order}`,
        );
      }

      if (event.key === "Escape") {
        event.preventDefault();
        router.push(`/course/${activeCourse.id}`);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adjacent, course, located, router]);

  function markComplete() {
    if (!located) {
      return;
    }

    const nextEntry: UserProgress = {
      courseId,
      subsectionId: located.subsection.id,
      completed: true,
      completedAt: progressMap[located.subsection.id]?.completedAt ?? new Date().toISOString(),
      scrollPosition: 1,
    };

    upsertCourseProgress(courseId, nextEntry);
    setProgressMap((current) => ({
      ...current,
      [located.subsection.id]: nextEntry,
    }));
    setScrollProgress(1);
  }

  if (isCourseLoading && !course) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="frosted-panel rounded-[2rem] p-8 text-[var(--muted)]">
          <LoaderCircle className="inline h-5 w-5 animate-spin" /> Loading lesson...
        </div>
      </main>
    );
  }

  if (!course || !located) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="frosted-panel rounded-[2rem] p-10 text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl text-white">
            Lesson unavailable
          </h1>
          <p className="mt-3 text-[var(--muted)]">{error ?? "We could not load this lesson."}</p>
          <Link
            href={course ? `/course/${course.id}` : "/"}
            className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-black"
          >
            Back to course
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative">
      <div className="fixed inset-x-0 top-[72px] z-30 h-[3px] bg-white/5">
        <motion.div
          className="h-full origin-left bg-[var(--accent)]"
          animate={{ scaleX: scrollProgress }}
          transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.2 }}
        />
      </div>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 pb-24 pt-10">
        <aside className="sticky top-28 hidden h-fit w-72 shrink-0 xl:block">
          <div className="frosted-panel rounded-[1.75rem] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              Keyboard shortcuts
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <div>J / Right arrow: next section</div>
              <div>K / Left arrow: previous section</div>
              <div>Escape: course overview</div>
            </div>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[720px]">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <Link
              href={`/course/${course.id}`}
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to overview
            </Link>

            <div className="mt-6 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              Chapter {chapterOrder} · Section {chapterOrder}.{subsectionOrder}
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl leading-tight text-white md:text-6xl">
              {located.subsection.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {located.chapter.title} · {formatMinutes(located.subsection.estimatedMinutes)}
            </p>
          </motion.header>

          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {isContentLoading || !located.subsection.content ? (
            <div className="space-y-5">
              <div className="frosted-panel rounded-[1.75rem] p-5 text-sm text-[var(--muted)]">
                <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
                Writing this lesson...
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-[1.75rem] border border-white/6 bg-white/5"
                />
              ))}
            </div>
          ) : (
            <ContentRenderer content={located.subsection.content} />
          )}

          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-black/15 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--muted)]">
                  {progressEntry?.completed
                    ? "Marked complete"
                    : `${Math.round(scrollProgress * 100)}% through this lesson`}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
                  Scroll to the end or mark it complete manually
                </div>
              </div>
              <button
                type="button"
                onClick={markComplete}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-4 py-2 text-sm text-white transition hover:border-[var(--accent)]/50"
              >
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                Mark as complete
              </button>
            </div>
          </div>

          <nav className="mt-8 grid gap-3 sm:grid-cols-3">
            {adjacent?.previous ? (
              <Link
                href={`/course/${course.id}/${adjacent.previous.chapter.order}/${adjacent.previous.subsection.order}`}
                className="frosted-panel inline-flex items-center justify-center gap-2 rounded-[1.4rem] px-4 py-4 text-sm text-white transition hover:border-white/18"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/8 px-4 py-4 text-center text-sm text-[var(--muted)]">
                Start of course
              </div>
            )}

            <Link
              href={`/course/${course.id}`}
              className="frosted-panel inline-flex items-center justify-center rounded-[1.4rem] px-4 py-4 text-sm text-white transition hover:border-white/18"
            >
              Overview
            </Link>

            {adjacent?.next ? (
              <Link
                href={`/course/${course.id}/${adjacent.next.chapter.order}/${adjacent.next.subsection.order}`}
                className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-[var(--accent)] px-4 py-4 text-sm font-medium text-black transition hover:brightness-105"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/8 px-4 py-4 text-center text-sm text-[var(--muted)]">
                Final section
              </div>
            )}
          </nav>
        </div>
      </div>
    </main>
  );
}
