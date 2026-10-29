"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { DEF_PENGATURAN, type DefPengaturan } from "@/lib/pengaturan";
import type { HasilForm } from "@/lib/validasi/auth";
import { catatAudit } from "../audit";
import { punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";

async function wajibAdmin() {
  const u = await wajibLogin();
  return punyaPeran(u, "ADMIN") ? u : null;
}

/** Ubah isian form menjadi nilai JSON sesuai tipe; string galat bila tidak valid. */
function bacaNilai(d: DefPengaturan, fd: FormData): { nilai: Prisma.InputJsonValue | null } | { galat: string } {
  const mentah = fd.getAll(d.kunci).map((v) => String(v));
  const teks = (mentah[0] ?? "").trim();
  switch (d.tipe) {
    case "teks":
      if (teks.length > 300) return { galat: "Terlalu panjang." };
      return { nilai: teks === "" ? null : teks };
    case "angka": {
      if (teks === "") return { nilai: null };
      const n = Number(teks);
      if (!Number.isInteger(n) || n < 0 || n > 10_000) return { galat: "Isi bilangan bulat ≥ 0." };
      return { nilai: n };
    }
    case "daftar-hari": {
      const hari = [...new Set(mentah.map(Number))].filter((h) => h >= 1 && h <= 7).sort();
      if (hari.length === 0) return { galat: "Pilih minimal satu hari kerja." };
      return { nilai: hari };
    }
    case "daftar-teks": {
      const daftar = teks.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      return { nilai: daftar };
    }
  }
}

export async function simpanPengaturan(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };

  const galatField: Record<string, string> = {};
  const baru = new Map<string, Prisma.InputJsonValue | null>();
  for (const d of DEF_PENGATURAN) {
    if (!fd.has(`ada:${d.kunci}`)) continue; // kunci yang tidak ada di form tidak diubah
    const h = bacaNilai(d, fd);
    if ("galat" in h) galatField[d.kunci] = h.galat;
    else baru.set(d.kunci, h.nilai);
  }
  if (Object.keys(galatField).length) {
    // Kembalikan isian agar tidak hilang saat form di-reset.
    const nilai = Object.fromEntries(DEF_PENGATURAN.map((d) => [d.kunci, fd.getAll(d.kunci).map(String).join(d.tipe === "daftar-hari" ? "," : "\n")]));
    return { galat: "Periksa isian yang ditandai.", galatField, nilai, stempel: Date.now() };
  }

  const lama = new Map((await db.pengaturan.findMany()).map((p) => [p.kunci, p.nilai]));
  const berubah = [...baru].filter(([k, v]) => JSON.stringify(lama.get(k) ?? null) !== JSON.stringify(v));

  await db.$transaction(async (tx) => {
    for (const [kunci, nilai] of berubah) {
      const def = DEF_PENGATURAN.find((d) => d.kunci === kunci)!;
      const json = nilai === null ? Prisma.DbNull : nilai;
      await tx.pengaturan.upsert({
        where: { kunci },
        update: { nilai: json, diubahOlehId: u.userId },
        create: { kunci, nilai: json, deskripsi: def.deskripsi || def.label, diubahOlehId: u.userId },
      });
    }
    if (berubah.length) {
      await catatAudit(
        {
          userId: u.userId,
          aksi: "UBAH_PENGATURAN",
          entitas: "pengaturan",
          sebelum: Object.fromEntries(berubah.map(([k]) => [k, lama.get(k) ?? null])),
          sesudah: Object.fromEntries(berubah),
        },
        tx,
      );
    }
  });
  revalidatePath("/", "layout");
  return { sukses: berubah.length ? `${berubah.length} pengaturan disimpan.` : "Tidak ada perubahan." };
}

const skemaLibur = z.object({
  tanggal: z.iso.date("Tanggal tidak valid."),
  nama: z.string().trim().min(3, "Isi nama hari libur.").max(120),
  jenis: z.enum(["LIBUR_NASIONAL", "CUTI_BERSAMA", "LIBUR_DAERAH"]),
});

export async function tambahLibur(_: HasilForm, fd: FormData): Promise<HasilForm> {
  const u = await wajibAdmin();
  if (!u) return { galat: "Hanya Admin." };
  const p = skemaLibur.safeParse(Object.fromEntries(fd));
  if (!p.success) return { galat: p.error.issues[0].message };
  const tanggal = new Date(`${p.data.tanggal}T00:00:00Z`);
  if (await db.hariLibur.findUnique({ where: { tanggal } })) return { galat: "Tanggal itu sudah terdaftar sebagai hari libur." };
  const l = await db.hariLibur.create({ data: { tanggal, nama: p.data.nama, jenis: p.data.jenis } });
  await catatAudit({ userId: u.userId, aksi: "TAMBAH_HARI_LIBUR", entitas: "hari_libur", entitasId: l.id, sesudah: l });
  revalidatePath("/admin/hari-libur");
  return { sukses: "Hari libur ditambahkan." };
}

export async function hapusLibur(id: string): Promise<void> {
  const u = await wajibAdmin();
  if (!u || !z.uuid().safeParse(id).success) return;
  const l = await db.hariLibur.delete({ where: { id } }).catch(() => null);
  if (l) await catatAudit({ userId: u.userId, aksi: "HAPUS_HARI_LIBUR", entitas: "hari_libur", entitasId: id, sebelum: l });
  revalidatePath("/admin/hari-libur");
}
