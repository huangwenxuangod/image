"use client";

import { useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, Mail, MoreHorizontal } from "lucide-react";

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
          <div className="w-full max-w-[1120px]">
            <div className="overflow-hidden rounded-[38px] border border-[var(--line)] bg-white/74 shadow-[var(--shadow-float)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/concepts/board-concept.png"
                alt="Concept image of the board chat workspace"
                className="block h-auto w-full"
              />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-white/76 px-5 py-4 text-[14px] text-[var(--muted)] backdrop-blur-xl">
              <div>
                <p className="font-medium text-[var(--ink)]">Live product concept</p>
                <p className="mt-1">
                  Generated with `image2` from the actual product direction: board
                  sidebar, central chat, and right-side workspace.
                </p>
              </div>
              <MoreHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.9} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
