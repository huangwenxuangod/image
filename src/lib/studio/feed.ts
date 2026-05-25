import type { StudioAspectRatio, StudioProvider } from "@/lib/holo/models";

export type PersistedFeedAsset = {
  id: string;
  kind: "persisted";
  taskId: string;
  title: string;
  prompt: string;
  model: StudioProvider;
  aspectRatio: StudioAspectRatio;
  createdAt: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  remoteModel?: string;
  publicFileUrl?: string | null;
  fileExt?: string | null;
  error?: string | null;
  collectionName?: string | null;
};

export function formatFeedTimestamp(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function makeAssetTitle(provider: StudioProvider, index = 0) {
  return `${provider} study ${String(index + 1).padStart(2, "0")}`;
}
