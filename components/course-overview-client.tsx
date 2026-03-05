"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock3, Layers3, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChapterCard } from "@/components/chapter-card";
import {
  getContinuePointer,
  getCoursePointerHref,
  getProgressSummary,
  isChapterLocked,
} from "@/lib/course-helpers";
import {
  getCourseFromLibrary,
  getLastOpenedSubsection,
  loadCourseProgress,
  saveCourseToLibrary,
} from "@/lib/client-storage";
import type { Course, UserProgress } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";

interface CourseOverviewClientProps {
  courseId: string;
}

export function CourseOverviewClient({ courseId }: CourseOverviewClientProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastOpenedSubsection, setLastOpenedSubsection] = useState<string | null>(null);

  useEffect(() => {
    const localCourse = getCourseFromLibrary(courseId);
    const localProgress = loadCourseProgress(courseId);
    const localLastOpened = getLastOpenedSubsection(courseId);

    if (localCourse) {
      setCourse(localCourse);
    }

    setProgressMap(localProgress);
    setLastOpenedSubsection(localLastOpened);

    async function load() {
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as { course: Course };
          setCourse(payload.course);
          saveCourseToLibrary(payload.course);
          setError(null);
        } else if (!localCourse) {
          setError("That course could not be found.");
        }
      } catch {
        if (!localCourse) {
          setError("Unable to load the course right now.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [courseId]);

  const summary = useMemo(
    () => (course ? getProgressSummary(course, progressMap) : null),
    [course, progressMap],
  );

  const continuePointer = useMemo(
    () =>
      course ? getContinuePointer(course, progressMap, lastOpenedSubsection ?? undefined) : null,
    [course, progressMap, lastOpenedSubsection],
  );

  if (isLoading && !course) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="frosted-panel rounded-[2rem] p-10">
          <div className="inline-flex items-center gap-3 text-[var(--muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading course...
          </div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="frosted-panel rounded-[2rem] p-10 text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl text-white">
            Course unavailable
          </h1>
          <p className="mt-3 text-[var(--muted)]">{error ?? "We could not find that course."}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-black"
          >
            Generate a new course
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="frosted-panel editorial-shadow rounded-[2rem] px-7 py-8 md:px-10 md:py-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              {course.experienceLevel} path
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-heading)] text-4xl leading-tight text-white md:text-6xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {course.description}
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Progress
              </div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {summary?.percent ?? 0}%
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">
                {summary?.completedSubsections ?? 0} of {summary?.totalSubsections ?? 0} sections
                complete
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-[var(--accent)]" />
                {course.chapters.length} chapters
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                {formatMinutes(course.estimatedMinutes)}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="mt-10 space-y-5">
        {course.chapters.map((chapter, index) => (
          <ChapterCard
            key={chapter.id}
            courseId={course.id}
            chapter={chapter}
            progressMap={progressMap}
            isLocked={isChapterLocked(course, chapter, progressMap)}
            defaultOpen={index < 2}
          />
        ))}
      </section>

      {continuePointer ? (
        <div className="fixed inset-x-0 bottom-6 z-30 px-4">
          <div className="mx-auto flex max-w-xl justify-center">
            <Link
              href={getCoursePointerHref(course.id, continuePointer)}
              className="editorial-shadow inline-flex items-center gap-3 rounded-full border border-[var(--accent)]/35 bg-[rgba(9,11,18,0.92)] px-6 py-4 text-sm font-medium text-white backdrop-blur-xl transition hover:translate-y-[-1px]"
            >
              <span className="text-[var(--muted)]">Continue learning</span>
              <span>
                {continuePointer.chapter.order}.{continuePointer.subsection.order}{" "}
                {continuePointer.subsection.title}
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--accent)]" />
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
