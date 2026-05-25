import { redirect } from "next/navigation";

export default function AuthEntryPage() {
  redirect("/sign-in");
}
