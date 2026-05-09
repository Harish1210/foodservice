import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Dishly",
      tagline: "Every dish, every kitchen, delivered",
      phone: "+61 2 9000 1234",
      email: "hello@homefoodservice.com.au",
      address: "123 George Street, Sydney NSW 2000",
      openingHours: JSON.stringify({
        monday: { open: "11:00", close: "22:00" }, tuesday: { open: "11:00", close: "22:00" },
        wednesday: { open: "11:00", close: "22:00" }, thursday: { open: "11:00", close: "22:00" },
        friday: { open: "11:00", close: "23:00" }, saturday: { open: "10:00", close: "23:00" },
        sunday: { open: "10:00", close: "21:00" },
      }),
      deliveryRadius: 10, minOrderAmount: 20, deliveryFee: 5, freeDeliveryOver: 60,
      taxRate: 0.1, loyaltyRate: 0.05, isAcceptingOrders: true, estimatedPrepTime: 20,
    },
  });

  const adminPw = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({ where: { email: "admin@homefoodservice.com.au" }, update: {}, create: { name: "Admin", email: "admin@homefoodservice.com.au", passwordHash: adminPw, role: "admin" } });

  const vendorPw = await bcrypt.hash("vendor123", 10);
  await prisma.user.upsert({ where: { email: "vendor@homefoodservice.com.au" }, update: {}, create: { name: "Kitchen Staff", email: "vendor@homefoodservice.com.au", passwordHash: vendorPw, role: "vendor" } });

  const custPw = await bcrypt.hash("customer123", 10);
  await prisma.user.upsert({ where: { email: "customer@test.com" }, update: {}, create: { name: "Test Customer", email: "customer@test.com", phone: "+61 400 000 000", passwordHash: custPw, role: "customer", loyaltyPoints: 150 } });

  for (const t of [
    { number: 1, capacity: 2, location: "window" }, { number: 2, capacity: 2, location: "window" },
    { number: 3, capacity: 4, location: "indoor" }, { number: 4, capacity: 4, location: "indoor" },
    { number: 5, capacity: 6, location: "indoor" }, { number: 6, capacity: 6, location: "indoor" },
    { number: 7, capacity: 8, location: "outdoor" }, { number: 8, capacity: 8, location: "outdoor" },
  ]) { await prisma.table.upsert({ where: { number: t.number }, update: {}, create: t }); }

  await Promise.all([
    prisma.category.upsert({ where: { id: "cat-featured" }, update: {}, create: { id: "cat-featured", name: "Chef s Specials", icon: "⭐", sortOrder: 0 } }),
    prisma.category.upsert({ where: { id: "cat-starters" }, update: {}, create: { id: "cat-starters", name: "Starters", icon: "🥗", sortOrder: 1 } }),
    prisma.category.upsert({ where: { id: "cat-curries" }, update: {}, create: { id: "cat-curries", name: "Curries", icon: "🍛", sortOrder: 2 } }),
    prisma.category.upsert({ where: { id: "cat-biryanis" }, update: {}, create: { id: "cat-biryanis", name: "Biryanis & Rice", icon: "🍚", sortOrder: 3 } }),
    prisma.category.upsert({ where: { id: "cat-breads" }, update: {}, create: { id: "cat-breads", name: "Breads", icon: "🫓", sortOrder: 4 } }),
    prisma.category.upsert({ where: { id: "cat-sides" }, update: {}, create: { id: "cat-sides", name: "Sides & Extras", icon: "🥣", sortOrder: 5 } }),
    prisma.category.upsert({ where: { id: "cat-desserts" }, update: {}, create: { id: "cat-desserts", name: "Desserts", icon: "🍮", sortOrder: 6 } }),
    prisma.category.upsert({ where: { id: "cat-drinks" }, update: {}, create: { id: "cat-drinks", name: "Drinks", icon: "🥤", sortOrder: 7 } }),
  ]);

  console.log("✅ Seeded successfully!");
  console.log("📧 Admin:    admin@homefoodservice.com.au / admin123");
  console.log("👨‍🍳 Vendor:   vendor@homefoodservice.com.au / vendor123");
  console.log("👤 Customer: customer@test.com / customer123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });