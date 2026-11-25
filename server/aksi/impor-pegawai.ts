"use server";

import { revalidatePath } from "next/cache";
import { punyaHakAkses, wajibLogin } from "../auth/pengguna";
import { type HasilSimpanImpor, simpanImporPegawai } from "../layanan/impor-pegawai";

export type { HasilSimpanImpor };

export async function simpanImpor(kiriman: unknown): Promise<HasilSimpanImpor> {
  const u = await wajibLogin();
  if (!punyaHakAkses(u, "KELOLA_PEGAWAI")) {
    return { galat: "Hanya pemegang hak Kelola Pegawai atau Superadmin yang bisa mengimpor." };
  }
  const hasil = await simpanImporPegawai(kiriman, u.userId);
  if (!hasil.galat) revalidatePath("/pegawai");
  return hasil;
}
