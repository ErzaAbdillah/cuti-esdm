import "server-only";
import { z } from "zod";
import { type DataPegawai, skemaPegawai } from "@/lib/validasi/pegawai";
import { catatAudit } from "../audit";
import { db } from "../db";
import { KOLOM_PEGAWAI, type KunciKolom } from "../excel/kolom-pegawai";
import { MAKS_BARIS_IMPOR } from "../excel/impor-pegawai";
import { atasanOtomatis } from "../kueri/struktur";
import { muatReferensi, periksaReferensiDengan } from "./pegawai";

/** Kolom Excel → field pegawai yang diisinya. */
const FIELD_DARI_KOLOM: Partial<Record<KunciKolom, keyof DataPegawai>> = {
  golongan: "pangkatGolonganId",
  jabatan: "jabatanId",
  unitKerja: "unitKerjaId",
  nipAtasan: "atasanLangsungId",
};

const skemaKiriman = z.object({
  baris: z.array(z.record(z.string(), z.union([z.string(), z.boolean()]))).min(1).max(MAKS_BARIS_IMPOR),
  kolomAda: z.array(z.enum(KOLOM_PEGAWAI.map((k) => k.kunci) as [KunciKolom, ...KunciKolom[]])),
});

export type HasilSimpanImpor = { galat?: string; baru?: number; ubah?: number };

/** Validasi ulang & simpan baris impor (dipakai halaman Impor Excel dan skrip CLI). `userId` null = skrip. */
export async function simpanImporPegawai(kiriman: unknown, userId: string | null): Promise<HasilSimpanImpor> {
  const k = skemaKiriman.safeParse(kiriman);
  if (!k.success) return { galat: "Data impor tidak valid. Ulangi pemeriksaan berkas." };

  // Validasi ulang semua baris — nilai dari browser tidak dipercaya.
  const ref = await muatReferensi();
  const bersih: { data: DataPegawai; nipAtasan: string }[] = [];
  for (const [i, b] of k.data.baris.entries()) {
    const v = skemaPegawai.safeParse(b);
    if (!v.success) return { galat: `Baris ke-${i + 1} (${String(b.nama ?? "")}) tidak valid: ${v.error.issues[0].message}` };
    const g = Object.values(periksaReferensiDengan(ref, v.data, null));
    if (g.length) return { galat: `Baris ke-${i + 1} (${v.data.nama}): ${g[0]}` };
    bersih.push({ data: v.data, nipAtasan: typeof b.nipAtasan === "string" ? b.nipAtasan : "" });
  }

  // Field yang kolomnya tidak ada di berkas dibiarkan seperti data lama.
  const fieldAda = new Set<keyof DataPegawai>(
    k.data.kolomAda.map((kol) => FIELD_DARI_KOLOM[kol] ?? (kol as keyof DataPegawai)),
  );
  const atasanDariBerkas = fieldAda.has("atasanLangsungId");

  const hasil = await db.$transaction(
    async (tx) => {
      let baru = 0;
      let ubah = 0;
      const simpanan: { id: string; unitId: string; jabatanId: string | null; nipAtasan: string; lama: boolean }[] = [];

      for (const { data: d, nipAtasan } of bersih) {
        const ada = d.nip
          ? await tx.pegawai.findUnique({ where: { nip: d.nip } })
          : await tx.pegawai.findFirst({ where: { idNonAsn: { equals: d.idNonAsn!, mode: "insensitive" } } });

        const isi: Partial<DataPegawai> = {};
        for (const [kunci, nilai] of Object.entries(d) as [keyof DataPegawai, unknown][]) {
          if (kunci === "atasanLangsungId" || kunci === "levelSuratOverride") continue;
          if (!ada || fieldAda.has(kunci) || kunci === "statusKepegawaian" || kunci === "nama" || kunci === "unitKerjaId" || kunci === "aktif") {
            (isi as Record<string, unknown>)[kunci] = nilai;
          }
        }

        const p = ada
          ? await tx.pegawai.update({ where: { id: ada.id }, data: isi })
          : await tx.pegawai.create({ data: { ...(isi as DataPegawai), atasanLangsungId: null, levelSuratOverride: null } });
        if (ada) ubah++;
        else baru++;
        simpanan.push({ id: p.id, unitId: p.unitKerjaId, jabatanId: p.jabatanId, nipAtasan, lama: !!ada });
      }

      // Atasan diproses setelah semua baris masuk, karena atasan bisa ada di berkas yang sama.
      for (const s of simpanan) {
        if (s.lama && !atasanDariBerkas) continue;
        let atasanId: string | null = null;
        if (s.nipAtasan) atasanId = (await tx.pegawai.findUnique({ where: { nip: s.nipAtasan }, select: { id: true } }))?.id ?? null;
        atasanId ??= await atasanOtomatis(s.id, s.unitId, s.jabatanId, tx);
        await tx.pegawai.update({ where: { id: s.id }, data: { atasanLangsungId: atasanId === s.id ? null : atasanId } });
      }

      await catatAudit({ userId, aksi: "IMPOR_PEGAWAI", entitas: "pegawai", sesudah: { baru, ubah, kolom: k.data.kolomAda } }, tx);
      return { baru, ubah };
    },
    { timeout: 120_000 },
  );

  return hasil;
}
