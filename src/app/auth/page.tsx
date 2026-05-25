import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/auth/auth-screen";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/board");
  }

  return <AuthScreen />;
}
