import { redirect } from "next/navigation";

import { BoardStudio } from "@/components/board/board-studio";
import { fetchRecentFeed } from "@/lib/supabase/generations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BoardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user?.email) {
    redirect("/auth");
  }

  const persistedFeed = supabase ? await fetchRecentFeed(supabase) : [];

  return <BoardStudio viewerEmail={user.email} persistedFeed={persistedFeed} />;
}
