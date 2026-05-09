-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "vendorId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "stripePaymentId" TEXT,
    "addressId" TEXT,
    "deliveryStreet" TEXT,
    "deliverySuburb" TEXT,
    "deliveryPostcode" TEXT,
    "tableNumber" INTEGER,
    "scheduledAt" DATETIME,
    "subtotal" REAL NOT NULL,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "loyaltyPointsUsed" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "specialInstructions" TEXT,
    "pickupCode" TEXT,
    "estimatedTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("addressId", "createdAt", "deliveryFee", "deliveryPostcode", "deliveryStreet", "deliverySuburb", "discount", "estimatedTime", "guestEmail", "guestName", "guestPhone", "id", "loyaltyPointsEarned", "loyaltyPointsUsed", "orderNumber", "paymentMethod", "paymentStatus", "pickupCode", "scheduledAt", "specialInstructions", "status", "stripePaymentId", "subtotal", "tableNumber", "tax", "total", "type", "updatedAt", "userId") SELECT "addressId", "createdAt", "deliveryFee", "deliveryPostcode", "deliveryStreet", "deliverySuburb", "discount", "estimatedTime", "guestEmail", "guestName", "guestPhone", "id", "loyaltyPointsEarned", "loyaltyPointsUsed", "orderNumber", "paymentMethod", "paymentStatus", "pickupCode", "scheduledAt", "specialInstructions", "status", "stripePaymentId", "subtotal", "tableNumber", "tax", "total", "type", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
