export const JENIS_FOTO_PROFIL = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type EkstensiFotoProfil = keyof typeof JENIS_FOTO_PROFIL;
export type MimeFotoProfil = (typeof JENIS_FOTO_PROFIL)[EkstensiFotoProfil];

export const MIME_FOTO_PROFIL_SAH: ReadonlySet<string> = new Set(Object.values(JENIS_FOTO_PROFIL));
export const MAKS_BYTE_FOTO_PROFIL = 2 * 1024 * 1024;
export const MAKS_BYTE_MENTAH_FOTO_PROFIL = 10 * 1024 * 1024;
export const ACCEPT_FOTO_PROFIL = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** Mengambil maksimal 2 huruf inisial nama pegawai (mengabaikan gelar depan umum). */
export function inisialNama(nama: string): string {
  const kata = nama
    .replace(/^(H\.|Hj\.|Ir\.|Dr\.)\s*/i, "")
    .split(/[\s,]+/)
    .filter(Boolean);
  return ((kata[0]?.[0] ?? "") + (kata[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Membentuk URL endpoint foto profil dengan penanda versi agar langsung segar saat diganti. */
export function urlFotoProfil(userId: string, versi?: Date | string | number | null): string | null {
  if (versi === null || versi === undefined || versi === "") return null;
  const v = versi instanceof Date ? String(versi.getTime()) : String(versi);
  return `/api/profil/foto/${userId}?v=${encodeURIComponent(v)}`;
}

function cocokMagic(bytes: Uint8Array, urutan: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + urutan.length) return false;
  for (let i = 0; i < urutan.length; i++) {
    if (bytes[offset + i] !== urutan[i]) return false;
  }
  return true;
}

/** Deteksi jenis gambar asli dari byte awal berkas (magic bytes), bukan ekstensi. */
export function deteksiMimeGambar(isi: Uint8Array): MimeFotoProfil | null {
  if (cocokMagic(isi, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (cocokMagic(isi, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP diawali "RIFF" (0..3) dan "WEBP" (8..11)
  if (cocokMagic(isi, [0x52, 0x49, 0x46, 0x46], 0) && cocokMagic(isi, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export type HasilPeriksaFoto =
  | { ok: true; mime: MimeFotoProfil }
  | { ok: false; galat: string };

/** Validasi berkas foto profil: ukuran, ekstensi, klaim MIME, dan magic bytes asli. */
export function periksaFotoProfil(
  nama: string,
  isi: Uint8Array,
  mimeKlaim: string,
  maksByte = MAKS_BYTE_FOTO_PROFIL,
): HasilPeriksaFoto {
  if (isi.byteLength === 0) return { ok: false, galat: "Berkas foto kosong." };
  if (isi.byteLength > maksByte) {
    const maksMb = Math.max(1, Math.round(maksByte / 1024 / 1024));
    return { ok: false, galat: `Ukuran foto maksimal ${maksMb} MB.` };
  }

  const titik = nama.lastIndexOf(".");
  const ext = titik >= 0 ? nama.slice(titik + 1).toLowerCase() : "";
  if (ext && !(ext in JENIS_FOTO_PROFIL)) {
    return { ok: false, galat: `Format .${ext} tidak diizinkan. Gunakan JPG, PNG, atau WebP.` };
  }

  const mimeAsli = deteksiMimeGambar(isi);
  if (!mimeAsli) {
    return { ok: false, galat: "Isi berkas bukan gambar JPG, PNG, atau WebP yang valid." };
  }

  if (ext && JENIS_FOTO_PROFIL[ext as EkstensiFotoProfil] !== mimeAsli) {
    return { ok: false, galat: "Isi gambar tidak sesuai dengan format berkasnya." };
  }

  const klaim = mimeKlaim.trim().toLowerCase();
  if (klaim && klaim !== "application/octet-stream" && klaim !== mimeAsli) {
    return { ok: false, galat: "Tipe gambar tidak sesuai dengan isi berkas." };
  }

  return { ok: true, mime: mimeAsli };
}
