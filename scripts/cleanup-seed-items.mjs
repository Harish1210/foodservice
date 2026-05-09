// Run with: node scripts/cleanup-seed-items.mjs
// Deletes all menu items that have no vendorId (orphan seed data)
import { createClient } from "@libsql/client";

const client = createClient({ url: "file:dev.db" });

const result = await client.execute(
  "DELETE FROM MenuItem WHERE vendorId IS NULL OR vendorId = ''"
);
console.log(`✅ Deleted ${result.rowsAffected} orphan menu items (no vendorId).`);
await client.close();
