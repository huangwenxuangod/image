"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, LogOut, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type AuthControlsProps = {
  viewerEmail: string | null;
};

export function AuthControls({ viewerEmail }: AuthControlsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isPending, startTransition] = useTransition();

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

    const redirectTo = `${window.location.origin}/auth/callback?next=/`;
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

  function handleSignOut() {
    if (!supabase) {
      setFeedback("Supabase env is missing.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setFeedback(error.message);
        return;
      }

      setFeedback(null);
      router.refresh();
    });
  }

  if (viewerEmail) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden rounded-[16px] border border-[var(--line)] bg-white/78 px-3 py-2 sm:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Signed in
          </p>
          <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">
            {viewerEmail}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/82 px-4 text-[14px] font-medium text-[var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
          ) : (
            <LogOut className="h-4 w-4" strokeWidth={1.9} />
          )}
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:min-w-[320px] sm:flex-row sm:items-center">
      <div className="flex h-10 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/82 px-3">
        <Mail className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.9} />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email for magic link"
          className="w-full bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] sm:w-[190px]"
        />
      </div>
      <button
        type="button"
        onClick={() => void handleMagicLink()}
        disabled={isPending || isSendingLink}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[var(--ink)] px-4 text-[14px] font-medium text-white transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSendingLink ? (
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.9} />
        ) : (
          <UserRound className="h-4 w-4" strokeWidth={1.9} />
        )}
        Sign in
      </button>
      {feedback ? (
        <p
          className={cn(
            "text-[12px] sm:basis-full",
            feedback.includes("sent") ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
