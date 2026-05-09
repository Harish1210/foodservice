-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "street" TEXT,
    "suburb" TEXT,
    "state" TEXT DEFAULT 'NSW',
    "postcode" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "businessName" TEXT,
    "businessAddress" TEXT,
    "lat" REAL,
    "lng" REAL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isOnHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("businessAddress", "businessName", "createdAt", "email", "firstName", "id", "isApproved", "isOpen", "lastName", "lat", "lng", "loyaltyPoints", "name", "passwordHash", "phone", "postcode", "role", "state", "street", "suburb", "updatedAt") SELECT "businessAddress", "businessName", "createdAt", "email", "firstName", "id", "isApproved", "isOpen", "lastName", "lat", "lng", "loyaltyPoints", "name", "passwordHash", "phone", "postcode", "role", "state", "street", "suburb", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
