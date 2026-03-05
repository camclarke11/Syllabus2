import { NextResponse } from "next/server";
import { z } from "zod";

import { generateLessonContent } from "@/lib/course-generator";
import { getSubsectionByOrders } from "@/lib/course-helpers";
import {
  readCourse,
  saveCourse,
  saveLessonContent,
} from "@/lib/course-storage";
import type { Course } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  course: z.any().optional(),
  chapterOrder: z.number().int().positive(),
  subsectionOrder: z.number().int().positive(),
});

function mergeContentIntoCourse(
  course: Course,
  chapterOrder: number,
  subsectionOrder: number,
  content: Awaited<ReturnType<typeof generateLessonContent>>,
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = requestSchema.parse(await request.json());
    const storedCourse = await readCourse(id);
    const course = (storedCourse ?? body.course) as Course | null;

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const located = getSubsectionByOrders(course, body.chapterOrder, body.subsectionOrder);

    if (!located) {
      return NextResponse.json({ error: "Subsection not found." }, { status: 404 });
    }

    if (located.subsection.content) {
      return NextResponse.json({ content: located.subsection.content, course });
    }

    const content = await generateLessonContent({
      course,
      chapterOrder: body.chapterOrder,
      subsectionOrder: body.subsectionOrder,
    });

    const updatedCourse = mergeContentIntoCourse(
      course,
      body.chapterOrder,
      body.subsectionOrder,
      content,
    );

    await saveLessonContent(updatedCourse.id, located.subsection.id, content);
    await saveCourse(updatedCourse);

    return NextResponse.json({ content, course: updatedCourse });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to generate the lesson.",
      },
      { status: 500 },
    );
  }
}
