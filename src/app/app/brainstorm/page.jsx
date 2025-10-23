import { redirect } from "next/navigation";

export default function AppBrainstormRedirectPage() {
  redirect("/app?tab=brainstorm");
}
