import { createClient } from "@libsql/client";

const client = createClient({ url: "file:dev.db" });

// First delete OrderItems that reference seeded MenuItems
const delOrderItems = await client.execute(
  "DELETE FROM OrderItem WHERE menuItemId GLOB 'mi-*'"
);
console.log(`🗑️  Deleted ${delOrderItems.rowsAffected} order items referencing seed menu items`);

// Now delete the seeded menu items
const del = await client.execute("DELETE FROM MenuItem WHERE id GLOB 'mi-*'");
console.log(`✅ Deleted ${del.rowsAffected} seeded menu items`);

const remaining = await client.execute("SELECT COUNT(*) as count FROM MenuItem");
console.log(`📦 Remaining menu items in DB: ${remaining.rows[0].count}`);

await client.close();
