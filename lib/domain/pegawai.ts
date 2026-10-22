import type { StatusKepegawaian } from "@/lib/generated/prisma/enums";

export function namaLengkap(p: { gelarDepan?: string | null; nama: string; gelarBelakang?: string | null }): string {
  const depan = p.gelarDepan ? `${p.gelarDepan} ` : "";
  const belakang = p.gelarBelakang ? `, ${p.gelarBelakang}` : "";
  return `${depan}${p.nama}${belakang}`;
}

/** "Penata Tingkat I – III/d" untuk PNS, "Golongan IX" untuk PPPK, "-" bila kosong. */
export function pangkatTampil(pg: { golongan: string; namaPangkat?: string | null } | null | undefined): string {
  if (!pg) return "-";
  return pg.namaPangkat ? `${pg.namaPangkat} – ${pg.golongan}` : `Golongan ${pg.golongan}`;
}

export const LABEL_STATUS_KEPEGAWAIAN: Record<StatusKepegawaian, string> = {
  PNS: "PNS",
  PPPK: "PPPK",
  PPPK_PARUH_WAKTU: "PPPK Paruh Waktu",
  NON_ASN: "Non-ASN",
};

/** Sebutan di surat izin cuti ("… kepada Pegawai Negeri Sipil :"). */
export function sebutanStatus(status: StatusKepegawaian): string {
  switch (status) {
    case "PNS":
      return "Pegawai Negeri Sipil";
    case "PPPK":
    case "PPPK_PARUH_WAKTU":
      return "Pegawai Pemerintah dengan Perjanjian Kerja";
    case "NON_ASN":
      return "Pegawai Non-ASN";
  }
}
