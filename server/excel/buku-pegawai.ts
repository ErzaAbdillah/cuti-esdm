import "server-only";
import * as XLSX from "xlsx";
import { LABEL_STATUS_KEPEGAWAIAN } from "@/lib/domain/pegawai";
import { saldoTersedia } from "@/lib/domain/saldo-cuti";
import { LABEL_LEVEL_SURAT } from "@/lib/label";
import { hariIniWita } from "@/lib/tanggal";
import { db } from "../db";
import type { semuaPegawaiUntukEkspor } from "../kueri/pegawai";
import { KOLOM_PEGAWAI, KOLOM_SENSITIF, type KunciKolom } from "./kolom-pegawai";

const KOLOM_TEKS: KunciKolom[] = ["nip", "nik", "noHp", "nipAtasan"];

function lebarKolom(judul: string[]) {
  return judul.map((j) => ({ wch: Math.max(12, Math.min(40, j.length + 4)) }));
}

/** Kolom NIP/NIK/HP diformat Teks agar 18/16 digit tidak berubah jadi notasi ilmiah. */
function formatTeks(ws: XLSX.WorkSheet, judul: string[], barisSampai: number) {
  for (const k of KOLOM_TEKS) {
    const c = judul.indexOf(KOLOM_PEGAWAI.find((x) => x.kunci === k)!.judul);
    if (c < 0) continue;
    for (let r = 1; r <= barisSampai; r++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const sel = ws[ref] ?? { t: "s", v: "" };
      sel.t = "s";
      sel.v = sel.v == null ? "" : String(sel.v);
      sel.z = "@";
      ws[ref] = sel;
    }
  }
}

export async function bukuTemplate(): Promise<Buffer> {
  const [units, jabatan, pangkat] = await Promise.all([
    db.unitKerja.findMany({ orderBy: [{ jenis: "asc" }, { urutan: "asc" }] }),
    db.jabatan.findMany({ where: { aktif: true }, orderBy: [{ jenis: "asc" }, { nama: "asc" }] }),
    db.pangkatGolongan.findMany({ orderBy: { urutan: "asc" } }),
  ]);

  const wb = XLSX.utils.book_new();
  const judul = KOLOM_PEGAWAI.map((k) => k.judul);
  const ws = XLSX.utils.aoa_to_sheet([judul]);
  formatTeks(ws, judul, 500);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 500, c: judul.length - 1 } });
  ws["!cols"] = lebarKolom(judul);
  XLSX.utils.book_append_sheet(wb, ws, "Pegawai");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["Kolom", "Contoh", "Keterangan"], ...KOLOM_PEGAWAI.map((k) => [k.judul, k.contoh, k.ket])]),
    "Petunjuk",
  );

  const panjang = Math.max(units.length, jabatan.length, pangkat.length);
  const ref: (string | number | null)[][] = [["Kode Unit", "Nama Unit", "", "Jabatan", "Nama Singkat", "Kelas", "Jenis", "", "Golongan", "Pangkat", "Untuk"]];
  for (let i = 0; i < panjang; i++) {
    const u = units[i];
    const j = jabatan[i];
    const p = pangkat[i];
    ref.push([
      u?.kode ?? null, u?.nama ?? null, null,
      j?.nama ?? null, j?.namaSingkat ?? null, j?.kelasJabatan ?? null, j?.jenis ?? null, null,
      p?.golongan ?? null, p?.namaPangkat ?? null, p?.untuk ?? null,
    ]);
  }
  const wsRef = XLSX.utils.aoa_to_sheet(ref);
  wsRef["!cols"] = [{ wch: 26 }, { wch: 50 }, { wch: 2 }, { wch: 58 }, { wch: 40 }, { wch: 6 }, { wch: 12 }, { wch: 2 }, { wch: 10 }, { wch: 26 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Referensi");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

type BarisEkspor = Awaited<ReturnType<typeof semuaPegawaiUntukEkspor>>[number];

const tgl = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function bukuEkspor(baris: BarisEkspor[], sertakanPribadi: boolean): Promise<Buffer> {
  const tahun = hariIniWita().getUTCFullYear();
  const saldo = await db.saldoCuti.findMany({ where: { tahun, pegawaiId: { in: baris.map((b) => b.id) } } });
  const saldoPer = new Map(saldo.map((s) => [s.pegawaiId, s]));
  const nipAtasan = new Map(
    (await db.pegawai.findMany({ where: { id: { in: baris.map((b) => b.mentah.atasanLangsungId).filter((x): x is string => !!x) } }, select: { id: true, nip: true } })).map((p) => [p.id, p.nip]),
  );

  const kolom = KOLOM_PEGAWAI.filter((k) => sertakanPribadi || !KOLOM_SENSITIF.has(k.kunci));
  const judul = [...kolom.map((k) => k.judul), "Eselon", "Kelas Jabatan", `Saldo Cuti Tersedia ${tahun}`];

  const isi = baris.map((b) => {
    const p = b.mentah;
    const nilai: Record<KunciKolom, string> = {
      nip: p.nip ?? "",
      idNonAsn: p.idNonAsn ?? "",
      statusKepegawaian: LABEL_STATUS_KEPEGAWAIAN[p.statusKepegawaian],
      gelarDepan: p.gelarDepan ?? "",
      nama: p.nama,
      gelarBelakang: p.gelarBelakang ?? "",
      nik: p.nik ?? "",
      tempatLahir: p.tempatLahir ?? "",
      tanggalLahir: tgl(p.tanggalLahir),
      jenisKelamin: p.jenisKelamin ?? "",
      pendidikanTerakhir: p.pendidikanTerakhir ?? "",
      alamatDomisili: p.alamatDomisili ?? "",
      noHp: p.noHp ?? "",
      email: p.email ?? "",
      golongan: p.pangkatGolongan?.golongan ?? "",
      tmtPangkat: tgl(p.tmtPangkat),
      jabatan: p.jabatan?.nama ?? "",
      tmtJabatan: tgl(p.tmtJabatan),
      unitKerja: p.unitKerja.nama,
      nipAtasan: (p.atasanLangsungId && nipAtasan.get(p.atasanLangsungId)) ?? "",
      tanggalMasuk: tgl(p.tanggalMasuk),
      aktif: p.aktif ? "Ya" : "Tidak",
    };
    const s = saldoPer.get(p.id);
    return [...kolom.map((k) => nilai[k.kunci]), LABEL_LEVEL_SURAT[b.level], b.kelas ?? "", s ? saldoTersedia(s) : ""];
  });

  const ws = XLSX.utils.aoa_to_sheet([judul, ...isi]);
  formatTeks(ws, judul, isi.length);
  ws["!cols"] = lebarKolom(judul);
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: isi.length, c: judul.length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
