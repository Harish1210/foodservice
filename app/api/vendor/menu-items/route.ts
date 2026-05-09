import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

async function requireVendor() {
  const session = await getSession();
  if (!session || session.role !== "vendor") return null;
  return session;
}

export async function GET() {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { vendorId: session.userId },
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireVendor();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const formData      = await req.formData();
    const name          = formData.get("name") as string;
    const categoryId    = formData.get("categoryId") as string;
    const price         = parseFloat(formData.get("price") as string);
    const description   = (formData.get("description") as string) || null;
    const isVeg         = formData.get("isVeg") === "true";
    const isSpicy       = formData.get("isSpicy") === "true";
    const isGlutenFree  = formData.get("isGlutenFree") === "true";
    const isFeatured    = formData.get("isFeatured") === "true";
    const isAvailable   = formData.get("isAvailable") !== "false";
    const allergens     = (formData.get("allergens") as string) || null;
    const calories      = formData.get("calories") ? parseInt(formData.get("calories") as string) : null;
    const prepTime      = formData.get("prepTime") ? parseInt(formData.get("prepTime") as string) : 15;

    if (!name || !categoryId || isNaN(price)) {
      return NextResponse.json({ error: "Name, category and price are required" }, { status: 400 });
    }

    let imageUrl: string | null = null;
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadImage(imageFile);
    }

    const item = await prisma.menuItem.create({
      data: { name, categoryId, vendorId: session.userId, price, description, image: imageUrl, isVeg, isSpicy, isGlutenFree, isFeatured, isAvailable, allergens, calories, prepTime },
      include: { category: true },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Create menu item error:", err);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}