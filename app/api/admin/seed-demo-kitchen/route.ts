/**
 * ONE-TIME seed endpoint — creates the "Delicious Food Service" demo kitchen.
 * DELETE this file after calling it once in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "demo@deliciousfoodservice.com.au";

const MENU_ITEMS = [
  {
    name: "Butter Chicken",
    description: "Tender chicken in a rich, creamy tomato-based sauce with aromatic spices. Served with basmati rice.",
    price: 22.90,
    category: "Mains",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: false,
  },
  {
    name: "Lamb Biryani",
    description: "Slow-cooked fragrant basmati rice layered with tender lamb, saffron, caramelised onions and fresh herbs.",
    price: 26.50,
    category: "Mains",
    image: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: true,
  },
  {
    name: "Margherita Wood-Fire Pizza",
    description: "Classic Neapolitan pizza with San Marzano tomatoes, fresh buffalo mozzarella and hand-torn basil.",
    price: 20.00,
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=85&fit=crop",
    isVeg: true, isSpicy: false,
  },
  {
    name: "Smash Burger",
    description: "Double smashed beef patties, American cheese, crispy pickles, caramelised onions and house sauce in a brioche bun.",
    price: 19.50,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: false,
  },
  {
    name: "Pad Thai",
    description: "Wok-tossed rice noodles with prawns, tofu, bean sprouts, egg and peanuts in a tamarind-palm sugar sauce.",
    price: 21.00,
    category: "Mains",
    image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: true,
  },
  {
    name: "Salmon Sushi Platter",
    description: "12-piece premium salmon sushi and maki rolls, served with pickled ginger, wasabi and soy sauce.",
    price: 28.00,
    category: "Japanese",
    image: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: false,
  },
  {
    name: "Paneer Tikka Masala",
    description: "Chargrilled cottage cheese cubes in a velvety spiced tomato-cream gravy. Served with garlic naan.",
    price: 20.50,
    category: "Mains",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=85&fit=crop",
    isVeg: true, isSpicy: true,
  },
  {
    name: "Grilled Barramundi",
    description: "Fresh Australian barramundi fillet, lemon butter sauce, seasonal greens and baby potatoes.",
    price: 32.00,
    category: "Seafood",
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=85&fit=crop",
    isVeg: false, isSpicy: false,
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm Belgian chocolate fondant with a molten centre, served with vanilla bean ice cream and berry coulis.",
    price: 13.50,
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=85&fit=crop",
    isVeg: true, isSpicy: false,
  },
  {
    name: "Acai Smoothie Bowl",
    description: "Blended acai, banana and almond milk topped with granola, fresh mango, strawberries and honey drizzle.",
    price: 16.00,
    category: "Healthy",
    image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=85&fit=crop",
    isVeg: true, isSpicy: false,
  },
];

export async function GET() {
  try {
    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (existing) {
      return NextResponse.json({ message: "Demo kitchen already exists", id: existing.id });
    }

    const passwordHash = await bcrypt.hash("DemoKitchen2025!", 10);

    const vendor = await prisma.user.create({
      data: {
        email:        DEMO_EMAIL,
        passwordHash: passwordHash,
        role:            "vendor",
        firstName:       "Delicious",
        lastName:        "Food Service",
        name:            "Delicious Food Service",
        businessName:    "Delicious Food Service",
        businessAddress: "200 George Street, Sydney NSW 2000",
        phone:           "+61 2 9000 5678",
        // No lat/lng — always visible to all users regardless of location
        lat:             null,
        lng:             null,
        isApproved:      true,
        isOnHold:        false,
        isOpen:          false,           // always closed — demo only
        supportsDelivery: true,
        supportsPickup:   true,
        openingHours: JSON.stringify({
          mon: { isOpen: false, open: "09:00", close: "21:00" },
          tue: { isOpen: false, open: "09:00", close: "21:00" },
          wed: { isOpen: false, open: "09:00", close: "21:00" },
          thu: { isOpen: false, open: "09:00", close: "21:00" },
          fri: { isOpen: false, open: "09:00", close: "22:00" },
          sat: { isOpen: false, open: "10:00", close: "22:00" },
          sun: { isOpen: false, open: "10:00", close: "20:00" },
          override: "closed",
        }),
        menuItems: {
          create: MENU_ITEMS.map((item) => ({
            name:        item.name,
            description: item.description,
            price:       item.price,
            category:    item.category,
            image:       item.image,
            isVeg:       item.isVeg,
            isSpicy:     item.isSpicy,
            isAvailable: true,
          })),
        },
      },
      select: { id: true, businessName: true, _count: { select: { menuItems: true } } },
    });

    return NextResponse.json({ success: true, vendor });
  } catch (err) {
    console.error("[seed-demo-kitchen]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
