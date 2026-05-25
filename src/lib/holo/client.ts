import { resolveHoloModel, type StudioAspectRatio, type StudioProvider } from "@/lib/holo/models";

const baseUrl = process.env.HOLO_API_BASE_URL ?? "https://api.dealonhorizon.us";
const apiKey = process.env.HOLO_API_KEY;

export type SubmitGenerationInput = {
  prompt: string;
  provider: StudioProvider;
  aspectRatio: StudioAspectRatio;
};

export type HoloTaskSubmitResponse = {
  task_id: string;
  status: "queued";
  position?: number;
  cost?: number;
  model: string;
  created_at?: string;
};

export type HoloTaskStatusResponse = {
  task_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  position?: number;
  model?: string;
  cost?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  task_type?: string;
  error?: string;
  refunded?: boolean;
  result?: {
    file_url?: string;
    file_ext?: string;
    file_size?: number;
    duration_ms?: number;
    type?: string;
  };
};

function getHeaders() {
  if (!apiKey) {
    throw new Error("Missing HOLO_API_KEY");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export function hasHoloEnv() {
  return Boolean(apiKey);
}

export async function submitGenerationTask(input: SubmitGenerationInput) {
  const response = await fetch(`${baseUrl}/v1/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: resolveHoloModel(input.provider, input.aspectRatio),
      messages: [
        {
          role: "user",
          content: input.prompt,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HOLO submit failed with ${response.status}`);
  }

  return (await response.json()) as HoloTaskSubmitResponse;
}

export async function getGenerationTask(taskId: string) {
  const response = await fetch(`${baseUrl}/v1/tasks/${taskId}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HOLO status failed with ${response.status}`);
  }

  return (await response.json()) as HoloTaskStatusResponse;
}

export function getPublicMediaUrl(taskId: string, fileExt?: string) {
  if (!fileExt) {
    return null;
  }

  return `https://media.dealonhorizon.us/${taskId}.${fileExt}`;
}
