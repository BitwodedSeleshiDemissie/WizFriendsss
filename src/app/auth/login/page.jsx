import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const redirectTo = params?.redirect || "/app";
  
  const cookieStore = await cookies();
  const authToken = cookieStore.get("authToken")?.value;

  if (authToken) {
    redirect(redirectTo);
  }

  return <LoginClient redirectTo={redirectTo} />;
}
