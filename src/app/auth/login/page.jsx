import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default function LoginPage({ searchParams }) {
  const redirectTo = searchParams?.redirect || "/discover";
  const authToken = cookies().get("authToken")?.value;

  if (authToken) {
    redirect(redirectTo);
  }

  return <LoginClient redirectTo={redirectTo} />;
}
