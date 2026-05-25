import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-[520px] rounded-[28px] border border-[var(--line)] bg-white/82 p-8 shadow-[var(--shadow-soft)]">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Auth
        </p>
        <h1 className="mt-3 font-[var(--font-display)] text-[28px] font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Sign-in could not be completed
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-[var(--muted)]">
          Clerk sign-in could not be completed. The session may have expired or
          the Clerk environment variables may be missing for this deployment.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex h-11 items-center rounded-[14px] bg-[var(--ink)] px-5 text-[14px] font-medium text-white"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
