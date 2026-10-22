import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";

export function buatKlien(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi di .env");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export type Db = PrismaClient;
