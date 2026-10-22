"use server";

import { revalidatePath } from "next/cache";
import { wajibLogin } from "../auth/pengguna";
import { db } from "../db";

export async function tandaiSemuaDibaca(): Promise<void> {
  const u = await wajibLogin();
  await db.notifikasi.updateMany({ where: { userId: u.userId, dibacaPada: null }, data: { dibacaPada: new Date() } });
  revalidatePath("/", "layout");
}
