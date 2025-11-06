import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton Pattern
 *
 * Mencegah multiple instances di development mode (hot reload)
 * Best practice untuk Next.js development
 */

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    errorFormat: "pretty",
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

/**
 * Disconnect Prisma on process termination
 */
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
