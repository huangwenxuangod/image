import { getPublicMediaUrl } from "@/lib/holo/client";
import type { StudioAspectRatio, StudioProvider } from "@/lib/holo/models";
import { formatFeedTimestamp, type PersistedFeedAsset } from "@/lib/studio/feed";
import {
  createSignedStorageUrl,
  createSignedStorageUrls,
  type SupabaseStorageLike,
  uploadRemoteImageToStorage,
} from "@/lib/supabase/storage";

type SupabaseLike = {
  from: (table: string) => unknown;
} & SupabaseStorageLike;

type InsertGenerationInput = {
  userId: string;
  prompt: string;
  provider: StudioProvider;
  remoteModel: string;
  aspectRatio: StudioAspectRatio;
  imageCount: number;
  tasks: Array<{
    taskId: string;
  }>;
};

export async function createGenerationRecord(
  supabase: SupabaseLike,
  input: InsertGenerationInput,
) {
  const generationsTable = supabase.from("generations") as {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => Promise<{
        data: Array<{ id: string }> | null;
        error: { message: string } | null;
      }>;
    };
  };

  const generationInsert = await generationsTable
    .insert({
      user_id: input.userId,
      prompt: input.prompt,
      provider: input.provider,
      remote_model: input.remoteModel,
      aspect_ratio: input.aspectRatio,
      image_count: input.imageCount,
      status: "queued",
    })
    .select("id");

  if (generationInsert.error || !generationInsert.data?.[0]) {
    throw new Error(generationInsert.error?.message ?? "Failed to create generation.");
  }

  const generationId = generationInsert.data[0].id;

  const generationImagesTable = supabase.from("generation_images") as {
    insert: (values: Array<Record<string, unknown>>) => Promise<{
      error: { message: string } | null;
    }>;
  };

  const imagesInsert = await generationImagesTable.insert(
    input.tasks.map((task) => ({
      generation_id: generationId,
      user_id: input.userId,
      holo_task_id: task.taskId,
      status: "queued",
    })),
  );

  if ("error" in imagesInsert && imagesInsert.error) {
    throw new Error(imagesInsert.error.message);
  }

  return generationId;
}

export async function syncPersistedTask(
  supabase: SupabaseLike,
  input: {
    taskId: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled";
    fileExt?: string;
    error?: string;
  },
): Promise<{ signedUrl: string | null }> {
  const generationImagesTable = supabase.from("generation_images") as {
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const imageRecord = await generationImagesTable
    .select("generation_id, user_id, storage_path, source_url")
    .eq("holo_task_id", input.taskId)
    .maybeSingle();

  if (imageRecord.error || !imageRecord.data?.generation_id) {
    return { signedUrl: null as string | null };
  }

  const generationId = String(imageRecord.data.generation_id);
  const userId = String(imageRecord.data.user_id);
  const existingStoragePath =
    (imageRecord.data.storage_path as string | null | undefined) ?? null;
  const upstreamUrl =
    input.status === "completed" ? getPublicMediaUrl(input.taskId, input.fileExt) : null;

  let nextStoragePath = existingStoragePath;
  let latestError = input.error ?? null;

  if (input.status === "completed" && upstreamUrl && !existingStoragePath) {
    try {
      nextStoragePath = await uploadRemoteImageToStorage(supabase, {
        userId,
        generationId,
        taskId: input.taskId,
        fileExt: input.fileExt,
        remoteUrl: upstreamUrl,
      });
    } catch (error) {
      latestError = `Storage sync failed: ${
        error instanceof Error ? error.message : "unknown upload error"
      }`;
    }
  }

  const updateImage = await generationImagesTable
    .update({
      status: input.status,
      source_url: upstreamUrl,
      storage_path: nextStoragePath,
      file_ext: input.fileExt ?? null,
      latest_error: latestError,
      updated_at: new Date().toISOString(),
    })
    .eq("holo_task_id", input.taskId);

  if (updateImage.error) {
    throw new Error(updateImage.error.message);
  }

  const siblingRows = await (supabase.from("generation_images") as {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{
        data: Array<{ status: string }> | null;
        error: { message: string } | null;
      }>;
    };
  })
    .select("status")
    .eq("generation_id", generationId);

  if ("error" in siblingRows && siblingRows.error) {
    throw new Error(siblingRows.error.message);
  }

  if (!("data" in siblingRows) || !Array.isArray(siblingRows.data)) {
    return { signedUrl: null };
  }

  const statuses = siblingRows.data.map((row) => String(row.status));
  const nextStatus = statuses.every((status) => status === "completed")
    ? "completed"
    : statuses.some((status) => status === "failed")
      ? "failed"
      : statuses.some((status) => status === "processing")
        ? "processing"
        : statuses.some((status) => status === "queued")
          ? "queued"
          : statuses.some((status) => status === "cancelled")
            ? "cancelled"
            : "queued";

  const updateGeneration = await (supabase.from("generations") as {
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  })
    .update({
      status: nextStatus,
      latest_error: input.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId);

  if (updateGeneration.error) {
    throw new Error(updateGeneration.error.message);
  }

  const signedUrl =
    input.status === "completed" && nextStoragePath
      ? await createSignedStorageUrl(supabase, nextStoragePath)
      : null;

  return { signedUrl };
}

export async function fetchRecentFeed(
  supabase: SupabaseLike,
): Promise<PersistedFeedAsset[]> {
  const result = await (supabase.from("generation_images") as {
    select: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .select(
      "id, holo_task_id, source_url, file_ext, status, latest_error, created_at, collections(name), generations(prompt, provider, remote_model, aspect_ratio)",
    )
    .order("created_at", { ascending: false })
    .limit(24);

  if (result.error || !result.data) {
    return [] satisfies PersistedFeedAsset[];
  }

  const storagePaths = result.data
    .map((row) => (row.storage_path as string | null | undefined) ?? null)
    .filter((path): path is string => Boolean(path));
  const signedUrls = await createSignedStorageUrls(supabase, storagePaths);

  const mappedRows: Array<PersistedFeedAsset | null> = result.data.map((row, index) => {
      const generation = row.generations as
        | {
            prompt?: string;
            provider?: StudioProvider;
            remote_model?: string;
            aspect_ratio?: StudioAspectRatio;
          }
        | undefined;
      const collection = row.collections as { name?: string } | null | undefined;

      if (!generation?.provider || !generation.aspect_ratio || !generation.prompt) {
        return null;
      }

      const asset: PersistedFeedAsset = {
        id: String(row.id),
        kind: "persisted",
        taskId: String(row.holo_task_id),
        title: `${generation.provider} archive ${String(index + 1).padStart(2, "0")}`,
        prompt: generation.prompt,
        model: generation.provider,
        aspectRatio: generation.aspect_ratio,
        createdAt: formatFeedTimestamp(String(row.created_at)),
        status: String(row.status) as PersistedFeedAsset["status"],
        remoteModel: generation.remote_model,
        publicFileUrl:
          signedUrls.get((row.storage_path as string | null | undefined) ?? "") ??
          ((row.source_url as string | null | undefined) ?? null),
        fileExt: (row.file_ext as string | null | undefined) ?? null,
        error: (row.latest_error as string | null | undefined) ?? null,
        collectionName: collection?.name ?? null,
      };

      return asset;
    });

  const assets = mappedRows.filter((row): row is PersistedFeedAsset => row !== null);

  return assets;
}
