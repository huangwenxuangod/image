import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BoardStudio } from "@/components/board/board-studio";
import { fetchRecentFeed } from "@/lib/supabase/generations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function BoardPage() {
  const [{ userId }, user, supabase] = await Promise.all([
    auth(),
    currentUser(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!userId) {
    redirect("/sign-in");
  }

  const persistedFeed = supabase ? await fetchRecentFeed(supabase, userId) : [];

  return (
    <BoardStudio
      viewerEmail={
        user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? userId
      }
      persistedFeed={persistedFeed}
    />
  );
}
