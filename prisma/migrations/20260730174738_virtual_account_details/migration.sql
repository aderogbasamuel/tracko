-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "deliveredAt" DATETIME,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" DATETIME,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "vaBankName" TEXT,
    "vaAccountNumber" TEXT,
    "vaAccountName" TEXT,
    "vaIsPooled" BOOLEAN NOT NULL DEFAULT false,
    "vaRequestedAt" DATETIME
);
INSERT INTO "new_Order" ("amountPaid", "createdAt", "customerName", "customerPhone", "deliveredAt", "dueDate", "id", "isCredit", "item", "paidAt", "paymentRef", "price", "status") SELECT "amountPaid", "createdAt", "customerName", "customerPhone", "deliveredAt", "dueDate", "id", "isCredit", "item", "paidAt", "paymentRef", "price", "status" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
