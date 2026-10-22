import { z } from "zod";
import { validasiPassword } from "@/lib/password";

export type HasilForm = {
  galat?: string;
  galatField?: Partial<Record<string, string>>;
  sukses?: string;
  /** Isian yang dikembalikan agar tidak hilang saat form di-reset (bukan password). */
  nilai?: Partial<Record<string, string>>;
  /** Berubah tiap respons galat; dipakai sebagai key agar form dirender ulang dengan `nilai`. */
  stempel?: number;
};

export const skemaMasuk = z.object({
  loginId: z.string().trim().min(1, "Isi NIP atau ID pegawai.").max(64),
  password: z.string().min(1, "Isi password.").max(128),
  lanjut: z.string().optional(),
});

const passwordBaru = z.string().superRefine((v, ctx) => {
  const galat = validasiPassword(v);
  if (galat) ctx.addIssue({ code: "custom", message: galat });
});

export const skemaAktivasi = z
  .object({
    loginId: z.string().trim().min(1, "Isi NIP atau ID pegawai.").max(64),
    verifikasi: z.string().trim().min(1, "Isi NIK atau kode aktivasi.").max(32),
    password: passwordBaru,
    konfirmasi: z.string(),
  })
  .refine((d) => d.password === d.konfirmasi, { path: ["konfirmasi"], message: "Konfirmasi password tidak sama." });

export const skemaGantiPassword = z
  .object({
    passwordLama: z.string().min(1, "Isi password lama."),
    password: passwordBaru,
    konfirmasi: z.string(),
  })
  .refine((d) => d.password === d.konfirmasi, { path: ["konfirmasi"], message: "Konfirmasi password tidak sama." })
  .refine((d) => d.password !== d.passwordLama, { path: ["password"], message: "Password baru harus berbeda dari yang lama." });

/** Kumpulkan galat zod per field untuk ditampilkan di form. */
export function galatPerField(e: z.ZodError): Partial<Record<string, string>> {
  const hasil: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "_");
    hasil[k] ??= i.message;
  }
  return hasil;
}

/** Hanya izinkan path relatif di dalam aplikasi (cegah open redirect). */
export function tujuanAman(lanjut: string | undefined | null, cadangan = "/beranda"): string {
  if (!lanjut || !lanjut.startsWith("/") || lanjut.startsWith("//") || lanjut.startsWith("/\\")) return cadangan;
  return lanjut;
}
