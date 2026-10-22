"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";
import { galatPerField, type HasilForm } from "@/lib/validasi/auth";
import { skemaPegawai } from "@/lib/validasi/pegawai";
import { catatAudit } from "../audit";
import { type PenggunaSaatIni, punyaPeran, wajibLogin } from "../auth/pengguna";
import { db } from "../db";
import { bolehLihatPegawai } from "../kueri/pegawai-detail";
import { atasanOtomatis } from "../kueri/struktur";
import { bacaFormPegawai, periksaReferensi } from "../layanan/pegawai";

/** Nilai asli NIK, alamat, HP — hanya untuk Kepegawaian, Admin, dan ybs. Dicatat di audit. */
export async function bukaDataSensitif(pegawaiId: string) {
  const u = await wajibLogin();
  if (!z.uuid().safeParse(pegawaiId).success || !bolehLihatPegawai(u, pegawaiId)) return null;
  const p = await db.pegawai.findUnique({ where: { id: pegawaiId }, select: { nik: true, alamatDomisili: true, noHp: true } });
  if (!p) return null;
  if (u.pegawai?.id !== pegawaiId) {
    await catatAudit({ userId: u.userId, aksi: "LIHAT_DATA_SENSITIF", entitas: "pegawai", entitasId: pegawaiId });
  }
  return p;
}

function pesanUnik(e: unknown): Record<string, string> | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String((e.meta as { target?: unknown })?.target ?? e.message);
    if (target.includes("nip")) return { nip: "NIP sudah dipakai pegawai lain." };
    if (target.includes("nik")) return { nik: "NIK sudah dipakai pegawai lain." };
    if (target.includes("id_non_asn")) return { idNonAsn: "ID Non-ASN sudah dipakai." };
    return { _: "Data bentrok dengan data yang sudah ada." };
  }
  return null;
}

function bolehUbah(u: PenggunaSaatIni) {
  return punyaPeran(u, "KEPEGAWAIAN");
}

export async function simpanPegawai(pegawaiId: string | null, _: HasilForm, formData: FormData): Promise<HasilForm> {
  const u = await wajibLogin();
  if (!bolehUbah(u)) return { galat: "Hanya Kepegawaian yang bisa mengubah data pegawai." };
  if (pegawaiId && !z.uuid().safeParse(pegawaiId).success) return { galat: "Data tidak valid." };

  const mentah = bacaFormPegawai(formData);
  // Isian dikembalikan saat galat agar tidak hilang ketika form di-reset.
  const gagal = (galatField: Partial<Record<string, string>>, galat = "Periksa kembali isian yang ditandai."): HasilForm => ({
    galat,
    galatField,
    nilai: { ...mentah, aktif: mentah.aktif ? "1" : "" },
    stempel: Date.now(),
  });

  const parsed = skemaPegawai.safeParse(mentah);
  if (!parsed.success) return gagal(galatPerField(parsed.error));
  const d = parsed.data;

  const galatRef = await periksaReferensi(d, pegawaiId);
  if (Object.keys(galatRef).length) return gagal(galatRef);

  const sebelum = pegawaiId ? await db.pegawai.findUnique({ where: { id: pegawaiId }, include: { user: true } }) : null;
  if (pegawaiId && !sebelum) return gagal({}, "Pegawai tidak ditemukan.");

  const data = {
    ...d,
    nip: d.statusKepegawaian === "NON_ASN" ? null : d.nip,
    idNonAsn: d.statusKepegawaian === "NON_ASN" ? d.idNonAsn : null,
    atasanLangsungId: d.atasanLangsungId ?? (await atasanOtomatis(pegawaiId, d.unitKerjaId, d.jabatanId ?? null)),
  };

  let id: string;
  try {
    id = await db.$transaction(async (tx) => {
      const hasil = pegawaiId
        ? await tx.pegawai.update({ where: { id: pegawaiId }, data })
        : await tx.pegawai.create({ data });
      // Login memakai NIP/ID: ikut berubah bila Kepegawaian mengoreksinya.
      const loginBaru = hasil.nip ?? hasil.idNonAsn;
      if (sebelum?.user && loginBaru && sebelum.user.loginId !== loginBaru) {
        await tx.user.update({ where: { id: sebelum.user.id }, data: { loginId: loginBaru } });
      }
      await catatAudit(
        {
          userId: u.userId,
          aksi: pegawaiId ? "UBAH_PEGAWAI" : "TAMBAH_PEGAWAI",
          entitas: "pegawai",
          entitasId: hasil.id,
          sebelum: sebelum ? { ...sebelum, user: undefined } : undefined,
          sesudah: hasil,
        },
        tx,
      );
      return hasil.id;
    });
  } catch (e) {
    const g = pesanUnik(e);
    if (g) return gagal(g);
    throw e;
  }
  redirect(`/pegawai/${id}?disimpan=1`);
}
