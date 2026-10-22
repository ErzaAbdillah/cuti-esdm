import "server-only";
import { headers } from "next/headers";

/**
 * IP & user agent klien. Next.js mengisi X-Forwarded-For dari alamat socket
 * bila header itu belum ada; reverse proxy menambahkan IP klien di akhir.
 * Karena itu yang dipakai adalah entri TERAKHIR — entri awal bisa dipalsukan klien.
 */
export async function infoPermintaan(): Promise<{ ip: string | null; userAgent: string | null }> {
  // Di luar request (skrip CLI) tidak ada header.
  let h: Awaited<ReturnType<typeof headers>>;
  try {
    h = await headers();
  } catch {
    return { ip: null, userAgent: null };
  }
  const daftar = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const ip = daftar.at(-1) ?? h.get("x-real-ip") ?? null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}
