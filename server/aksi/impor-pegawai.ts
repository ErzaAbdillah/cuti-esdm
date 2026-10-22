"use server";

import { revalidatePath } from "next/cache";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { type HasilSimpanImpor, simpanImporPegawai } from "../layanan/impor-pegawai";

export type { HasilSimpanImpor };

export async function simpanImpor(kiriman: unknown): Promise<HasilSimpanImpor> {
  const u = await wajibLogin();
  if (!punyaPeran(u, "KEPEGAWAIAN", "ADMIN")) return { galat: "Hanya Kepegawaian atau Admin yang bisa mengimpor." };
  const hasil = await simpanImporPegawai(kiriman, u.userId);
  if (!hasil.galat) revalidatePath("/pegawai");
  return hasil;
}
