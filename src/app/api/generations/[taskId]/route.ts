import { NextResponse } from "next/server";

import { getGenerationTask, getPublicMediaUrl, hasHoloEnv } from "@/lib/holo/client";
import { syncPersistedTask } from "@/lib/supabase/generations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/generations/[taskId]">,
) {
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
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const syncResult = await syncPersistedTask(supabase, {
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
