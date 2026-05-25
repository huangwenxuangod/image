"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Globe,
  FolderKanban,
  Heart,
  ImageIcon,
  LoaderCircle,
  LogIn,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Stars,
  SunMedium,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
} from "lucide-react";

import { AuthControls } from "@/components/auth/auth-controls";
import { generationAssets, type GenerationAsset } from "@/components/create/mock-data";
import type { PersistedFeedAsset } from "@/lib/studio/feed";
import { hasSupabaseEnv } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Create", icon: Sparkles, active: true },
  { label: "Library", icon: FolderKanban, active: false },
  { label: "Collections", icon: Heart, active: false },
  { label: "Settings", icon: Settings2, active: false },
] as const;

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

type CreateStudioProps = {
  viewerEmail: string | null;
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
    return "archived";
  }

  switch (asset.status) {
    case "queued":
      return asset.kind === "live" && asset.queuePosition
        ? `queued #${asset.queuePosition}`
        : "queued";
    case "processing":
      return "rendering";
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

export function CreateStudio({ viewerEmail, persistedFeed }: CreateStudioProps) {
  const [feedAssets, setFeedAssets] = useState<FeedAsset[]>(
    persistedFeed.length > 0 ? persistedFeed : toMockFeedAssets(),
  );
  const [activeId, setActiveId] = useState(feedAssets[0]?.id ?? generationAssets[0].id);
  const [prompt, setPrompt] = useState(
    "A quiet editorial still life with porcelain vessels, citrus slices, oat-toned paper textures, and soft daylight, composed like a luxury magazine spread.",
  );
  const [model, setModel] = useState<(typeof modelOptions)[number]["id"]>("image2");
  const [aspectRatio, setAspectRatio] =
    useState<(typeof aspectOptions)[number]>("4:5");
  const [imageCount, setImageCount] = useState<(typeof countOptions)[number]>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

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
  const collectionCount = useMemo(() => {
    const set = new Set<string>();
    for (const asset of feedAssets) {
      if (asset.kind === "mock") {
        set.add(asset.project);
      } else if (asset.kind === "persisted" && asset.collectionName) {
        set.add(asset.collectionName);
      }
    }

    return set.size;
  }, [feedAssets]);

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
            title: `${model} study ${String(index + 1).padStart(2, "0")}`,
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
      setInspectorOpen(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit generation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.55),transparent_24%)]" />
      <div className="relative flex min-h-screen gap-4 p-3 md:p-4">
        <aside className="hidden w-[320px] shrink-0 rounded-[30px] border border-[var(--line)] bg-[var(--panel-strong)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-2xl xl:flex xl:flex-col">
          <div className="mb-3 flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[15px] font-semibold text-[var(--ink)] shadow-[0_6px_18px_rgba(24,26,28,0.04)]">
                un
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Workspace
                </p>
                <p className="flex items-center gap-1 text-[26px] font-semibold tracking-[-0.045em]">
                  Chaos
                  <ChevronDown className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/80 text-[var(--muted)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" strokeWidth={1.9} />
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-[18px] bg-[var(--panel)] p-1.5">
            {[
              { label: "Tasks", active: true },
              { label: "Files", active: false },
              { label: "Board", active: false },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "rounded-[14px] px-4 py-2 text-[14px] font-medium transition",
                  item.active
                    ? "bg-white text-[var(--ink)] shadow-[0_6px_18px_rgba(24,26,28,0.06)]"
                    : "text-[var(--muted)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2 px-1">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "flex h-11 flex-1 items-center justify-center rounded-[14px] border transition",
                  active
                    ? "border-[var(--line-strong)] bg-white text-[var(--ink)] shadow-[0_6px_18px_rgba(24,26,28,0.05)]"
                    : "border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-white/72",
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between px-2 text-[var(--muted)]">
            <p className="text-[13px] font-medium">Tasks</p>
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4" strokeWidth={1.9} />
              <Plus className="h-4 w-4" strokeWidth={1.9} />
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between px-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Sessions
              </p>
              <p className="mt-1 text-[15px] font-medium">
                {feedAssets.length} records
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/88 px-3 text-[13px] font-medium"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.9} />
              New
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {feedAssets.map((asset) => {
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setActiveId(asset.id);
                    setInspectorOpen(true);
                  }}
                  className={cn(
                    "w-full rounded-[16px] border px-3 py-3 text-left transition",
                    activeId === asset.id
                      ? "border-transparent bg-[rgba(80,108,165,0.08)]"
                      : "border-transparent bg-transparent hover:bg-white/72",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--muted)]">
                      <Check className="h-4 w-4" strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[15px] font-medium tracking-[-0.02em]">
                          {asset.title}
                        </p>
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7aa3e8]" />
                      </div>
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
              );
            })}
          </div>

          <div className="mt-3 rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--ink)] text-[13px] font-semibold text-white">
                LM
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">
                  {viewerEmail ?? "Sign in to sync"}
                </p>
                <p className="text-[12px] text-[var(--muted)]">
                  {hasSupabaseEnv ? "Supabase sync ready" : "Supabase env missing"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 gap-4">
          <main className="flex min-w-0 flex-1 flex-col rounded-[32px] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
            <header className="flex flex-col gap-4 border-b border-[var(--line)] px-5 pb-4 pt-5 md:px-7 md:pt-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    <span className="rounded-full border border-[var(--line)] bg-white/78 px-3 py-1.5">
                      Create
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5">
                      Live task flow
                    </span>
                  </div>
                  <h1 className="mt-3 text-[31px] font-semibold tracking-[-0.055em] md:text-[36px]">
                    Prompt-first image studio
                  </h1>
                  <p className="mt-2 max-w-[72ch] text-[15px] leading-[1.8] text-[var(--muted)]">
                    Built like a calm working session instead of a tool sheet:
                    prompt, queue, inspect, reuse, and archive every result in
                    one continuous workspace.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AuthControls viewerEmail={viewerEmail} />
                  <button
                    type="button"
                    onClick={() => setInspectorOpen((current) => !current)}
                    className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/82 px-4 text-[14px] font-medium"
                  >
                    {inspectorOpen ? (
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    )}
                    {inspectorOpen ? "Hide panel" : "Show panel"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
                <span className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/78 px-4">
                  <Bookmark className="h-4 w-4" strokeWidth={1.9} />
                  {feedAssets.length} records
                </span>
                <span className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/78 px-4">
                  <Stars className="h-4 w-4" strokeWidth={1.9} />
                  {pendingTaskIds.length} active tasks
                </span>
                <span className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/78 px-4">
                  <Heart className="h-4 w-4" strokeWidth={1.9} />
                  {collectionCount} collections
                </span>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-5 md:px-7">
                <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
                  <section className="rounded-[28px] border border-[var(--line)] bg-white/88 p-5 shadow-[0_16px_40px_rgba(24,26,28,0.04)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--ink)] text-[13px] font-semibold text-white">
                          un
                        </div>
                        <div>
                          <p className="text-[15px] font-medium">Creative session</p>
                          <p className="text-[12px] text-[var(--muted)]">
                            Left rail for sessions, center for generation flow,
                            right pane for preview and notes.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] font-medium text-[var(--muted)]"
                      >
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.9} />
                        Session
                      </button>
                    </div>
                  </section>

                  {activeAsset ? (
                    <>
                      <div className="flex justify-end">
                        <div className="max-w-[74%] rounded-[24px] rounded-br-[10px] bg-[var(--bubble)] px-5 py-4 text-[15px] leading-[1.75] shadow-[0_10px_24px_rgba(24,26,28,0.03)]">
                          {activeAsset.prompt}
                        </div>
                      </div>

                      <div className="ml-auto flex max-w-[74%] items-center gap-3 px-2 text-[var(--muted)]">
                        <Copy className="h-4 w-4" strokeWidth={1.9} />
                        <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                        <Plus className="h-4 w-4" strokeWidth={1.9} />
                        <PanelsTopLeft className="h-4 w-4" strokeWidth={1.9} />
                        <ThumbsUp className="h-4 w-4" strokeWidth={1.9} />
                        <ThumbsDown className="h-4 w-4" strokeWidth={1.9} />
                      </div>

                      <section className="rounded-[30px] border border-[var(--line)] bg-white/90 p-4 shadow-[0_16px_40px_rgba(24,26,28,0.04)] md:p-5">
                        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                              <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1">
                                Output
                              </span>
                              <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1">
                                {statusLabel(activeAsset)}
                              </span>
                            </div>
                            <h2 className="mt-3 text-[25px] font-semibold tracking-[-0.045em]">
                              {activeAsset.title}
                            </h2>
                            <p className="mt-2 max-w-[58ch] text-[14px] leading-[1.75] text-[var(--muted)]">
                              The selected result stays in focus here while the
                              rest of the archive remains reachable from the
                              sidebar and the recent strip below.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyText(activeAsset.prompt)}
                              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--panel)] px-4 text-[13px] font-medium"
                            >
                              <Copy className="h-4 w-4" strokeWidth={1.9} />
                              Copy prompt
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrompt(activeAsset.prompt)}
                              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--panel)] px-4 text-[13px] font-medium"
                            >
                              <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                              Use prompt
                            </button>
                            {activeImageUrl ? (
                              <a
                                href={activeImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[13px] font-medium text-white"
                              >
                                <Download className="h-4 w-4" strokeWidth={1.9} />
                                Export
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                          <div
                            className={cn(
                              "relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--panel)]",
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
                              <div
                                className="absolute inset-0"
                                style={artStyle(activeAsset)}
                              />
                            ) : (
                              <div
                                className="absolute inset-0"
                                style={getLiveBackground(0)}
                              />
                            )}

                            {activeAsset.kind === "live" &&
                            activeAsset.status !== "completed" ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.2)] backdrop-blur-md">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/80 px-4 py-2 text-[13px] font-medium">
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                  {statusLabel(activeAsset)}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-4">
                              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                <CheckCheck className="h-4 w-4" strokeWidth={1.9} />
                                Generation notes
                              </div>
                              <p className="text-[14px] leading-[1.8] text-[var(--ink)]">
                                {activeAsset.kind === "live" &&
                                activeAsset.status !== "completed"
                                  ? "This run is still moving through the HOLO queue. Keep the session open or come back later from the left rail."
                                  : "This result is ready to inspect, reuse, and archive. Use the right pane to copy prompt details or export the final image."}
                              </p>
                            </div>

                            <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.9} />
                                Session details
                              </div>
                              <dl className="space-y-3 text-[13px]">
                                {[
                                  ["Model", activeAsset.remoteModel ?? activeAsset.model],
                                  ["Aspect", activeAsset.aspectRatio],
                                  ["Status", statusLabel(activeAsset)],
                                  ["Created", activeAsset.createdAt],
                                ].map(([label, value]) => (
                                  <div
                                    key={label}
                                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                                  >
                                    <dt className="text-[var(--muted)]">{label}</dt>
                                    <dd className="text-right font-medium">{value}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[30px] border border-[var(--line)] bg-white/90 p-4 shadow-[0_16px_40px_rgba(24,26,28,0.04)] md:p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                              Recent outputs
                            </p>
                            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">
                              Keep the session in one stream
                            </h3>
                          </div>
                          <button
                            type="button"
                            className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--panel)] px-4 text-[13px] font-medium"
                          >
                            <Search className="h-4 w-4" strokeWidth={1.9} />
                            Filter
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {feedAssets.slice(0, 6).map((asset, index) => {
                            const imageUrl = getAssetImage(asset);

                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => {
                                  setActiveId(asset.id);
                                  setInspectorOpen(true);
                                }}
                                className={cn(
                                  "overflow-hidden rounded-[24px] border bg-[var(--panel)] text-left transition",
                                  activeId === asset.id
                                    ? "border-[var(--line-strong)] shadow-[0_12px_30px_rgba(24,26,28,0.05)]"
                                    : "border-[var(--line)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(24,26,28,0.06)]",
                                )}
                              >
                                <div
                                  className={cn(
                                    "relative overflow-hidden",
                                    asset.aspectRatio === "16:9"
                                      ? "aspect-[16/10]"
                                      : "aspect-[4/5]",
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
                                  <div className="absolute left-3 top-3 rounded-full border border-white/35 bg-white/18 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur-md">
                                    {asset.model}
                                  </div>
                                </div>
                                <div className="space-y-2 px-4 pb-4 pt-3">
                                  <p className="text-[16px] font-medium tracking-[-0.02em]">
                                    {asset.title}
                                  </p>
                                  <p className="line-clamp-2 text-[13px] leading-5 text-[var(--muted)]">
                                    {asset.prompt}
                                  </p>
                                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                                    <span>{statusLabel(asset)}</span>
                                    <span>{asset.createdAt}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[var(--line)] px-3 pb-3 pt-3 md:px-6 md:pb-5">
                <div className="mx-auto w-full max-w-[980px] rounded-[32px] border border-[var(--line)] bg-white/94 p-4 shadow-[var(--shadow-float)]">
                  <textarea
                    className="min-h-[126px] w-full resize-none rounded-[24px] border border-transparent bg-[var(--panel)] px-5 py-4 text-[15px] leading-[1.8] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)]"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe the image you want to generate..."
                  />

                  <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/88 px-4 text-[14px] font-medium"
                      >
                        <Globe className="h-4 w-4" strokeWidth={1.9} />
                        Search
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-11 items-center gap-2 rounded-[16px] border border-[var(--line)] bg-white/88 px-4 text-[14px] font-medium"
                      >
                        <ImageIcon className="h-4 w-4" strokeWidth={1.9} />
                        Reference later
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        disabled={isSubmitting}
                        className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-[var(--ink)] px-5 text-[14px] font-medium text-white shadow-[0_14px_28px_rgba(26,28,31,0.14)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            strokeWidth={1.9}
                          />
                        ) : (
                          <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                        )}
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 text-[12px] text-[var(--muted)] md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-white px-2.5">
                        {modelOptions.find((option) => option.id === model)?.note}
                      </span>
                      <span className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-white px-2.5">
                        HOLO queue API
                      </span>
                    </div>
                    <p>
                      One HOLO request generates one image, so multi-image runs
                      submit parallel tasks.
                    </p>
                  </div>

                  {submitError ? (
                    <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                      {submitError}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </main>

          <aside
            className={cn(
              "hidden shrink-0 overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[var(--shadow-soft)] backdrop-blur-2xl xl:flex xl:flex-col",
              inspectorOpen ? "w-[390px]" : "w-[72px]",
            )}
          >
            {inspectorOpen ? (
              <>
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      Detail
                    </p>
                    <p className="mt-1 text-[21px] font-semibold tracking-[-0.04em]">
                      {activeAsset?.title ?? "No selection"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/86 text-[var(--muted)]"
                    aria-label="Close preview"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                {activeAsset ? (
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    <div className="space-y-4">
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--panel)]",
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
                          <div
                            className="absolute inset-0"
                            style={artStyle(activeAsset)}
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={getLiveBackground(0)}
                          />
                        )}
                      </div>

                      <section className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
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
                        <p className="text-[14px] leading-[1.8]">
                          {activeAsset.prompt}
                        </p>
                      </section>

                      <section className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                        <h3 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          Details
                        </h3>
                        <dl className="space-y-3 text-[13px]">
                          {[
                            ["Provider", activeAsset.model],
                            ["Remote model", activeAsset.remoteModel ?? "pending"],
                            ["Aspect", activeAsset.aspectRatio],
                            ["Status", statusLabel(activeAsset)],
                            ["Created", activeAsset.createdAt],
                            [
                              "Storage",
                              activeAsset.kind !== "mock" && activeAsset.publicFileUrl
                                ? "synced"
                                : "remote preview",
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                            >
                              <dt className="text-[var(--muted)]">{label}</dt>
                              <dd className="max-w-[56%] text-right font-medium">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>

                      <section className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                        <h3 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
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
                            onClick={() => void copyText(activeAsset.prompt)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] text-[13px] font-medium"
                          >
                            <Copy className="h-4 w-4" strokeWidth={1.9} />
                            Copy
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--panel)] text-[13px] font-medium"
                          >
                            <Heart className="h-4 w-4" strokeWidth={1.9} />
                            Favorite
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
                      </section>

                      <section className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          <SunMedium className="h-4 w-4" strokeWidth={1.9} />
                          Workspace
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between rounded-[16px] bg-[var(--panel)] px-3 py-3 text-[13px]">
                            <div>
                              <p className="font-medium text-[var(--ink)]">Supabase</p>
                              <p className="mt-1 text-[var(--muted)]">
                                {hasSupabaseEnv
                                  ? "History and storage sync are active"
                                  : "Add env values to enable sync"}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                              {hasSupabaseEnv ? "ready" : "pending"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[16px] bg-[var(--panel)] px-3 py-3 text-[13px]">
                            <div>
                              <p className="font-medium text-[var(--ink)]">HOLO</p>
                              <p className="mt-1 text-[var(--muted)]">
                                Queue submission and polling are connected.
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                              live
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-between p-3">
                <button
                  type="button"
                  onClick={() => setInspectorOpen(true)}
                  className="mt-1 flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/86 text-[var(--muted)]"
                  aria-label="Open preview"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <div className="space-y-2">
                  {[Download, Copy, Heart].map((Icon, index) => (
                    <button
                      key={index}
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/86 text-[var(--muted)]"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.9} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        <div className="fixed bottom-4 left-4 right-4 z-20 flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white/92 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl xl:hidden">
          <div>
            <p className="text-[15px] font-semibold">Create</p>
            <p className="text-[12px] text-[var(--muted)]">
              {pendingTaskIds.length > 0
                ? `${pendingTaskIds.length} tasks active`
                : "Prompt-first image workspace"}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[13px] font-medium text-white"
            onClick={() => void handleGenerate()}
          >
            <LogIn className="h-4 w-4" strokeWidth={1.9} />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
