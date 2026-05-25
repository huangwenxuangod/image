import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/board");
  }

  return (
    <AuthShell
      eyebrow="Board access"
      title="Create account"
      description="Create the first account for this board workspace. Clerk handles registration and session management."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/board"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full",
            card: "w-full border-0 bg-transparent shadow-none p-0",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "rounded-[16px]",
            formButtonPrimary:
              "h-[52px] rounded-[18px] bg-[var(--ink)] text-[15px] font-medium shadow-none",
            formFieldInput:
              "h-14 rounded-[18px] border border-[var(--line)] bg-white text-[15px] shadow-none",
            footerActionLink: "text-[var(--ink)] underline-offset-4",
            footerAction: "text-[13px] text-[var(--muted)]",
          },
        }}
      />
    </AuthShell>
  );
}
