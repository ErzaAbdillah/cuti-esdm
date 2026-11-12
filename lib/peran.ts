/** Peran efektif: PEGAWAI melekat pada akun ber-pegawai, ATASAN dari relasi bawahan. */
export type PeranEfektif = "PEGAWAI" | "ATASAN" | "KEPEGAWAIAN" | "ADMIN" | "SUPERADMIN";

export const LABEL_PERAN: Record<PeranEfektif, string> = {
  PEGAWAI: "Pegawai",
  ATASAN: "Atasan",
  KEPEGAWAIAN: "Kepegawaian",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};
