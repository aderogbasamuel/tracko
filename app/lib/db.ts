import * as PrismaPkg from "@prisma/client";
// Some environments export PrismaClient differently; normalize the import
const { PrismaClient } = (PrismaPkg as any);

// Prevent multiple Prisma Client instances in dev (Next.js hot-reloading
// would otherwise create a new client on every file change)
const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}