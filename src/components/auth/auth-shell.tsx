import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--bg)] lg:grid-cols-[minmax(420px,0.92fr)_1.08fr]">
      <section className="relative flex items-center justify-center overflow-hidden border-b border-[var(--line)] p-6 lg:border-b-0 lg:border-r lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.52),transparent_32%)]" />
        <div className="relative w-full max-w-[460px] rounded-[34px] border border-[var(--line)] bg-white/86 p-6 shadow-[var(--shadow-float)] backdrop-blur-2xl md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="text-[36px] font-semibold tracking-[-0.08em]">un</div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {eyebrow}
              </p>
              <p className="text-[26px] font-semibold tracking-[-0.05em]">{title}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-[34px] font-semibold tracking-[-0.06em]">
                Enter the image board
              </h1>
              <p className="mt-3 text-[15px] leading-[1.8] text-[var(--muted)]">
                {description}
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-4">
              {children}
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
          </div>
        </div>
      </section>
    </div>
  );
}
