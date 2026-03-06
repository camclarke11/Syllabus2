import { LessonClient } from "@/components/lesson-client";

export default async function LessonPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    chapterOrder: string;
    subsectionOrder: string;
  }>;
}) {
  const { courseId, chapterOrder, subsectionOrder } = await params;

  return (
    <LessonClient
      courseId={courseId}
      chapterOrder={Number(chapterOrder)}
      subsectionOrder={Number(subsectionOrder)}
    />
  );
}
