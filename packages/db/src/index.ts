import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __0xleakedPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__0xleakedPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__0xleakedPrisma = prisma;
}

export * from "@prisma/client";
