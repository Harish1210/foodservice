import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage, deleteImage } from "@/lib/storage";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.role !== "vendor") return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  try {
    const formData = await req.formData();
    const updates: Record<string, unknown> = {};

    for (const f of ["name", "description", "allergens"] as const) {
      const v = formData.get(f);
      if (v !== null) updates[f] = (v as string) || null;
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

    // Handle image replacement — best-effort, update proceeds even if upload fails
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      try {
        const existing = await prisma.menuItem.findUnique({ where: { id }, select: { image: true } });
        if (existing?.image) await deleteImage(existing.image);
        updates.image = await uploadImage(imageFile);
      } catch (imgErr) {
        console.warn("Image upload failed during update (keeping existing image):", imgErr);
      }
    }

    const item = await prisma.menuItem.update({ where: { id }, data: updates, include: { category: true } });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("Update menu item error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update item: ${message}` }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  try {
    const item = await prisma.menuItem.findUnique({ where: { id }, select: { image: true, vendorId: true } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.vendorId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (item.image) await deleteImage(item.image);
    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete menu item error:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}