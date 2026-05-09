// Sets up admin user for harishlambu9@gmail.com and approves existing vendors
import { createClient } from "@libsql/client";
import { createHash } from "crypto";

const client = createClient({ url: "file:dev.db" });

// 1. Approve all existing vendors (they were manually created before the approval system)
const approveExisting = await client.execute(
  "UPDATE User SET isApproved = 1 WHERE role IN ('vendor', 'admin', 'customer')"
);
console.log(`✅ Approved ${approveExisting.rowsAffected} existing users`);

// 2. Check if harishlambu9@gmail.com exists
const existing = await client.execute({
  sql: "SELECT id, role FROM User WHERE email = ?",
  args: ["harishlambu9@gmail.com"],
});

if (existing.rows.length > 0) {
  // Update to admin role and approve
  await client.execute({
    sql: "UPDATE User SET role = 'admin', isApproved = 1 WHERE email = ?",
    args: ["harishlambu9@gmail.com"],
  });
  console.log(`✅ Updated harishlambu9@gmail.com to admin role`);
} else {
  console.log(`ℹ️  harishlambu9@gmail.com not found in DB yet.`);
  console.log(`   They should register normally, then this script will promote them to admin.`);
  console.log(`   Or register with /api/auth/register and set role manually.`);
}

// 3. Show all users
const users = await client.execute(
  "SELECT email, role, isApproved, firstName, lastName FROM User ORDER BY role"
);
console.log("\n📋 All users:");
users.rows.forEach(u =>
  console.log(`  ${u.role.padEnd(10)} | approved=${u.isApproved} | ${u.email} (${u.firstName ?? ''} ${u.lastName ?? ''})`)
);

await client.close();
