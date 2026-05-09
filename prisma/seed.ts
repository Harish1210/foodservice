import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaLibSql({ url: "file:dev.db" } as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  // Business settings
  await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Home Food Service",
      tagline: "Authentic Indian Home Cooking",
      phone: "+61 2 9000 1234",
      email: "hello@homefoodservice.com.au",
      address: "123 George Street, Sydney NSW 2000",
      openingHours: JSON.stringify({
        monday: { open: "11:00", close: "22:00" },
        tuesday: { open: "11:00", close: "22:00" },
        wednesday: { open: "11:00", close: "22:00" },
        thursday: { open: "11:00", close: "22:00" },
        friday: { open: "11:00", close: "23:00" },
        saturday: { open: "10:00", close: "23:00" },
        sunday: { open: "10:00", close: "21:00" },
      }),
      deliveryRadius: 10,
      minOrderAmount: 20,
      deliveryFee: 5,
      freeDeliveryOver: 60,
      taxRate: 0.1,
      loyaltyRate: 0.05,
      isAcceptingOrders: true,
      estimatedPrepTime: 20,
    },
  });

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@homefoodservice.com.au" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@homefoodservice.com.au",
      passwordHash: adminPassword,
      role: "admin",
    },
  });

  // Vendor user
  const vendorPassword = await bcrypt.hash("vendor123", 10);
  await prisma.user.upsert({
    where: { email: "vendor@homefoodservice.com.au" },
    update: {},
    create: {
      name: "Kitchen Staff",
      email: "vendor@homefoodservice.com.au",
      passwordHash: vendorPassword,
      role: "vendor",
    },
  });

  // Test customer
  const customerPassword = await bcrypt.hash("customer123", 10);
  await prisma.user.upsert({
    where: { email: "customer@test.com" },
    update: {},
    create: {
      name: "Test Customer",
      email: "customer@test.com",
      phone: "+61 400 000 000",
      passwordHash: customerPassword,
      role: "customer",
      loyaltyPoints: 150,
    },
  });

  // Tables
  const tables = [
    { number: 1, capacity: 2, location: "window" },
    { number: 2, capacity: 2, location: "window" },
    { number: 3, capacity: 4, location: "indoor" },
    { number: 4, capacity: 4, location: "indoor" },
    { number: 5, capacity: 6, location: "indoor" },
    { number: 6, capacity: 6, location: "indoor" },
    { number: 7, capacity: 8, location: "outdoor" },
    { number: 8, capacity: 8, location: "outdoor" },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: { number: table.number },
      update: {},
      create: table,
    });
  }

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: "cat-featured" },
      update: {},
      create: { id: "cat-featured", name: "Chef's Specials", description: "Our most loved dishes", icon: "⭐", sortOrder: 0 },
    }),
    prisma.category.upsert({
      where: { id: "cat-starters" },
      update: {},
      create: { id: "cat-starters", name: "Starters", description: "Begin your journey", icon: "🥗", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { id: "cat-curries" },
      update: {},
      create: { id: "cat-curries", name: "Curries", description: "Rich & aromatic curries", icon: "🍛", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { id: "cat-biryanis" },
      update: {},
      create: { id: "cat-biryanis", name: "Biryanis & Rice", description: "Fragrant rice dishes", icon: "🍚", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { id: "cat-breads" },
      update: {},
      create: { id: "cat-breads", name: "Breads", description: "Freshly baked breads", icon: "🫓", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { id: "cat-sides" },
      update: {},
      create: { id: "cat-sides", name: "Sides & Extras", description: "Complete your meal", icon: "🥣", sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { id: "cat-desserts" },
      update: {},
      create: { id: "cat-desserts", name: "Desserts", description: "Sweet endings", icon: "🍮", sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { id: "cat-drinks" },
      update: {},
      create: { id: "cat-drinks", name: "Drinks", description: "Refreshing beverages", icon: "🥤", sortOrder: 7 },
    }),
  ]);

  // NOTE: Menu items are NOT seeded. Each vendor adds their own items
  // via the Vendor Dashboard → Menu Items page.

  console.log("✅ Database seeded successfully! (No menu items — vendors add their own)");
  console.log("📧 Admin: admin@homefoodservice.com.au / admin123");
  console.log("👨‍🍳 Vendor: vendor@homefoodservice.com.au / vendor123");
  console.log("👤 Customer: customer@test.com / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
