"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Folder,
  FolderOpen,
  Globe,
  Heart,
  ImageIcon,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Group,
  Panel,
  Separator,
} from "react-resizable-panels";

import { generationAssets, type GenerationAsset } from "@/components/create/mock-data";
import type { PersistedFeedAsset } from "@/lib/studio/feed";
import { cn } from "@/lib/utils";

const aspectOptions = ["1:1", "4:5", "16:9"] as const;
const countOptions = [1, 2, 4] as const;
const modelOptions = [
  { id: "image2", label: "image2", note: "GPT-images2" },
  { id: "nanobanana", label: "nanobanana", note: "Gemini image fallback" },
] as const;

type StudioStatus =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type LiveAsset = {
  id: string;
  kind: "live";
  taskId: string;
  title: string;
  prompt: string;
  model: (typeof modelOptions)[number]["id"];
  aspectRatio: (typeof aspectOptions)[number];
  createdAt: string;
  status: StudioStatus;
  remoteModel?: string;
  queuePosition?: number;
  publicFileUrl?: string | null;
  fileExt?: string;
  error?: string;
};

type FeedAsset =
  | (GenerationAsset & {
      kind: "mock";
      status: "completed";
      remoteModel?: string;
      publicFileUrl?: null;
      taskId?: undefined;
      error?: undefined;
      queuePosition?: undefined;
      fileExt?: undefined;
    })
  | PersistedFeedAsset
  | LiveAsset;

type BoardStudioProps = {
  viewerEmail: string;
  persistedFeed: PersistedFeedAsset[];
};

function artStyle(asset: GenerationAsset) {
  const [first, second, third] = asset.palette;

  return {
    background: `
      radial-gradient(circle at 18% 24%, ${first} 0 18%, transparent 19%),
      radial-gradient(circle at 76% 18%, ${second} 0 20%, transparent 21%),
      radial-gradient(circle at 50% 62%, ${third} 0 24%, transparent 25%),
      linear-gradient(145deg, ${first} 0%, ${second} 46%, ${third} 100%)
    `,
  };
}

function getLiveBackground(index: number) {
  const palettes = [
    ["#d7d0bf", "#f3ecdd", "#938468"],
    ["#cec8c0", "#f5efe7", "#8c8172"],
    ["#d9c5b7", "#f6ede5", "#9f7c67"],
    ["#c9d3d2", "#eef2f1", "#6b7e80"],
  ] as const;
  const [first, second, third] = palettes[index % palettes.length];

  return {
    background: `
      radial-gradient(circle at 22% 24%, ${first} 0 20%, transparent 21%),
      radial-gradient(circle at 72% 20%, ${second} 0 24%, transparent 25%),
      radial-gradient(circle at 50% 68%, ${third} 0 18%, transparent 19%),
      linear-gradient(150deg, ${first} 0%, ${second} 52%, ${third} 100%)
    `,
  };
}

function toMockFeedAssets() {
  return generationAssets.map(
    (asset) =>
      ({
        ...asset,
        kind: "mock",
        status: "completed",
      }) satisfies FeedAsset,
  );
}

function formatNow() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function statusLabel(asset: FeedAsset) {
  if (asset.kind === "mock") {
    return "completed";
  }

  switch (asset.status) {
    case "queued":
      return asset.kind === "live" && asset.queuePosition
        ? `queued #${asset.queuePosition}`
        : "queued";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "completed":
      return "completed";
    default:
      return "draft";
  }
}

function getAssetImage(asset: FeedAsset) {
  if (asset.kind !== "mock" && asset.publicFileUrl) {
    return asset.publicFileUrl;
  }

  return null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard failures in unsupported environments.
  }
}

export function BoardStudio({ viewerEmail, persistedFeed }: BoardStudioProps) {
  const router = useRouter();
  const clerk = useClerk();
  const [feedAssets, setFeedAssets] = useState<FeedAsset[]>(
    persistedFeed.length > 0 ? persistedFeed : toMockFeedAssets(),
  );
  const [activeId, setActiveId] = useState(feedAssets[0]?.id ?? generationAssets[0].id);
  const [workspaceMode, setWorkspaceMode] = useState<"task" | "files">("task");
  const [prompt, setPrompt] = useState(
    "A tactile editorial still life with sliced pomelo, chalky ceramic vessels, soft sunlight, quiet composition, and premium lifestyle magazine styling.",
  );
  const [model, setModel] = useState<(typeof modelOptions)[number]["id"]>("image2");
  const [aspectRatio, setAspectRatio] =
    useState<(typeof aspectOptions)[number]>("4:5");
  const [imageCount, setImageCount] = useState<(typeof countOptions)[number]>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signoutError, setSignoutError] = useState<string | null>(null);
  const [isSigningOut, startSignout] = useTransition();

  const activeAsset = useMemo(
    () => feedAssets.find((asset) => asset.id === activeId) ?? feedAssets[0],
    [activeId, feedAssets],
  );

  const pendingTaskIds = useMemo(
    () =>
      feedAssets
        .filter(
          (asset): asset is LiveAsset =>
            asset.kind === "live" &&
            (asset.status === "queued" || asset.status === "processing"),
        )
        .map((asset) => asset.taskId),
    [feedAssets],
  );

  const activeImageUrl = activeAsset ? getAssetImage(activeAsset) : null;

  useEffect(() => {
    if (pendingTaskIds.length === 0) {
      return;
    }

    const poll = async () => {
      const results = await Promise.all(
        pendingTaskIds.map(async (taskId) => {
          try {
            const response = await fetch(
              `/api/generations/${encodeURIComponent(taskId)}`,
              { cache: "no-store" },
            );

            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;

              return {
                taskId,
                status: "failed" as const,
                error: payload?.error ?? "Failed to refresh task.",
              };
            }

            return (await response.json()) as {
              task_id: string;
              status: StudioStatus;
              position?: number;
              model?: string;
              public_file_url?: string | null;
              result?: { file_ext?: string };
              error?: string;
            };
          } catch (error) {
            return {
              taskId,
              status: "failed" as const,
              error: error instanceof Error ? error.message : "Polling failed.",
            };
          }
        }),
      );

      setFeedAssets((current) =>
        current.map((asset) => {
          if (asset.kind !== "live") {
            return asset;
          }

          const next = results.find(
            (result) =>
              ("task_id" in result ? result.task_id : result.taskId) === asset.taskId,
          );

          if (!next) {
            return asset;
          }

          if ("task_id" in next) {
            return {
              ...asset,
              status: next.status,
              queuePosition: next.position,
              remoteModel: next.model,
              publicFileUrl: next.public_file_url ?? asset.publicFileUrl,
              fileExt: next.result?.file_ext ?? asset.fileExt,
              error: next.error,
            };
          }

          return {
            ...asset,
            status: "failed",
            error: next.error,
          };
        }),
      );
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pendingTaskIds]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setSubmitError("Prompt is required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: model,
          aspectRatio,
          count: imageCount,
        }),
      });

      const payload = (await response.json()) as
        | {
            tasks?: Array<{
              task_id: string;
              status: "queued";
              position?: number;
              model: string;
            }>;
            error?: string;
          }
        | undefined;

      if (!response.ok || !payload?.tasks) {
        throw new Error(payload?.error ?? "Failed to submit generation.");
      }

      const nextAssets = payload.tasks.map(
        (task, index) =>
          ({
            id: `live-${task.task_id}`,
            kind: "live",
            taskId: task.task_id,
            title: `${model} task ${String(index + 1).padStart(2, "0")}`,
            prompt,
            model,
            aspectRatio,
            createdAt: formatNow(),
            status: "queued",
            queuePosition: task.position,
            remoteModel: task.model,
            publicFileUrl: null,
          }) satisfies LiveAsset,
      );

      setFeedAssets((current) => [...nextAssets, ...current]);
      setActiveId(nextAssets[0].id);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit generation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    startSignout(async () => {
      try {
        await clerk.signOut({
          redirectUrl: "/sign-in",
        });
      } catch (error) {
        setSignoutError(error instanceof Error ? error.message : "Failed to sign out.");
        return;
      }

      setSignoutError(null);
      router.push("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-3 text-[var(--ink)] md:p-4">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.5),transparent_24%)]" />
      <div className="relative h-[calc(100vh-24px)] overflow-hidden rounded-[34px] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] shadow-[var(--shadow-soft)] backdrop-blur-2xl md:h-[calc(100vh-32px)]">
        <Group orientation="horizontal">
          <Panel defaultSize={18} minSize={15} maxSize={24} className="min-w-[280px]">
            <aside className="flex h-full flex-col border-r border-[var(--line)] bg-[rgba(250,248,244,0.78)] p-3">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="text-[34px] font-semibold leading-none tracking-[-0.08em]">
                    un
                  </div>
                  <div className="flex items-center gap-1 text-[30px] font-semibold tracking-[-0.05em]">
                    Chaos
                    <ChevronDown className="mt-1 h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/84 text-[var(--muted)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.9} />
                </button>
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-[18px] bg-[var(--panel)] p-1.5">
                {[
                  { label: "任务", icon: Check, active: workspaceMode === "task" },
                  { label: "文件", icon: Folder, active: workspaceMode === "files" },
                  { label: "", icon: Globe, active: false },
                ].map(({ label, icon: Icon, active }) => (
                  <button
                    key={`${label}-${Icon.displayName ?? "icon"}`}
                    type="button"
                    onClick={() => {
                      if (label === "文件") {
                        setWorkspaceMode("files");
                      }
                      if (label === "任务") {
                        setWorkspaceMode("task");
                      }
                    }}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-[15px] font-medium transition",
                      active
                        ? "bg-white text-[var(--ink)] shadow-[0_8px_20px_rgba(22,24,28,0.05)]"
                        : "text-[var(--muted)]",
                      !label && "ml-auto w-11 justify-center px-0",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.9} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[13px] font-medium text-[var(--muted)]">
                  {workspaceMode === "task" ? "任务" : "文件"}
                </p>
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <Search className="h-4 w-4" strokeWidth={1.9} />
                  <Plus className="h-4 w-4" strokeWidth={1.9} />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {feedAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setActiveId(asset.id)}
                    className={cn(
                      "w-full rounded-[16px] px-3 py-3 text-left transition",
                      activeId === asset.id
                        ? "bg-[rgba(93,120,174,0.1)]"
                        : "hover:bg-white/68",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[var(--muted)]">
                        {workspaceMode === "task" ? (
                          <Check className="h-4 w-4" strokeWidth={1.9} />
                        ) : (
                          <FolderOpen className="h-4 w-4" strokeWidth={1.9} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium tracking-[-0.02em]">
                          {asset.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--muted)]">
                          {asset.prompt}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
                          <span>{asset.createdAt}</span>
                          <span>{asset.model}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white/76 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{viewerEmail}</p>
                    <p className="text-[12px] text-[var(--muted)]">Free</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[13px] font-medium text-white"
                  >
                    {isSigningOut ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                    ) : (
                      <LogOut className="h-4 w-4" strokeWidth={1.9} />
                    )}
                    Sign out
                  </button>
                </div>
                {signoutError ? (
                  <p className="mt-2 text-[12px] text-rose-700">{signoutError}</p>
                ) : null}
              </div>
            </aside>
          </Panel>

          <Separator className="w-px bg-[var(--line)]" />

          <Panel defaultSize={57} minSize={42}>
            <main className="flex h-full flex-col bg-[rgba(255,255,255,0.62)]">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8 md:px-10">
                <div className="mx-auto flex max-w-[920px] flex-col gap-6">
                  {feedAssets.slice(0, 8).reverse().map((asset, index) => {
                    const imageUrl = getAssetImage(asset);
                    const isActive = activeId === asset.id;

                    return (
                      <div key={`${asset.id}-thread`} className="space-y-4">
                        <div className="flex justify-end">
                          <div className="max-w-[72%] rounded-[22px] rounded-br-[10px] bg-[var(--bubble)] px-5 py-4 text-[15px] leading-[1.78] shadow-[0_10px_24px_rgba(24,26,28,0.03)]">
                            {asset.prompt}
                          </div>
                        </div>

                        <div className="max-w-[92%] space-y-3">
                          <div className="rounded-[26px] border border-[var(--line)] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(24,26,28,0.03)]">
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[13px] font-medium">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                产出
                                <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                                  1
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                            </div>
                          </div>

                          <div className="flex items-center gap-4 px-1 text-[var(--muted)]">
                            {[Copy, WandSparkles, Plus, PanelsTopLeft, ThumbsUp, ThumbsDown].map(
                              (Icon, actionIndex) => (
                                <button
                                  key={`${asset.id}-action-${actionIndex}`}
                                  type="button"
                                  className="inline-flex h-4 w-4 items-center justify-center"
                                  onClick={() => {
                                    if (Icon === Copy) {
                                      void copyText(asset.prompt);
                                    }
                                    if (Icon === WandSparkles) {
                                      setPrompt(asset.prompt);
                                    }
                                  }}
                                >
                                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                                </button>
                              ),
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveId(asset.id)}
                            className={cn(
                              "block w-full rounded-[28px] border bg-white px-5 py-5 text-left transition",
                              isActive
                                ? "border-[var(--line-strong)] shadow-[0_14px_34px_rgba(24,26,28,0.05)]"
                                : "border-[var(--line)] hover:shadow-[0_14px_30px_rgba(24,26,28,0.04)]",
                            )}
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--muted)]">
                                  {asset.model}
                                </p>
                                <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.04em]">
                                  {asset.title}
                                </h2>
                              </div>
                              <div className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[12px] text-[var(--muted)]">
                                {statusLabel(asset)}
                              </div>
                            </div>

                            <div
                              className={cn(
                                "relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--panel)]",
                                asset.aspectRatio === "16:9"
                                  ? "aspect-[16/9]"
                                  : "aspect-[4/3]",
                              )}
                            >
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt={asset.prompt}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className="absolute inset-0"
                                  style={
                                    asset.kind === "mock"
                                      ? artStyle(asset)
                                      : getLiveBackground(index)
                                  }
                                />
                              )}

                              {asset.kind === "live" && asset.status !== "completed" ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.2)] backdrop-blur-md">
                                  <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/82 px-4 py-2 text-[13px] font-medium">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    {statusLabel(asset)}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--muted)]">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1">
                                  {asset.remoteModel ?? asset.model}
                                </span>
                                <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1">
                                  {asset.aspectRatio}
                                </span>
                              </div>
                              <span>{asset.createdAt}</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[var(--line)] px-6 pb-5 pt-4 md:px-10">
                <div className="mx-auto max-w-[920px] rounded-[30px] border border-[var(--line)] bg-white/92 p-4 shadow-[var(--shadow-float)]">
                  <textarea
                    className="min-h-[124px] w-full resize-none rounded-[22px] border border-transparent bg-[var(--panel)] px-5 py-4 text-[15px] leading-[1.8] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)]"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="消息"
                  />

                  <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--line)] bg-white"
                      >
                        <Plus className="h-4 w-4" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--line)] bg-white"
                      >
                        <ImageIcon className="h-4 w-4" strokeWidth={1.9} />
                      </button>
                    </div>

                    <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                      <div className="inline-flex rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-1">
                        {modelOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setModel(option.id)}
                            className={cn(
                              "rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition",
                              model === option.id
                                ? "bg-white text-[var(--ink)] shadow-[0_6px_16px_rgba(26,28,31,0.08)]"
                                : "text-[var(--muted)]",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="inline-flex rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-1">
                        {aspectOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAspectRatio(option)}
                            className={cn(
                              "rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition",
                              aspectRatio === option
                                ? "bg-white text-[var(--ink)] shadow-[0_6px_16px_rgba(26,28,31,0.08)]"
                                : "text-[var(--muted)]",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      <div className="inline-flex rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-1">
                        {countOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setImageCount(option)}
                            className={cn(
                              "rounded-[12px] px-4 py-2.5 text-[14px] font-medium transition",
                              imageCount === option
                                ? "bg-white text-[var(--ink)] shadow-[0_6px_16px_rgba(26,28,31,0.08)]"
                                : "text-[var(--muted)]",
                            )}
                          >
                            {option} img
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white px-4 text-[14px] font-medium"
                      >
                        <Globe className="h-4 w-4" strokeWidth={1.9} />
                        自动
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        disabled={isSubmitting}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(30,32,36,0.12)] text-[var(--muted)] transition hover:bg-[var(--ink)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                        ) : (
                          <ChevronUpIcon />
                        )}
                      </button>
                    </div>
                  </div>

                  {submitError ? (
                    <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                      {submitError}
                    </div>
                  ) : null}
                </div>
              </div>
            </main>
          </Panel>

          <Separator className="w-px bg-[var(--line)]" />

          <Panel defaultSize={25} minSize={20} maxSize={34} className="min-w-[360px]">
            <aside className="flex h-full flex-col bg-white">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div className="flex items-center gap-3 text-[14px] font-medium">
                  <Sparkles className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.9} />
                  摘录
                  <ChevronDown className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                </div>
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                  <Copy className="h-4 w-4" strokeWidth={1.9} />
                  <Download className="h-4 w-4" strokeWidth={1.9} />
                  <MoreHorizontal className="h-4 w-4" strokeWidth={1.9} />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {activeAsset ? (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--panel)]",
                        activeAsset.aspectRatio === "16:9"
                          ? "aspect-[16/10]"
                          : "aspect-[4/5]",
                      )}
                    >
                      {activeImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeImageUrl}
                          alt={activeAsset.prompt}
                          className="h-full w-full object-cover"
                        />
                      ) : activeAsset.kind === "mock" ? (
                        <div className="absolute inset-0" style={artStyle(activeAsset)} />
                      ) : (
                        <div className="absolute inset-0" style={getLiveBackground(0)} />
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[12px] uppercase tracking-[0.16em] text-[var(--muted)]">
                          Prompt
                        </h3>
                        <button
                          type="button"
                          onClick={() => void copyText(activeAsset.prompt)}
                          className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white px-3 text-[12px] font-medium"
                        >
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
                          Copy
                        </button>
                      </div>
                      <p className="text-[14px] leading-[1.8]">{activeAsset.prompt}</p>
                    </div>

                    <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <h3 className="mb-3 text-[12px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Details
                      </h3>
                      <dl className="space-y-3 text-[13px]">
                        {[
                          ["Provider", activeAsset.model],
                          ["Remote model", activeAsset.remoteModel ?? "pending"],
                          ["Aspect", activeAsset.aspectRatio],
                          ["Status", statusLabel(activeAsset)],
                          ["Created", activeAsset.createdAt],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                          >
                            <dt className="text-[var(--muted)]">{label}</dt>
                            <dd className="max-w-[58%] text-right font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <h3 className="mb-3 text-[12px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPrompt(activeAsset.prompt)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] text-[13px] font-medium"
                        >
                          <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                          Reuse
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] text-[13px] font-medium"
                        >
                          <Heart className="h-4 w-4" strokeWidth={1.9} />
                          Favorite
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] text-[13px] font-medium"
                        >
                          <ImageIcon className="h-4 w-4" strokeWidth={1.9} />
                          Add note
                        </button>
                        {activeImageUrl ? (
                          <a
                            href={activeImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[var(--ink)] text-[13px] font-medium text-white"
                          >
                            <Download className="h-4 w-4" strokeWidth={1.9} />
                            Export
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[var(--ink)] text-[13px] font-medium text-white"
                          >
                            <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                            Waiting
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <Sparkles className="h-12 w-12 text-[var(--muted)]" strokeWidth={1.6} />
                    <h2 className="mt-5 text-[32px] font-semibold tracking-[-0.04em]">
                      摘录对你重要的内容
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.8] text-[var(--muted)]">
                      选择一张生成结果来查看预览、参数、操作和后续工作流。
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M5.5 12.5 10 8l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
