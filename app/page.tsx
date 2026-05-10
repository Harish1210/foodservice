import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session?.role === "vendor") redirect("/vendor");
  if (session?.role === "admin")  redirect("/admin/vendors");

  // Use logged-in user's suburb as location fallback
  let userSuburb: string | null = null;
  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { suburb: true },
    });
    userSuburb = user?.suburb ?? null;
  }

  return <HomeClient session={session} userSuburb={userSuburb} />;
}
