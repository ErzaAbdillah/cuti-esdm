import { z } from "zod";
import { parseNip } from "@/lib/domain/nip";

export const STATUS_KEPEGAWAIAN = ["PNS", "PPPK", "PPPK_PARUH_WAKTU", "NON_ASN"] as const;
export const LEVEL_SURAT = ["ESELON_II", "ESELON_III", "ESELON_IV", "STAF"] as const;

const teksOpsional = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const tanggalOpsional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
      ctx.addIssue({ code: "custom", message: "Tanggal tidak valid." });
      return z.NEVER;
    }
    return new Date(`${v}T00:00:00Z`);
  })
  .nullable()
  .optional();

const idOpsional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid("Pilihan tidak valid.").nullable())
  .nullable()
  .optional();

/**
 * Skema data pegawai — dipakai form tambah/ubah dan impor Excel.
 * Kecocokan NIP dengan status, tanggal lahir, dan jenis kelamin diperiksa di sini.
 */
export const skemaPegawai = z
  .object({
    statusKepegawaian: z.enum(STATUS_KEPEGAWAIAN, "Pilih status kepegawaian."),
    nip: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s.\-]/g, ""))
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    idNonAsn: teksOpsional(32),
    gelarDepan: teksOpsional(30),
    nama: z.string().trim().min(2, "Nama wajib diisi.").max(120),
    gelarBelakang: teksOpsional(60),
    nik: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka.").nullable())
      .nullable()
      .optional(),
    tempatLahir: teksOpsional(60),
    tanggalLahir: tanggalOpsional,
    jenisKelamin: z
      .enum(["L", "P", ""])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    pendidikanTerakhir: teksOpsional(60),
    alamatDomisili: teksOpsional(300),
    noHp: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.replace(/[\s\-]/g, "")))
      .pipe(z.string().regex(/^\+?\d{8,15}$/, "Nomor HP tidak valid.").nullable())
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.toLowerCase()))
      .pipe(z.email("Email tidak valid.").nullable())
      .nullable()
      .optional(),
    pangkatGolonganId: idOpsional,
    tmtPangkat: tanggalOpsional,
    jabatanId: idOpsional,
    tmtJabatan: tanggalOpsional,
    unitKerjaId: z.uuid("Pilih unit kerja."),
    atasanLangsungId: idOpsional,
    levelSuratOverride: z
      .enum([...LEVEL_SURAT, ""])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    tanggalMasuk: tanggalOpsional,
    aktif: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const asn = d.statusKepegawaian !== "NON_ASN";
    if (asn) {
      if (!d.nip) {
        ctx.addIssue({ code: "custom", path: ["nip"], message: "NIP wajib untuk ASN." });
        return;
      }
      const h = parseNip(d.nip);
      if (!h.ok) {
        ctx.addIssue({ code: "custom", path: ["nip"], message: h.galat });
        return;
      }
      const harapan = d.statusKepegawaian === "PNS" ? "PNS" : "PPPK";
      if (h.data.jenis !== harapan) {
        ctx.addIssue({
          code: "custom",
          path: ["nip"],
          message: harapan === "PNS" ? "NIP ini berpola PPPK (kode 21), bukan PNS." : "NIP PPPK harus memakai kode 21 pada digit 13–14.",
        });
      }
      if (d.jenisKelamin && d.jenisKelamin !== h.data.jenisKelamin) {
        ctx.addIssue({ code: "custom", path: ["jenisKelamin"], message: "Jenis kelamin tidak sama dengan digit ke-15 NIP." });
      }
      if (d.tanggalLahir) {
        const t = h.data.tanggalLahir;
        const dariNip = Date.UTC(t.tahun, t.bulan - 1, t.hari);
        if (d.tanggalLahir.getTime() !== dariNip) {
          ctx.addIssue({ code: "custom", path: ["tanggalLahir"], message: "Tanggal lahir tidak sama dengan 8 digit pertama NIP." });
        }
      }
    } else {
      if (d.nip) ctx.addIssue({ code: "custom", path: ["nip"], message: "Non-ASN tidak memakai NIP; isi ID Non-ASN." });
      if (!d.idNonAsn) ctx.addIssue({ code: "custom", path: ["idNonAsn"], message: "ID Non-ASN wajib diisi." });
    }
  });

export type InputPegawai = z.input<typeof skemaPegawai>;
export type DataPegawai = z.output<typeof skemaPegawai>;
