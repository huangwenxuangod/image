const GENERATED_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_GENERATED_BUCKET ?? "generated-images";

export type SupabaseStorageLike = {
  storage: {
    from: (bucket: string) => unknown;
  };
};

function getContentType(fileExt?: string | null) {
  switch ((fileExt ?? "").toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

export function getGeneratedImagesBucket() {
  return GENERATED_IMAGES_BUCKET;
}

export async function uploadRemoteImageToStorage(
  supabase: SupabaseStorageLike,
  input: {
    userId: string;
    generationId: string;
    taskId: string;
    fileExt?: string | null;
    remoteUrl: string;
  },
) {
  const bucket = supabase.storage.from(GENERATED_IMAGES_BUCKET) as {
    upload: (
      path: string,
      body: ArrayBuffer,
      options: { contentType: string; upsert: boolean },
    ) => Promise<{ error: { message: string } | null }>;
  };

  const response = await fetch(input.remoteUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to download upstream image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const ext = (input.fileExt ?? "png").toLowerCase();
  const path = `${input.userId}/${input.generationId}/${input.taskId}.${ext}`;

  const uploadResult = await bucket.upload(path, buffer, {
    contentType: getContentType(ext),
    upsert: true,
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  return path;
}

export async function createSignedStorageUrl(
  supabase: SupabaseStorageLike,
  path: string,
  expiresIn = 60 * 60,
) {
  const bucket = supabase.storage.from(GENERATED_IMAGES_BUCKET) as {
    createSignedUrl: (
      path: string,
      expiresIn: number,
    ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
  };

  const result = await bucket.createSignedUrl(path, expiresIn);

  if (result.error || !result.data?.signedUrl) {
    return null;
  }

  return result.data.signedUrl;
}

export async function createSignedStorageUrls(
  supabase: SupabaseStorageLike,
  paths: string[],
  expiresIn = 60 * 60,
) {
  if (paths.length === 0) {
    return new Map<string, string>();
  }

  const bucket = supabase.storage.from(GENERATED_IMAGES_BUCKET) as {
    createSignedUrls: (
      paths: string[],
      expiresIn: number,
    ) => Promise<{
      data: Array<{ path: string | null; signedUrl: string | null; error?: string | null }> | null;
      error: { message: string } | null;
    }>;
  };

  const result = await bucket.createSignedUrls(paths, expiresIn);

  if (result.error || !result.data) {
    return new Map<string, string>();
  }

  const urlMap = new Map<string, string>();

  result.data.forEach((item) => {
    if (item.path && item.signedUrl) {
      urlMap.set(item.path, item.signedUrl);
    }
  });

  return urlMap;
}
