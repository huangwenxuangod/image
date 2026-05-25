import { CreateStudio } from "@/components/create/create-studio";
import { fetchRecentFeed } from "@/lib/supabase/generations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const persistedFeed = supabase && user ? await fetchRecentFeed(supabase) : [];

  return (
    <CreateStudio
      viewerEmail={user?.email ?? null}
      persistedFeed={persistedFeed}
    />
  );
}
