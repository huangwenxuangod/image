"use client";

import { useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, Mail, MoreHorizontal, Sparkles } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthScreen() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  async function handleMagicLink() {
    if (!supabase) {
      setFeedback("Supabase env is missing.");
      return;
    }

    if (!email.trim()) {
      setFeedback("Enter an email address first.");
      return;
    }

    setFeedback(null);
    setIsSendingLink(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=/board`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setFeedback(error.message);
      setIsSendingLink(false);
      return;
    }

    setFeedback("Magic link sent. Check your inbox.");
    setEmail("");
    setIsSendingLink(false);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--bg)] lg:grid-cols-[minmax(420px,0.92fr)_1.08fr]">
      <section className="relative flex items-center justify-center overflow-hidden border-b border-[var(--line)] p-6 lg:border-b-0 lg:border-r lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.52),transparent_32%)]" />
        <div className="relative w-full max-w-[430px] rounded-[34px] border border-[var(--line)] bg-white/86 p-6 shadow-[var(--shadow-float)] backdrop-blur-2xl md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="text-[36px] font-semibold tracking-[-0.08em]">un</div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Board access
              </p>
              <p className="text-[26px] font-semibold tracking-[-0.05em]">Sign in</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-[34px] font-semibold tracking-[-0.06em]">
                Enter the image board
              </h1>
              <p className="mt-3 text-[15px] leading-[1.8] text-[var(--muted)]">
                Chat-first image generation with a board sidebar, central
                conversation canvas, and a live workspace on the right.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex h-14 items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white px-4">
                <Mail className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email for magic link"
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)]"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleMagicLink()}
                disabled={isSendingLink}
                className="mt-3 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--ink)] px-4 text-[15px] font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSendingLink ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
                ) : (
                  <ArrowRight className="h-4 w-4" strokeWidth={1.9} />
                )}
                Continue with magic link
              </button>

              {feedback ? (
                <p
                  className={`mt-3 text-[13px] ${
                    feedback.includes("sent") ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {feedback}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden overflow-hidden lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_transparent_34%),linear-gradient(180deg,#f8f5ef_0%,#f2ede6_100%)]" />
        <div className="relative flex h-full items-center justify-center p-8">
          <div className="grid h-[780px] w-full max-w-[980px] grid-cols-[290px_minmax(0,1fr)_340px] overflow-hidden rounded-[38px] border border-[var(--line)] bg-white/74 shadow-[var(--shadow-float)]">
            <div className="border-r border-[var(--line)] bg-[rgba(248,245,240,0.9)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[32px] font-semibold tracking-[-0.08em]">un</div>
                <div className="rounded-[14px] border border-[var(--line)] bg-white px-3 py-2 text-[13px] text-[var(--muted)]">
                  Chaos
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "Editorial still life session",
                  "Nano banana tests",
                  "Summer campaign references",
                  "Magazine cover prompts",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-[16px] px-3 py-3 text-[14px] ${
                      index === 1 ? "bg-[rgba(93,120,174,0.1)]" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckIcon />
                      <div>
                        <p className="font-medium">{item}</p>
                        <p className="mt-1 text-[12px] text-[var(--muted)]">
                          Chat-native generation thread
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between bg-[rgba(255,255,255,0.68)] p-8">
              <div className="space-y-6">
                <div className="max-w-[78%] rounded-[24px] bg-[var(--bubble)] px-5 py-4 text-[15px] leading-[1.8] shadow-[0_10px_24px_rgba(24,26,28,0.03)]">
                  A tactile editorial still life with citrus slices and chalky
                  ceramic vessels, styled like a luxury magazine spread.
                </div>
                <div className="max-w-[88%] rounded-[28px] border border-[var(--line)] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(24,26,28,0.03)]">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[13px] font-medium">
                    <Sparkles className="h-4 w-4" strokeWidth={1.9} />
                    产出
                  </div>
                  <div className="aspect-[4/3] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[linear-gradient(145deg,#d4c79b_0%,#f4efe0_44%,#8f7f64_100%)]" />
                </div>
              </div>

              <div className="rounded-[30px] border border-[var(--line)] bg-white/92 p-4 shadow-[var(--shadow-soft)]">
                <div className="min-h-[110px] rounded-[22px] bg-[var(--panel)] px-5 py-4 text-[15px] text-[var(--muted)]">
                  消息
                </div>
              </div>
            </div>

            <div className="border-l border-[var(--line)] bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[15px] font-medium">
                  <Sparkles className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
                  Workspace
                </div>
                <MoreHorizontal className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
              </div>
              <div className="mt-6 flex h-[calc(100%-40px)] flex-col items-center justify-center text-center">
                <Sparkles className="h-12 w-12 text-[var(--muted)]" strokeWidth={1.6} />
                <p className="mt-5 text-[28px] font-semibold tracking-[-0.04em]">
                  Select a result
                </p>
                <p className="mt-3 max-w-[250px] text-[14px] leading-[1.8] text-[var(--muted)]">
                  Preview images, inspect prompts, and keep generation work in a
                  dedicated right-side workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[var(--muted)]">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path
          d="m5.5 10 3 3 6-6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
