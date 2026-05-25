"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Copy,
  Download,
  FolderKanban,
  Grid2x2,
  Heart,
  ImageIcon,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Stars,
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

type StudioStatus = "idle" | "queued" | "processing" | "completed" | "failed" | "cancelled";

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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard failures in unsupported environments.
  }
}

type CreateStudioProps = {
  viewerEmail: string | null;
  persistedFeed: PersistedFeedAsset[];
};

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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.8),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.45),transparent_24%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1720px] gap-5 px-4 pb-32 pt-5 md:px-6">
        <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-[84px] shrink-0 flex-col justify-between rounded-[28px] border border-[var(--line)] bg-white/75 p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:flex">
          <div className="space-y-3">
            <div className="flex h-14 items-center justify-center rounded-[20px] border border-[var(--line-strong)] bg-[var(--panel)]">
              <span className="font-[var(--font-display)] text-[18px] font-semibold tracking-[-0.03em]">
                H
              </span>
            </div>
            <nav className="space-y-2">
              {navItems.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  className={cn(
                    "group flex h-11 w-full items-center justify-center rounded-[14px] border transition duration-200",
                    active
                      ? "border-[var(--line-strong)] bg-[var(--panel-strong)] text-[var(--ink)] shadow-[0_8px_24px_rgba(34,36,38,0.06)]"
                      : "border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-white/70 hover:text-[var(--ink)]",
                  )}
                  type="button"
                  aria-label={label}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} />
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center rounded-[14px] border border-transparent text-[var(--muted)] transition hover:border-[var(--line)] hover:bg-white/70 hover:text-[var(--ink)]"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.85} />
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/70 text-[var(--ink)]"
              aria-label="Account"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-[var(--ink)] text-[12px] font-semibold text-white">
                LM
              </span>
            </button>
          </div>
        </aside>

        <main className="grid min-h-[calc(100vh-40px)] flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[32px] border border-[var(--line)] bg-white/66 px-4 pb-6 pt-4 shadow-[var(--shadow-soft)] backdrop-blur-xl md:px-5 md:pt-5">
            <header className="mb-4 flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:mb-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  <span className="inline-flex h-6 items-center rounded-full border border-[var(--line)] bg-white/85 px-2.5">
                    Create
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-2.5">
                    Live task flow
                  </span>
                </div>
                <div>
                  <h1 className="font-[var(--font-display)] text-[28px] font-semibold tracking-[-0.04em] md:text-[32px]">
                    Prompt-first image studio
                  </h1>
                  <p className="max-w-[62ch] text-[14px] leading-[1.65] text-[var(--muted)] md:text-[15px]">
                    Built around the common generate-flow used by Midjourney,
                    Krea, and Leonardo: submit, queue, watch progress, then
                    keep every result in a single visual stream.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AuthControls viewerEmail={viewerEmail} />
                <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/80 px-4 text-[14px] font-medium text-[var(--ink)] transition hover:bg-white">
                  <Search className="h-4 w-4" strokeWidth={1.9} />
                  Search
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[14px] font-medium text-white shadow-[0_10px_30px_rgba(26,28,31,0.12)] transition hover:translate-y-[-1px]">
                  <Plus className="h-4 w-4" strokeWidth={1.9} />
                  New Collection
                </button>
              </div>
            </header>

            <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
              <span className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/80 px-3">
                <LayoutGrid className="h-4 w-4" strokeWidth={1.9} />
                Live feed
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/80 px-3">
                <Bookmark className="h-4 w-4" strokeWidth={1.9} />
                {feedAssets.length} assets
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/80 px-3">
                <Stars className="h-4 w-4" strokeWidth={1.9} />
                {pendingTaskIds.length} active tasks
              </span>
            </div>

            {submitError ? (
              <div className="mb-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                {submitError}
              </div>
            ) : null}

            <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
              {feedAssets.map((asset, index) => {
                const isLive = asset.kind === "live";
                const completedImage = isLive ? asset.publicFileUrl : null;
                const usesWideFrame = asset.aspectRatio === "16:9";

                return (
                  <article
                    key={asset.id}
                    className={cn(
                      "group mb-4 break-inside-avoid overflow-hidden rounded-[22px] border bg-white/75 transition duration-200",
                      activeId === asset.id
                        ? "border-[var(--line-strong)] shadow-[0_16px_40px_rgba(26,28,31,0.08)]"
                        : "border-transparent hover:-translate-y-0.5 hover:border-[var(--line)] hover:shadow-[0_14px_36px_rgba(26,28,31,0.08)]",
                    )}
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setActiveId(asset.id)}
                    >
                      <div
                        className={cn(
                          "relative isolate overflow-hidden bg-[var(--panel)]",
                          usesWideFrame ? "aspect-[16/10]" : "aspect-[4/5]",
                        )}
                      >
                        {completedImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={completedImage}
                            alt={asset.prompt}
                            className="absolute inset-0 h-full w-full object-cover"
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
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(28,32,36,0.24))]" />
                        <div className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/35 bg-white/18 px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-white/92 uppercase backdrop-blur-md">
                          {asset.model}
                        </div>
                        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/18 px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] text-white backdrop-blur-md">
                          {isLive && asset.status !== "completed" ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {statusLabel(asset)}
                        </div>
                        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition duration-200 group-hover:opacity-100">
                          {[Download, Copy, Heart].map((Icon, iconIndex) => (
                            <span
                              key={`${asset.id}-${iconIndex}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/30 bg-white/72 text-[var(--ink)] shadow-[0_10px_20px_rgba(26,28,31,0.08)] backdrop-blur-md"
                            >
                              <Icon className="h-4 w-4" strokeWidth={1.9} />
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 px-3 pb-4 pt-3">
                        <div className="space-y-1">
                          <p className="font-[var(--font-display)] text-[16px] font-semibold tracking-[-0.03em]">
                            {asset.title}
                          </p>
                          <p className="line-clamp-2 text-[13px] leading-5 text-[var(--muted)]">
                            {asset.prompt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                          <span>
                            {asset.kind === "mock"
                              ? asset.project
                              : asset.kind === "persisted"
                                ? asset.collectionName ?? asset.remoteModel ?? "library"
                                : asset.remoteModel ?? "submitted"}
                          </span>
                          <span>{asset.createdAt}</span>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="sticky top-5 hidden h-[calc(100vh-40px)] overflow-hidden rounded-[32px] border border-[var(--line)] bg-white/78 shadow-[var(--shadow-soft)] backdrop-blur-xl xl:flex xl:flex-col">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  Detail
                </p>
                <h2 className="mt-1 font-[var(--font-display)] text-[18px] font-semibold tracking-[-0.03em]">
                  {activeAsset?.title ?? "No selection"}
                </h2>
              </div>
              {activeAsset?.kind === "live" && activeAsset.publicFileUrl ? (
                <a
                  className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/82 px-3 text-[13px] font-medium"
                  href={activeAsset.publicFileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-4 w-4" strokeWidth={1.9} />
                  Export
                </a>
              ) : (
                <button className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/82 px-3 text-[13px] font-medium">
                  <Download className="h-4 w-4" strokeWidth={1.9} />
                  Export
                </button>
              )}
            </div>

            {activeAsset ? (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-5">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--panel)]",
                      activeAsset.aspectRatio === "16:9" ? "aspect-[16/10]" : "aspect-[4/5]",
                    )}
                  >
                    {activeAsset.kind === "live" && activeAsset.publicFileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeAsset.publicFileUrl}
                        alt={activeAsset.prompt}
                        className="h-full w-full object-cover"
                      />
                    ) : activeAsset.kind === "mock" ? (
                      <div className="absolute inset-0" style={artStyle(activeAsset)} />
                    ) : (
                      <div className="absolute inset-0" style={getLiveBackground(0)} />
                    )}
                    {activeAsset.kind === "live" && activeAsset.status !== "completed" ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.18)] backdrop-blur-md">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-[13px] font-medium text-[var(--ink)]">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          {statusLabel(activeAsset)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <section className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                        Prompt
                      </h3>
                      <button
                        className="inline-flex h-8 items-center gap-2 rounded-[12px] border border-[var(--line)] bg-white/82 px-3 text-[12px] font-medium"
                        type="button"
                        onClick={() => void copyText(activeAsset.prompt)}
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
                        Copy
                      </button>
                    </div>
                    <p className="text-[14px] leading-[1.7] text-[var(--ink)]">
                      {activeAsset.prompt}
                    </p>
                  </section>

                  <section className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
                    <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                      Meta
                    </h3>
                    <dl className="space-y-3 text-[13px]">
                      {[
                        ["Model", activeAsset.kind === "live" ? activeAsset.remoteModel ?? activeAsset.model : activeAsset.remoteModel ?? activeAsset.model],
                        ["Aspect", activeAsset.aspectRatio],
                        ["Status", statusLabel(activeAsset)],
                        [
                          "Source",
                          activeAsset.kind === "mock"
                            ? activeAsset.project
                            : activeAsset.kind === "persisted"
                              ? activeAsset.collectionName ?? activeAsset.taskId
                              : activeAsset.taskId,
                        ],
                        ["Created", activeAsset.createdAt],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                        >
                          <dt className="text-[var(--muted)]">{label}</dt>
                          <dd className="max-w-[58%] text-right font-medium text-[var(--ink)]">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
                    <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                      Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Generate Again", icon: WandSparkles, primary: true },
                        { label: "Favorite", icon: Heart },
                        { label: "Use Prompt", icon: Copy },
                        { label: "Download", icon: Download },
                      ].map(({ label, icon: Icon, primary }) => (
                        <button
                          key={label}
                          className={cn(
                            "inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border text-[13px] font-medium transition",
                            primary
                              ? "border-[var(--ink)] bg-[var(--ink)] text-white shadow-[0_12px_24px_rgba(26,28,31,0.12)]"
                              : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:bg-white",
                          )}
                          onClick={() => {
                            if (label === "Use Prompt") {
                              setPrompt(activeAsset.prompt);
                            }
                          }}
                          type="button"
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.9} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-[var(--line)] bg-white/82 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Grid2x2 className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                      <h3 className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                        Environment
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[13px]">
                        <div>
                          <p className="font-medium text-[var(--ink)]">Supabase</p>
                          <p className="mt-1 text-[var(--muted)]">
                            {hasSupabaseEnv
                              ? "Publishable key detected"
                              : "Add env values to enable auth and history sync"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
                            hasSupabaseEnv
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {hasSupabaseEnv ? "Ready" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-[13px]">
                        <div>
                          <p className="font-medium text-[var(--ink)]">HOLO API</p>
                          <p className="mt-1 text-[var(--muted)]">
                            Route handler wired for queued image generation tasks.
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Ready
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </aside>
        </main>

        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 md:px-6">
          <div className="pointer-events-auto w-full max-w-[980px] rounded-[28px] border border-[var(--line)] bg-white/86 p-4 shadow-[var(--shadow-float)] backdrop-blur-2xl">
            <textarea
              className="min-h-[112px] w-full resize-none rounded-[22px] border border-transparent bg-[var(--panel)] px-5 py-4 font-[var(--font-sans)] text-[15px] leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)]"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image you want to generate..."
            />

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-[14px] border border-[var(--line)] bg-[var(--panel)] p-1">
                  {modelOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setModel(option.id)}
                      className={cn(
                        "rounded-[10px] px-3 py-2 text-[13px] font-medium transition",
                        model === option.id
                          ? "bg-white text-[var(--ink)] shadow-[0_6px_16px_rgba(26,28,31,0.08)]"
                          : "text-[var(--muted)]",
                      )}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-[14px] border border-[var(--line)] bg-[var(--panel)] p-1">
                  {aspectOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAspectRatio(option)}
                      className={cn(
                        "rounded-[10px] px-3 py-2 text-[13px] font-medium transition",
                        aspectRatio === option
                          ? "bg-white text-[var(--ink)] shadow-[0_6px_16px_rgba(26,28,31,0.08)]"
                          : "text-[var(--muted)]",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-[14px] border border-[var(--line)] bg-[var(--panel)] p-1">
                  {countOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setImageCount(option)}
                      className={cn(
                        "rounded-[10px] px-3 py-2 text-[13px] font-medium transition",
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
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/82 px-4 text-[14px] font-medium text-[var(--ink)]"
                >
                  <ImageIcon className="h-4 w-4" strokeWidth={1.9} />
                  Reference later
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-5 text-[14px] font-medium text-white shadow-[0_14px_28px_rgba(26,28,31,0.14)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                  ) : (
                    <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
                  )}
                  Generate
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--muted)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-white/82 px-2.5">
                  {modelOptions.find((option) => option.id === model)?.note}
                </span>
                <span className="inline-flex h-7 items-center rounded-full border border-[var(--line)] bg-white/82 px-2.5">
                  HOLO queue API
                </span>
              </div>
              <p>One HOLO request generates one image, so multi-image runs submit parallel tasks.</p>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 left-4 right-4 z-20 flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-white/90 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:hidden">
          <div>
            <p className="font-[var(--font-display)] text-[15px] font-semibold">
              Create
            </p>
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
