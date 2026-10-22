import { describe, expect, it } from "vitest";
import { type KandidatPejabat, pilihPejabat } from "@/lib/domain/pejabat";

const t = (s: string) => new Date(`${s}T00:00:00Z`);
const entri = (nama: string, x: Partial<KandidatPejabat>) => ({ nama, level: null, kodeDokumen: null, berlakuMulai: t("2026-01-01"), berlakuSampai: null, aktif: true, ...x });

describe("pilihPejabat", () => {
  const kadis = entri("Kadis", {});
  const plt = entri("Plt", { berlakuMulai: t("2026-12-01"), berlakuSampai: t("2026-12-31") });
  const khususIzin = entri("Sekretaris a.n.", { level: "STAF", kodeDokumen: "SURAT_IZIN", berlakuMulai: t("2026-03-01") });

  it("pejabat definitif di luar periode Plt.", () => {
    expect(pilihPejabat([kadis, plt], "ESELON_IV", "PERMOHONAN_BKD", t("2026-11-30"))?.nama).toBe("Kadis");
    expect(pilihPejabat([kadis, plt], "ESELON_IV", "PERMOHONAN_BKD", t("2027-01-01"))?.nama).toBe("Kadis");
  });

  it("Plt. selama periodenya (termasuk hari pertama & terakhir)", () => {
    expect(pilihPejabat([kadis, plt], "ESELON_IV", "PERMOHONAN_BKD", t("2026-12-01"))?.nama).toBe("Plt");
    expect(pilihPejabat([kadis, plt], "ESELON_IV", "PERMOHONAN_BKD", t("2026-12-31"))?.nama).toBe("Plt");
  });

  it("entri khusus level+dokumen mengalahkan entri umum", () => {
    expect(pilihPejabat([kadis, plt, khususIzin], "STAF", "SURAT_IZIN", t("2026-12-10"))?.nama).toBe("Sekretaris a.n.");
    expect(pilihPejabat([kadis, plt, khususIzin], "ESELON_III", "NOTA_DINAS_SEKDA", t("2026-12-10"))?.nama).toBe("Plt");
  });

  it("entri nonaktif atau belum berlaku diabaikan", () => {
    expect(pilihPejabat([{ ...kadis, aktif: false }], "STAF", "SURAT_IZIN", t("2026-06-01"))).toBeNull();
    expect(pilihPejabat([kadis], "STAF", "SURAT_IZIN", t("2025-12-31"))).toBeNull();
  });
});
