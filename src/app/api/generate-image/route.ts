import { NextResponse } from "next/server";

import {
  getGenerationTask,
  getPublicMediaUrl,
  hasHoloEnv,
  submitGenerationTask,
} from "@/lib/holo/client";
import { type StudioAspectRatio, type StudioProvider } from "@/lib/holo/models";
import { createGenerationRecord, syncPersistedTask } from "@/lib/supabase/generations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedProviders = new Set<StudioProvider>(["image2", "nanobanana"]);
const allowedAspectRatios = new Set<StudioAspectRatio>(["1:1", "4:5", "16:9"]);
const allowedCounts = new Set([1, 2, 4]);

export async function POST(request: Request) {
  if (!hasHoloEnv()) {
    return NextResponse.json(
      { error: "Missing HOLO server environment variables." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    prompt?: string;
    provider?: StudioProvider;
    aspectRatio?: StudioAspectRatio;
    count?: number;
  };

  const prompt = body.prompt?.trim();
  const provider = body.provider;
  const aspectRatio = body.aspectRatio;
  const count = body.count ?? 1;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (!provider || !allowedProviders.has(provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  if (!aspectRatio || !allowedAspectRatios.has(aspectRatio)) {
    return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
  }

  if (!allowedCounts.has(count)) {
    return NextResponse.json({ error: "Unsupported image count." }, { status: 400 });
  }

  try {
    const tasks = await Promise.all(
      Array.from({ length: count }, () =>
        submitGenerationTask({ prompt, provider, aspectRatio }),
      ),
    );

    const supabase = await createSupabaseServerClient();
    let generationId: string | null = null;
    let persisted = false;

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        generationId = await createGenerationRecord(supabase, {
          userId: user.id,
          prompt,
          provider,
          remoteModel: tasks[0]?.model ?? provider,
          aspectRatio,
          imageCount: count,
          tasks: tasks.map((task) => ({ taskId: task.task_id })),
        });
        persisted = true;
      }
    }

    return NextResponse.json({ tasks, generationId, persisted }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit generation task.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!hasHoloEnv()) {
    return NextResponse.json(
      { error: "Missing HOLO server environment variables." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

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
        await syncPersistedTask(supabase, {
          taskId: task.task_id,
          status: task.status,
          fileExt: task.result?.file_ext,
          error: task.error,
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
