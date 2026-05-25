"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  CirclePlus,
  FolderClosed,
  Globe,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Search,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { PersistedFeedAsset } from "@/lib/studio/feed";
import { cn } from "@/lib/utils";

const aspectOptions = ["1:1", "4:5", "16:9"] as const;
const countOptions = [1, 2, 4] as const;
const modelOptions = [
  { id: "image2", label: "image2" },
  { id: "nanobanana", label: "nanobanana" },
] as const;

type StudioStatus =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type ComposerModel = (typeof modelOptions)[number]["id"];
type ComposerAspectRatio = (typeof aspectOptions)[number];
type ComposerCount = (typeof countOptions)[number];

type ThreadAsset = {
  id: string;
  taskId: string;
  prompt: string;
  model: ComposerModel;
  aspectRatio: ComposerAspectRatio;
  status: StudioStatus;
  createdAt: string;
  publicFileUrl?: string | null;
  remoteModel?: string;
  queuePosition?: number;
  error?: string | null;
  fileExt?: string | null;
};

type ThreadMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "generation";
      summary: string;
      assets: ThreadAsset[];
    };

type ThreadRecord = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: ThreadMessage[];
};

type BoardStudioProps = {
  viewerEmail: string;
  persistedFeed: PersistedFeedAsset[];
};

function titleFromPrompt(prompt: string) {
  const firstSentence = prompt.split(/[.!?]/)[0]?.trim() ?? prompt.trim();
  const words = firstSentence.split(/\s+/).slice(0, 4).join(" ");
  return words || "New task";
}

function formatThreadTime(input: string) {
  const timestamp = new Date(input);

  if (Number.isNaN(timestamp.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function humanStatusLabel(status: StudioStatus, queuePosition?: number) {
  if (status === "queued" && queuePosition) {
    return `Queued #${queuePosition}`;
  }

  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Generating";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Idle";
  }
}

function toThreadFromPersistedAsset(asset: PersistedFeedAsset): ThreadRecord {
  return {
    id: `thread-${asset.id}`,
    title: titleFromPrompt(asset.prompt),
    preview: asset.prompt,
    updatedAt: asset.createdAt,
    messages: [
      {
        id: `user-${asset.id}`,
        role: "user",
        text: asset.prompt,
      },
      {
        id: `assistant-${asset.id}`,
        role: "assistant",
        kind: "generation",
        summary:
          asset.status === "completed"
            ? "Here is your image result."
            : `Task status: ${humanStatusLabel(asset.status)}.`,
        assets: [
          {
            id: asset.id,
            taskId: asset.taskId,
            prompt: asset.prompt,
            model: asset.model,
            aspectRatio: asset.aspectRatio,
            status: asset.status,
            createdAt: asset.createdAt,
            publicFileUrl: asset.publicFileUrl,
            remoteModel: asset.remoteModel,
            error: asset.error,
            fileExt: asset.fileExt,
          },
        ],
      },
    ],
  };
}

function createEmptyThread(): ThreadRecord {
  return {
    id: "thread-empty",
    title: "New task",
    preview: "Start with a prompt for an image generation task.",
    updatedAt: "Now",
    messages: [],
  };
}

export function BoardStudio({ viewerEmail, persistedFeed }: BoardStudioProps) {
  const router = useRouter();
  const clerk = useClerk();
  const initialThreads = useMemo<ThreadRecord[]>(
    () =>
      persistedFeed.length > 0
        ? persistedFeed.map(toThreadFromPersistedAsset)
        : [createEmptyThread()],
    [persistedFeed],
  );

  const [threads, setThreads] = useState<ThreadRecord[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0]?.id ?? "thread-empty");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ComposerModel>("image2");
  const [aspectRatio, setAspectRatio] = useState<ComposerAspectRatio>("4:5");
  const [imageCount, setImageCount] = useState<ComposerCount>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signoutError, setSignoutError] = useState<string | null>(null);
  const [isSigningOut, startSignout] = useTransition();

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? createEmptyThread(),
    [activeThreadId, threads],
  );

  const pendingAssets = useMemo(
    () =>
      activeThread.messages.flatMap((message) =>
        message.role === "assistant"
          ? message.assets.filter(
              (asset) => asset.status === "queued" || asset.status === "processing",
            )
          : [],
      ),
    [activeThread],
  );

  useEffect(() => {
    if (pendingAssets.length === 0) {
      return;
    }

    const poll = async () => {
      const results = await Promise.all(
        pendingAssets.map(async (asset) => {
          try {
            const response = await fetch(`/api/generations/${encodeURIComponent(asset.taskId)}`, {
              cache: "no-store",
            });

            const payload = (await response.json().catch(() => null)) as
              | {
                  task_id?: string;
                  status?: StudioStatus;
                  position?: number;
                  model?: string;
                  public_file_url?: string | null;
                  result?: { file_ext?: string };
                  error?: string;
                }
              | null;

            if (!response.ok || !payload?.task_id || !payload.status) {
              return {
                taskId: asset.taskId,
                status: "failed" as const,
                error: payload?.error ?? "Failed to refresh task.",
              };
            }

            return payload;
          } catch (error) {
            return {
              taskId: asset.taskId,
              status: "failed" as const,
              error: error instanceof Error ? error.message : "Polling failed.",
            };
          }
        }),
      );

      setThreads((currentThreads) =>
        currentThreads.map((thread) => ({
          ...thread,
          messages: thread.messages.map((message) => {
            if (message.role !== "assistant") {
              return message;
            }

            const nextAssets = message.assets.map((asset) => {
              const next = results.find((entry) => {
                if ("task_id" in entry) {
                  return entry.task_id === asset.taskId;
                }

                if ("taskId" in entry) {
                  return entry.taskId === asset.taskId;
                }

                return false;
              });

              if (!next) {
                return asset;
              }

              if ("task_id" in next) {
                return {
                  ...asset,
                  status: next.status ?? asset.status,
                  queuePosition: next.position,
                  remoteModel: next.model ?? asset.remoteModel,
                  publicFileUrl: next.public_file_url ?? asset.publicFileUrl,
                  fileExt: next.result?.file_ext ?? asset.fileExt,
                  error: next.error ?? asset.error,
                };
              }

              return {
                ...asset,
                status: "failed" as const,
                error: next.error,
              };
            });

            const allCompleted = nextAssets.every((asset) => asset.status === "completed");
            const hasFailure = nextAssets.some((asset) => asset.status === "failed");

            return {
              ...message,
              summary: allCompleted
                ? "Here are your generated images."
                : hasFailure
                  ? "Some generation tasks failed."
                  : "Generating images based on your prompt.",
              assets: nextAssets,
            };
          }),
        })),
      );
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pendingAssets]);

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setSubmitError("Prompt is required.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
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

      if (!response.ok || !payload?.tasks?.length) {
        throw new Error(payload?.error ?? "Failed to submit generation.");
      }

      const now = formatThreadTime(new Date().toISOString());
      const nextThreadId =
        activeThread.messages.length === 0 ? activeThread.id : `thread-${crypto.randomUUID()}`;
      const nextThreadTitle = titleFromPrompt(trimmedPrompt);
      const nextAssets: ThreadAsset[] = payload.tasks.map((task) => ({
        id: `asset-${task.task_id}`,
        taskId: task.task_id,
        prompt: trimmedPrompt,
        model,
        aspectRatio,
        status: "queued",
        createdAt: now,
        queuePosition: task.position,
        remoteModel: task.model,
      }));

      const nextThread: ThreadRecord = {
        id: nextThreadId,
        title: nextThreadTitle,
        preview: trimmedPrompt,
        updatedAt: now,
        messages: [
          {
            id: `user-${crypto.randomUUID()}`,
            role: "user",
            text: trimmedPrompt,
          },
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            kind: "generation",
            summary: "Generating images based on your prompt.",
            assets: nextAssets,
          },
        ],
      };

      setThreads((current) => {
        const withoutEmpty =
          current.length === 1 && current[0]?.messages.length === 0 ? [] : current;
        const filtered = withoutEmpty.filter((thread) => thread.id !== nextThreadId);
        return [nextThread, ...filtered];
      });
      setActiveThreadId(nextThreadId);
      setPrompt("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit generation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewTask() {
    const emptyThread = createEmptyThread();
    setThreads((current) => [emptyThread, ...current.filter((thread) => thread.id !== emptyThread.id)]);
    setActiveThreadId(emptyThread.id);
    setSubmitError(null);
    setPrompt("");
  }

  function handleSignOut() {
    startSignout(async () => {
      try {
        await clerk.signOut({ redirectUrl: "/sign-in" });
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
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="grid min-h-screen grid-cols-[320px_1fr]">
        <aside className="border-r border-[var(--line)] bg-[var(--sidebar)] px-4 py-5">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.03em]">
                <span className="text-[20px] tracking-[-0.08em]">un</span>
                <span>Chaos</span>
              </div>
              <button
                type="button"
                onClick={handleNewTask}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)]"
              >
                <CirclePlus className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNewTask}
              className="mt-4 flex h-11 items-center gap-3 rounded-[14px] bg-[var(--surface)] px-4 text-[15px] font-medium"
            >
              <SquarePen className="h-4 w-4" strokeWidth={1.8} />
              新任务
            </button>

            <nav className="mt-5 space-y-1">
              {[
                { label: "项目", icon: FolderClosed },
                { label: "技能", icon: Sparkles },
                { label: "精灵", icon: ImagePlus },
                { label: "搜索", icon: Search },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[15px] text-[var(--ink)] hover:bg-white/60"
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.8} />
                  {item.label}
                </button>
              ))}
            </nav>

            <section className="mt-10">
              <p className="px-2 text-[13px] text-[var(--text-faint)]">近期项目</p>
              <div className="mt-3 space-y-1">
                {threads.slice(0, 8).map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={cn(
                      "w-full rounded-[14px] px-3 py-3 text-left transition-colors",
                      activeThreadId === thread.id ? "bg-white" : "hover:bg-white/56",
                    )}
                  >
                    <div className="line-clamp-1 text-[15px] font-medium">{thread.title}</div>
                    <div className="mt-1 line-clamp-2 text-[13px] leading-6 text-[var(--text-soft)]">
                      {thread.preview}
                    </div>
                    <div className="mt-2 text-[12px] text-[var(--text-faint)]">
                      {thread.updatedAt}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-auto rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="line-clamp-1 text-[14px] font-medium">{viewerEmail}</div>
              <div className="mt-1 text-[12px] text-[var(--text-faint)]">Free</div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[14px] font-medium text-white disabled:opacity-60"
              >
                {isSigningOut ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                ) : (
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                )}
                Sign out
              </button>
              {signoutError ? (
                <p className="mt-2 text-[12px] text-red-500">{signoutError}</p>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-[var(--surface)] px-7 py-5">
          <div className="mx-auto flex h-full max-w-[1180px] flex-col">
            <div className="flex items-center justify-between pb-5">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-[var(--text-soft)]" strokeWidth={1.8} />
                <span className="text-[18px] font-semibold tracking-[-0.03em]">Chaos</span>
              </div>
            </div>

            {activeThread.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[14px] text-[var(--text-soft)]">
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                  免费套餐
                </div>
                <h1 className="mt-10 text-center text-[58px] font-semibold tracking-[-0.08em]">
                  有什么我可以帮你的？
                </h1>
                <div className="mt-10 w-full max-w-[840px] rounded-[32px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)]">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="描述你想要生成的图片"
                    className="min-h-[136px] w-full resize-none border-0 bg-transparent text-[18px] leading-8 text-[var(--ink)] outline-none placeholder:text-[var(--text-faint)]"
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-soft)]"
                      >
                        <CirclePlus className="h-5 w-5" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-soft)]"
                      >
                        <ImagePlus className="h-5 w-5" strokeWidth={1.8} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[16px] text-[var(--ink)]">自动</span>
                      <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        disabled={isSubmitting}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ink)] text-white disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                        ) : (
                          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {["图片", "写作", "Slides", "网页"].map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[15px] text-[var(--text-soft)]"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                {submitError ? (
                  <p className="mt-5 text-[14px] text-red-500">{submitError}</p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto pb-8">
                  <div className="mx-auto max-w-[920px] space-y-10">
                    {activeThread.messages.map((message) =>
                      message.role === "user" ? (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[760px] rounded-[28px] bg-[var(--bubble)] px-6 py-5 text-[17px] leading-8">
                            {message.text}
                          </div>
                        </div>
                      ) : (
                        <div key={message.id} className="space-y-5">
                          <div className="rounded-[24px] border border-[var(--line)] bg-white px-6 py-5">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "inline-block h-2.5 w-2.5 rounded-full",
                                  message.assets.some((asset) => asset.status === "completed")
                                    ? "bg-[#40c778]"
                                    : message.assets.some((asset) => asset.status === "failed")
                                      ? "bg-[#ef4444]"
                                      : "bg-[#f2b541]",
                                )}
                              />
                              <span className="text-[15px] font-medium">{message.summary}</span>
                            </div>
                          </div>

                          <div className="rounded-[28px] border border-[var(--line)] bg-white p-6">
                            <div className="mb-2 text-[13px] uppercase tracking-[0.16em] text-[var(--text-faint)]">
                              {message.assets[0]?.model ?? "image"}
                            </div>
                            <h2 className="text-[34px] font-semibold tracking-[-0.05em]">
                              {titleFromPrompt(message.assets[0]?.prompt ?? "New image")}
                            </h2>

                            <div
                              className={cn(
                                "mt-6 grid gap-4",
                                message.assets.length === 1
                                  ? "grid-cols-1"
                                  : message.assets.length === 2
                                    ? "grid-cols-2"
                                    : "grid-cols-2 xl:grid-cols-4",
                              )}
                            >
                              {message.assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)]"
                                >
                                  <div className="aspect-[4/5] bg-[var(--surface-soft)]">
                                    {asset.publicFileUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={asset.publicFileUrl}
                                        alt={asset.prompt}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-[var(--text-soft)]">
                                        {asset.status === "failed" ? (
                                          <span className="px-6 text-center text-[14px]">
                                            {asset.error ?? "Generation failed."}
                                          </span>
                                        ) : (
                                          <LoaderCircle
                                            className="h-6 w-6 animate-spin"
                                            strokeWidth={1.8}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between px-4 py-3 text-[13px] text-[var(--text-soft)]">
                                    <span>{asset.aspectRatio}</span>
                                    <span>{humanStatusLabel(asset.status, asset.queuePosition)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[980px] pb-3">
                  <div className="rounded-[32px] border border-[var(--line)] bg-white px-6 py-5 shadow-[var(--shadow-soft)]">
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="继续描述下一张图片，或者让它重做、改风格、改比例。"
                      className="min-h-[124px] w-full resize-none border-0 bg-transparent text-[18px] leading-8 text-[var(--ink)] outline-none placeholder:text-[var(--text-faint)]"
                    />

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface-soft)] p-1">
                          {modelOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setModel(option.id)}
                              className={cn(
                                "rounded-full px-4 py-2 text-[15px]",
                                model === option.id
                                  ? "bg-white text-[var(--ink)] shadow-sm"
                                  : "text-[var(--text-soft)]",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface-soft)] p-1">
                          {aspectOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setAspectRatio(option)}
                              className={cn(
                                "rounded-full px-4 py-2 text-[15px]",
                                aspectRatio === option
                                  ? "bg-white text-[var(--ink)] shadow-sm"
                                  : "text-[var(--text-soft)]",
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>

                        <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface-soft)] p-1">
                          {countOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setImageCount(option)}
                              className={cn(
                                "rounded-full px-4 py-2 text-[15px]",
                                imageCount === option
                                  ? "bg-white text-[var(--ink)] shadow-sm"
                                  : "text-[var(--text-soft)]",
                              )}
                            >
                              {option} img
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        disabled={isSubmitting}
                        className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-[15px] font-medium text-white disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                        ) : (
                          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                        )}
                        Generate
                      </button>
                    </div>

                    {submitError ? (
                      <p className="mt-4 text-[14px] text-red-500">{submitError}</p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
