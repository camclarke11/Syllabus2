import { CourseOverviewClient } from "@/components/course-overview-client";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return <CourseOverviewClient courseId={courseId} />;
}
