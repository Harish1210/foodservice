-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryPostcode" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryStreet" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliverySuburb" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "street" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Sydney',
    "state" TEXT NOT NULL DEFAULT 'NSW',
    "postcode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Address" ("city", "id", "isDefault", "label", "postcode", "state", "street", "suburb", "userId") SELECT "city", "id", "isDefault", "label", "postcode", "state", "street", "suburb", "userId" FROM "Address";
DROP TABLE "Address";
ALTER TABLE "new_Address" RENAME TO "Address";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
