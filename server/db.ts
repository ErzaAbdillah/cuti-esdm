import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const g = globalThis as unknown as { __db?: PrismaClient };

function buat() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export const db = g.__db ?? buat();
if (process.env.NODE_ENV !== "production") g.__db = db;
