-- CreateTable
CREATE TABLE "Trader" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vaBankName" TEXT,
    "vaAccountNumber" TEXT,
    "vaAccountName" TEXT,
    "vaIsPooled" BOOLEAN NOT NULL DEFAULT false,
    "vaRequestedAt" TIMESTAMP(3),
    "reconciledTxId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trader_email_key" ON "Trader"("email");
