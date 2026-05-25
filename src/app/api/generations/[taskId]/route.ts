import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getGenerationTask, getPublicMediaUrl, hasHoloEnv } from "@/lib/holo/client";
import { syncPersistedTask } from "@/lib/supabase/generations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/generations/[taskId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasHoloEnv()) {
    return NextResponse.json(
      { error: "Missing HOLO server environment variables." },
      { status: 500 },
    );
  }

  const { taskId } = await context.params;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required." }, { status: 400 });
  }

  try {
    const task = await getGenerationTask(taskId);
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const syncResult = await syncPersistedTask(supabase, {
        userId,
        taskId: task.task_id,
        status: task.status,
        fileExt: task.result?.file_ext,
        error: task.error,
      });

      return NextResponse.json({
        ...task,
        public_file_url:
          syncResult.signedUrl ??
          (task.status === "completed"
            ? getPublicMediaUrl(task.task_id, task.result?.file_ext)
            : null),
      });
    }

    return NextResponse.json({
      ...task,
      public_file_url:
        task.status === "completed"
          ? getPublicMediaUrl(task.task_id, task.result?.file_ext)
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch task status.",
      },
      { status: 500 },
    );
  }
}
