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

  // Menu Items
  const menuItems = [
    // Chef's Specials
    { id: "mi-001", categoryId: "cat-featured", name: "Butter Chicken", description: "Tender chicken in rich tomato-butter sauce, slow cooked with aromatic spices. Our signature dish.", price: 22.90, isVeg: false, isSpicy: false, isFeatured: true, prepTime: 20, calories: 520, allergens: "dairy,nuts" },
    { id: "mi-002", categoryId: "cat-featured", name: "Lamb Rogan Josh", description: "Slow-cooked tender lamb in Kashmiri spices, a restaurant favourite.", price: 26.90, isVeg: false, isSpicy: true, isFeatured: true, prepTime: 25, calories: 580 },
    { id: "mi-003", categoryId: "cat-featured", name: "Paneer Tikka Masala", description: "Grilled cottage cheese cubes in creamy tomato-based masala sauce.", price: 20.90, isVeg: true, isSpicy: false, isFeatured: true, prepTime: 18, calories: 460, allergens: "dairy" },
    // Starters
    { id: "mi-004", categoryId: "cat-starters", name: "Samosa (2 pcs)", description: "Crispy pastry filled with spiced potato and peas, served with mint chutney.", price: 8.90, isVeg: true, isSpicy: false, prepTime: 10, calories: 280, allergens: "gluten" },
    { id: "mi-005", categoryId: "cat-starters", name: "Chicken Tikka", description: "Tender marinated chicken pieces grilled in tandoor oven.", price: 16.90, isVeg: false, isSpicy: true, prepTime: 15, calories: 320 },
    { id: "mi-006", categoryId: "cat-starters", name: "Onion Bhaji", description: "Golden fried onion fritters with cumin and fresh herbs.", price: 9.90, isVeg: true, isSpicy: false, prepTime: 10, calories: 240, allergens: "gluten" },
    { id: "mi-007", categoryId: "cat-starters", name: "Seekh Kebab", description: "Minced lamb skewers with ginger, garlic and fresh coriander.", price: 17.90, isVeg: false, isSpicy: true, prepTime: 15, calories: 380 },
    { id: "mi-008", categoryId: "cat-starters", name: "Papdi Chaat", description: "Crispy wafers topped with chickpeas, yogurt, tamarind and mint chutney.", price: 11.90, isVeg: true, isSpicy: false, prepTime: 8, calories: 310, allergens: "gluten,dairy" },
    // Curries
    { id: "mi-009", categoryId: "cat-curries", name: "Chicken Tikka Masala", description: "Grilled chicken in spiced tomato cream sauce.", price: 22.90, isVeg: false, isSpicy: false, prepTime: 20, calories: 490, allergens: "dairy" },
    { id: "mi-010", categoryId: "cat-curries", name: "Dal Makhani", description: "Slow-cooked black lentils in butter and cream. A comfort classic.", price: 18.90, isVeg: true, isSpicy: false, prepTime: 15, calories: 420, allergens: "dairy" },
    { id: "mi-011", categoryId: "cat-curries", name: "Palak Paneer", description: "Fresh cottage cheese in smooth spinach gravy with gentle spices.", price: 19.90, isVeg: true, isSpicy: false, prepTime: 18, calories: 380, allergens: "dairy" },
    { id: "mi-012", categoryId: "cat-curries", name: "Chicken Vindaloo", description: "Fiery Goan-style chicken curry. For those who love the heat!", price: 23.90, isVeg: false, isSpicy: true, prepTime: 20, calories: 510 },
    { id: "mi-013", categoryId: "cat-curries", name: "Prawn Masala", description: "Fresh prawns in tangy tomato-based masala with coastal spices.", price: 27.90, isVeg: false, isSpicy: true, prepTime: 18, calories: 360, allergens: "shellfish" },
    { id: "mi-014", categoryId: "cat-curries", name: "Chana Masala", description: "Hearty chickpea curry in tangy tomato-onion gravy.", price: 17.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 15, calories: 390 },
    { id: "mi-015", categoryId: "cat-curries", name: "Korma", description: "Mild and creamy curry with coconut, yogurt and cardamom. Available with chicken or vegetables.", price: 21.90, isVeg: false, isSpicy: false, prepTime: 20, calories: 480, allergens: "dairy,nuts" },
    // Biryanis
    { id: "mi-016", categoryId: "cat-biryanis", name: "Chicken Biryani", description: "Fragrant basmati rice layered with spiced chicken, caramelised onions and saffron.", price: 24.90, isVeg: false, isSpicy: true, prepTime: 25, calories: 620, allergens: "dairy" },
    { id: "mi-017", categoryId: "cat-biryanis", name: "Lamb Biryani", description: "Slow-cooked lamb with aromatic basmati, rose water and whole spices.", price: 27.90, isVeg: false, isSpicy: true, prepTime: 30, calories: 680, allergens: "dairy" },
    { id: "mi-018", categoryId: "cat-biryanis", name: "Vegetable Biryani", description: "Mixed vegetables and paneer with saffron basmati rice.", price: 19.90, isVeg: true, isSpicy: false, prepTime: 20, calories: 520, allergens: "dairy" },
    { id: "mi-019", categoryId: "cat-biryanis", name: "Steamed Basmati Rice", description: "Fluffy long-grain basmati rice.", price: 4.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 10, calories: 210 },
    { id: "mi-020", categoryId: "cat-biryanis", name: "Jeera Rice", description: "Basmati rice tempered with cumin seeds and ghee.", price: 6.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 12, calories: 260, allergens: "dairy" },
    // Breads
    { id: "mi-021", categoryId: "cat-breads", name: "Garlic Naan", description: "Soft leavened bread brushed with garlic butter, baked in tandoor.", price: 4.90, isVeg: true, isSpicy: false, prepTime: 8, calories: 220, allergens: "gluten,dairy" },
    { id: "mi-022", categoryId: "cat-breads", name: "Butter Naan", description: "Classic fluffy naan brushed with butter.", price: 3.90, isVeg: true, isSpicy: false, prepTime: 8, calories: 200, allergens: "gluten,dairy" },
    { id: "mi-023", categoryId: "cat-breads", name: "Roti", description: "Wholemeal flatbread, light and healthy.", price: 3.50, isVeg: true, isSpicy: false, prepTime: 6, calories: 150, allergens: "gluten" },
    { id: "mi-024", categoryId: "cat-breads", name: "Peshwari Naan", description: "Sweet naan stuffed with coconut, almonds and sultanas.", price: 5.90, isVeg: true, isSpicy: false, prepTime: 10, calories: 310, allergens: "gluten,dairy,nuts" },
    { id: "mi-025", categoryId: "cat-breads", name: "Paratha", description: "Layered wholemeal flatbread cooked with ghee.", price: 4.50, isVeg: true, isSpicy: false, prepTime: 8, calories: 240, allergens: "gluten,dairy" },
    // Sides
    { id: "mi-026", categoryId: "cat-sides", name: "Raita", description: "Cool yogurt with cucumber and mint.", price: 4.50, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 5, calories: 90, allergens: "dairy" },
    { id: "mi-027", categoryId: "cat-sides", name: "Mango Chutney", description: "Sweet and tangy homemade mango chutney.", price: 2.90, isVeg: true, isSpicy: false, prepTime: 2, calories: 60 },
    { id: "mi-028", categoryId: "cat-sides", name: "Papadom (3 pcs)", description: "Crispy lentil crackers served with chutneys.", price: 3.90, isVeg: true, isSpicy: false, prepTime: 3, calories: 120, allergens: "gluten" },
    { id: "mi-029", categoryId: "cat-sides", name: "Side Salad", description: "Fresh garden salad with lemon dressing.", price: 6.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 5, calories: 80 },
    // Desserts
    { id: "mi-030", categoryId: "cat-desserts", name: "Gulab Jamun", description: "Soft milk dumplings soaked in rose-flavoured sugar syrup.", price: 8.90, isVeg: true, isSpicy: false, prepTime: 5, calories: 340, allergens: "dairy,gluten" },
    { id: "mi-031", categoryId: "cat-desserts", name: "Mango Kulfi", description: "Traditional Indian ice cream with fresh mango and cardamom.", price: 9.90, isVeg: true, isSpicy: false, prepTime: 3, calories: 280, allergens: "dairy" },
    { id: "mi-032", categoryId: "cat-desserts", name: "Kheer", description: "Creamy rice pudding with saffron, rose water and pistachios.", price: 8.90, isVeg: true, isSpicy: false, prepTime: 5, calories: 320, allergens: "dairy,nuts" },
    { id: "mi-033", categoryId: "cat-desserts", name: "Rasmalai", description: "Soft cottage cheese patties in sweetened saffron milk.", price: 9.90, isVeg: true, isSpicy: false, prepTime: 5, calories: 290, allergens: "dairy" },
    // Drinks
    { id: "mi-034", categoryId: "cat-drinks", name: "Mango Lassi", description: "Refreshing yogurt-based drink blended with fresh mango.", price: 6.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 3, calories: 220, allergens: "dairy" },
    { id: "mi-035", categoryId: "cat-drinks", name: "Rose Lassi", description: "Sweet yogurt drink with rose syrup and cardamom.", price: 6.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 3, calories: 200, allergens: "dairy" },
    { id: "mi-036", categoryId: "cat-drinks", name: "Masala Chai", description: "Spiced Indian tea with ginger, cardamom and milk.", price: 4.90, isVeg: true, isSpicy: false, prepTime: 5, calories: 90, allergens: "dairy" },
    { id: "mi-037", categoryId: "cat-drinks", name: "Fresh Lime Soda", description: "Freshly squeezed lime with soda, sweet or salted.", price: 4.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 3, calories: 50 },
    { id: "mi-038", categoryId: "cat-drinks", name: "Sparkling Water", description: "330ml sparkling mineral water.", price: 3.50, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 1, calories: 0 },
    { id: "mi-039", categoryId: "cat-drinks", name: "Soft Drink", description: "Coke, Diet Coke, Sprite or Fanta.", price: 3.90, isVeg: true, isSpicy: false, isGlutenFree: true, prepTime: 1, calories: 140 },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  console.log("✅ Database seeded successfully!");
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
