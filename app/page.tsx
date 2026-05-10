import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session?.role === "vendor") redirect("/vendor");
  if (session?.role === "admin")  redirect("/admin/vendors");
  return <HomeClient session={session} />;
}
