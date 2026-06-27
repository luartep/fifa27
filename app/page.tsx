import { redirect } from "next/navigation";
import { getSessionCookie, verifySession } from "@/lib/auth";

export default async function RootPage() {
  const token = await getSessionCookie();
  const isAuthed = await verifySession(token);
  redirect(isAuthed ? "/dashboard" : "/login");
}
