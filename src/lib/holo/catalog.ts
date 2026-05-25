import { cache } from "react";

const baseUrl = process.env.HOLO_API_BASE_URL ?? "https://api.dealonhorizon.us";
const apiKey = process.env.HOLO_API_KEY;

type HoloModel = {
  id: string;
  object: string;
  owned_by: string;
  description?: string;
};

type HoloHealth = {
  service?: string;
  status?: string;
  capacity?: string;
};

function getHeaders() {
  if (!apiKey) {
    throw new Error("Missing HOLO_API_KEY");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

export const fetchHoloModels = cache(async (): Promise<HoloModel[]> => {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HOLO models: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: HoloModel[] };
  return payload.data ?? [];
});

export async function fetchHoloHealth(): Promise<HoloHealth> {
  const response = await fetch(`${baseUrl}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HOLO health: ${response.status}`);
  }

  return (await response.json()) as HoloHealth;
}

export async function assertHoloModelExists(modelId: string) {
  const models = await fetchHoloModels();
  const exists = models.some((model) => model.id === modelId);

  if (!exists) {
    throw new Error(
      `Resolved HOLO model "${modelId}" is not present in /v1/models. Check the provider mapping.`,
    );
  }
}
