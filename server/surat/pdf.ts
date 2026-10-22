import "server-only";

/**
 * HTML → PDF lewat Gotenberg (Chromium). Font "Times New Roman" diganti
 * Liberation Serif (metrik sama) di kontainer, jadi tata letak tidak bergeser.
 */
export async function htmlKePdf(html: string): Promise<{ ok: true; pdf: Buffer } | { ok: false; galat: string }> {
  const url = process.env.GOTENBERG_URL;
  if (!url) return { ok: false, galat: "Layanan PDF belum dikonfigurasi (GOTENBERG_URL). Gunakan tombol Cetak lalu pilih Simpan sebagai PDF." };
  const fd = new FormData();
  fd.append("files", new Blob([html], { type: "text/html" }), "index.html");
  fd.append("preferCssPageSize", "true");
  fd.append("printBackground", "true");
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/forms/chromium/convert/html`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return { ok: false, galat: `Layanan PDF menolak permintaan (HTTP ${r.status}).` };
    return { ok: true, pdf: Buffer.from(await r.arrayBuffer()) };
  } catch {
    return { ok: false, galat: "Layanan PDF (Gotenberg) tidak dapat dihubungi. Gunakan tombol Cetak lalu pilih Simpan sebagai PDF, atau hubungi Admin." };
  }
}
