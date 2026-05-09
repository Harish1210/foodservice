import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.role !== "vendor") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();

  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "allergens"] as const;
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) updates[f] = v as string || null;
  }
  const price = formData.get("price");
  if (price !== null) updates.price = parseFloat(price as string);
  const calories = formData.get("calories");
  if (calories !== null) updates.calories = calories ? parseInt(calories as string) : null;
  const prepTime = formData.get("prepTime");
  if (prepTime !== null) updates.prepTime = parseInt(prepTime as string);
  const categoryId = formData.get("categoryId");
  if (categoryId !== null) updates.categoryId = categoryId as string;
  for (const flag of ["isVeg", "isSpicy", "isGlutenFree", "isFeatured", "isAvailable"]) {
    const v = formData.get(flag);
    if (v !== null) updates[flag] = v === "true";
  }

  // Handle image replacement
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    // Delete old image if on disk
    const existing = await prisma.menuItem.findUnique({ where: { id }, select: { image: true } });
    if (existing?.image?.startsWith("/uploads/")) {
      try { await unlink(path.join(process.cwd(), "public", existing.image)); } catch { /* ignore */ }
    }
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), buffer);
    updates.image = `/uploads/${filename}`;
  }

  const item = await prisma.menuItem.update({ where: { id }, data: updates, include: { category: true } });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.menuItem.findUnique({ where: { id }, select: { image: true } });
  if (item?.image?.startsWith("/uploads/")) {
    try { await unlink(path.join(process.cwd(), "public", item.image)); } catch { /* ignore */ }
  }
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
