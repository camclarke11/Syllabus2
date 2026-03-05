import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCourse } from "@/lib/course-generator";
import { saveCourse } from "@/lib/course-storage";
import { isTopicDisallowed, isTopicTooVague } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  topic: z.string().min(1),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (isTopicTooVague(body.topic)) {
      return NextResponse.json(
        {
          error: "Please be more specific so the course can be meaningfully structured.",
        },
        { status: 400 },
      );
    }

    if (isTopicDisallowed(body.topic)) {
      return NextResponse.json(
        {
          error: "That topic is not supported on this platform.",
        },
        { status: 400 },
      );
    }

    const course = await generateCourse(body);
    await saveCourse(course);

    return NextResponse.json({ course });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to generate the course.",
      },
      { status: 500 },
    );
  }
}
