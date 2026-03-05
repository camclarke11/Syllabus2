import { NextResponse } from "next/server";

import { readCourse, readLessonContent } from "@/lib/course-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; subsectionId: string }> },
) {
  const { id, subsectionId } = await context.params;
  const content = await readLessonContent(id, subsectionId);

  if (content) {
    return NextResponse.json({ content });
  }

  const course = await readCourse(id);
  const embeddedContent = course?.chapters
    .flatMap((chapter) => chapter.subsections)
    .find((subsection) => subsection.id === subsectionId)?.content;

  if (!embeddedContent) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  return NextResponse.json({ content: embeddedContent });
}
