import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { hasHoloEnv, submitGenerationTask } from "@/lib/holo/client";
import { type StudioAspectRatio, type StudioProvider } from "@/lib/holo/models";
import { createGenerationRecord } from "@/lib/supabase/generations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedProviders = new Set<StudioProvider>(["image2", "nanobanana"]);
const allowedAspectRatios = new Set<StudioAspectRatio>(["1:1", "4:5", "16:9"]);
const allowedCounts = new Set([1, 2, 4]);

export async function POST(request: Request) {
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

    const supabase = createSupabaseAdminClient();
    let generationId: string | null = null;
    let persisted = false;

    if (supabase) {
      generationId = await createGenerationRecord(supabase, {
        userId,
        prompt,
        provider,
        remoteModel: tasks[0]?.model ?? provider,
        aspectRatio,
        imageCount: count,
        tasks: tasks.map((task) => ({ taskId: task.task_id })),
      });
      persisted = true;
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
