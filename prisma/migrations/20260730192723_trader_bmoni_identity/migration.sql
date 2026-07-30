-- CreateTable
CREATE TABLE "Trader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "bmoniUserId" TEXT,
    "ownerAddress" TEXT,
    "ownerKeyEncrypted" TEXT,
    "smartWalletId" TEXT,
    "smartWalletAddress" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'not_started',
    "kycApplicantId" TEXT,
    "kycRejectLabels" TEXT,
    "railStatus" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Trader_email_key" ON "Trader"("email");
