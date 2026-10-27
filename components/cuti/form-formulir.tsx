"use client";

import { PrinterIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pilihan } from "@/components/form/pilihan";
import { PratinjauA4 } from "@/components/surat/pratinjau-a4";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { terbilang } from "@/lib/domain/terbilang";
import { type IsianFormulir, JENIS_FORMULIR, type Pejabat, teksLamanya } from "@/lib/formulir/isian";
import { CSS_FORMULIR, htmlFormulir } from "@/lib/formulir/lembar";
import { atasNamaNota, CSS_NOTA_DINAS, halNotaDinas, htmlNotaDinas, type IsianNotaDinas, isiNotaDinas, namaJenisCuti, perluNotaDinas } from "@/lib/formulir/nota-dinas";
import { formatTanggal } from "@/lib/tanggal";
import { pratinjauCuti, simpanFormulir } from "@/server/aksi/cuti";

export interface PropsFormFormulir {
  /** null = pengajuan baru. */
  id: string | null;
  jenis: { id: string; nama: string; kode: string; bolehTanggalLampau: boolean }[];
  awal: { isian: IsianFormulir; jenisCutiId: string; tanggalMulai: string; tanggalSelesai: string; alasan: string; alamat: string };
  /** Level surat pemohon; Eselon II & III juga mengisi nota dinas. */
  level: string;
  hariIni: string;
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-judul">{judul}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function Isian({ id, label, ...p }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="bg-white" {...p} />
    </div>
  );
}

function Area({ id, label, nilai, ubah, baris = 3, petunjuk }: { id: string; label: string; nilai: string; ubah: (v: string) => void; baris?: number; petunjuk?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={baris} value={nilai} onChange={(e) => ubah(e.target.value)} className="bg-white" />
      {petunjuk && <p className="text-xs text-slate-600">{petunjuk}</p>}
    </div>
  );
}

function IsianPejabat({ awalan, p, ubah }: { awalan: string; p: Pejabat; ubah: (p: Pejabat) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Area id={`${awalan}-jabatan`} label="Jabatan (boleh 2 baris)" nilai={p.jabatan} ubah={(jabatan) => ubah({ ...p, jabatan })} baris={2} />
      </div>
      <Isian id={`${awalan}-nama`} label="Nama" value={p.nama} onChange={(e) => ubah({ ...p, nama: e.target.value })} />
      <Isian id={`${awalan}-nip`} label="NIP (kosongkan bila tidak ada)" value={p.nip} onChange={(e) => ubah({ ...p, nip: e.target.value })} />
    </div>
  );
}

const tgl = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? formatTanggal(new Date(`${s}T00:00:00Z`)) : "");

/**
 * Formulir Permintaan dan Pemberian Cuti — plus Nota Dinas pengantar untuk
 * Eselon II & III. Pegawai mengisi semua bagian, menyimpan, lalu mencetak —
 * tanpa verifikasi. Pratinjau di samping sama dengan hasil cetak.
 */
export function FormFormulir({ id, jenis, awal, level, hariIni }: PropsFormFormulir) {
  const router = useRouter();
  const [f, setF] = useState<IsianFormulir>(awal.isian);
  const [jenisCutiId, setJenisCutiId] = useState(awal.jenisCutiId);
  const [mulai, setMulai] = useState(awal.tanggalMulai);
  const [selesai, setSelesai] = useState(awal.tanggalSelesai);
  const [alasan, setAlasan] = useState(awal.alasan);
  const [alamat, setAlamat] = useState(awal.alamat);
  const [lamanyaManual, setLamanyaManual] = useState(!!awal.isian.lamanya);
  const [info, setInfo] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [cetakan, setCetakan] = useState<string | null>(null);
  const [pratinjau, setPratinjau] = useState("formulir");
  const [menunggu, mulaiKirim] = useTransition();
  const ubah = <K extends keyof IsianFormulir>(k: K, v: IsianFormulir[K]) => setF((x) => ({ ...x, [k]: v }));
  const j = jenis.find((x) => x.id === jenisCutiId);
  const levelNota = perluNotaDinas(level) ? level : null;

  /** Hal & isi nota dinas yang disusun dari isian cuti. */
  function notaOtomatis(x: IsianFormulir, jenisId: string, m: string, s: string, al: string) {
    const jj = jenis.find((y) => y.id === jenisId);
    const namaJenis = namaJenisCuti(jj?.kode ?? "", jj?.nama ?? "Cuti");
    if (!levelNota || !x.notaDinas) return { hal: "", isi: "" };
    const atasNama = atasNamaNota(levelNota, { dari: x.notaDinas.dari, nama: x.nama, nip: x.nip });
    return { hal: halNotaDinas(namaJenis), isi: isiNotaDinas({ namaJenis, atasNama, alasan: al, lamanya: x.lamanya, mulai: tgl(m), selesai: tgl(s) }) };
  }
  // Hal & isi ikut isian cuti sampai diubah tangan (teks tersimpan yang berbeda dari susunan otomatis = diubah tangan).
  const [notaManual, setNotaManual] = useState(() => {
    const o = notaOtomatis(awal.isian, awal.jenisCutiId, awal.tanggalMulai, awal.tanggalSelesai, awal.alasan);
    const n = awal.isian.notaDinas;
    return { hal: !!n?.hal && n.hal !== o.hal, isi: !!n?.isi && n.isi !== o.isi };
  });
  const otomatis = notaOtomatis(f, jenisCutiId, mulai, selesai, alasan);
  const nota: IsianNotaDinas | undefined = f.notaDinas && { ...f.notaDinas, hal: notaManual.hal ? f.notaDinas.hal : otomatis.hal, isi: notaManual.isi ? f.notaDinas.isi : otomatis.isi };
  const ubahNota = <K extends keyof IsianNotaDinas>(k: K, v: IsianNotaDinas[K]) => setF((x) => (x.notaDinas ? { ...x, notaDinas: { ...x.notaDinas, [k]: v } } : x));
  const ubahTtd = (v: Partial<IsianNotaDinas["penandatangan"]>) => setF((x) => (x.notaDinas ? { ...x, notaDinas: { ...x.notaDinas, penandatangan: { ...x.notaDinas.penandatangan, ...v } } } : x));

  // Hitung hari kerja & cek saldo; isi "Lamanya" otomatis selama belum diubah tangan.
  useEffect(() => {
    if (!jenisCutiId || !mulai || !selesai) return;
    const t = setTimeout(async () => {
      const h = await pratinjauCuti({ jenisCutiId, tanggalMulai: mulai, tanggalSelesai: selesai });
      const n = "jumlahHari" in h ? h.jumlahHari : undefined;
      if (n && !lamanyaManual) setF((x) => ({ ...x, lamanya: teksLamanya(n, terbilang(n), "satuan" in h && h.satuan ? h.satuan : "hari kerja") }));
      setInfo(h.galat ? h.galat : n ? `${n} ${"satuan" in h ? h.satuan : "hari"}${"sisaSetelah" in h && h.sisaSetelah != null ? ` · sisa saldo setelah cuti: ${h.sisaSetelah} hari` : ""}` : null);
    }, 250);
    return () => clearTimeout(t);
  }, [jenisCutiId, mulai, selesai, lamanyaManual]);

  const html = htmlFormulir(f, { jenisKode: j?.kode ?? "", tanggalMulai: tgl(mulai), tanggalSelesai: tgl(selesai), alasan, alamat });

  /** `cetak`: halaman cetak yang dibuka setelah tersimpan ("formulir" / "nota-dinas"). */
  function simpan(cetak: string | null) {
    setGalat(null);
    setCetakan(cetak ?? "");
    // Tab cetak dibuka saat klik agar tidak diblokir browser; alamatnya diisi setelah tersimpan.
    const tab = cetak ? window.open("about:blank", "_blank") : null;
    mulaiKirim(async () => {
      const notaDinas = nota && { ...nota, disposisi: nota.disposisi.map((k) => k.trim()).filter(Boolean) };
      const h = await simpanFormulir(id, { jenisCutiId, tanggalMulai: mulai, tanggalSelesai: selesai, alasan, alamatSelamaCuti: alamat, formulir: { ...f, notaDinas } });
      if (h.galat || !h.id) {
        tab?.close();
        setGalat(h.galat ?? "Gagal menyimpan formulir.");
        toast.error(h.galat ?? "Gagal menyimpan formulir.");
        return;
      }
      toast.success(nota ? "Formulir & nota dinas tersimpan." : "Formulir tersimpan.");
      if (cetak) {
        const url = `/cetak/${cetak}/${h.id}?otomatis=1`;
        if (tab) tab.location.href = url;
        else window.open(url, "_blank");
      }
      router.push(`/cuti/${h.id}${id ? "" : "?baru=1"}`);
    });
  }
  const label = (k: string, teks: string) => (menunggu && cetakan === k ? "Menyimpan…" : teks);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        className="grid gap-4"
        onFocusCapture={(e) => {
          // Pratinjau mengikuti dokumen yang sedang diisi.
          if (nota && e.target.matches("input, textarea, select")) setPratinjau(e.target.closest("[data-nota]") ? "nota" : "formulir");
        }}
      >
        <Bagian judul="Surat">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Isian id="tgl-surat" label="Tanggal" type="date" value={f.tanggalSurat} onChange={(e) => ubah("tanggalSurat", e.target.value)} />
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={f.hariKosong} onChange={(e) => ubah("hariKosong", e.target.checked)} className="size-4 accent-primary" />
                Kosongkan tanggal (hari) untuk diisi tangan
              </label>
            </div>
          </div>
          <Area id="kepada" label="Kepada Yth. (satu baris per baris cetak)" nilai={f.kepada} ubah={(v) => ubah("kepada", v)} baris={6} />
        </Bagian>

        <Bagian judul="I. Data pegawai">
          <div className="grid gap-3 sm:grid-cols-2">
            <Isian id="nama" label="Nama" value={f.nama} onChange={(e) => ubah("nama", e.target.value)} />
            <Isian id="nip" label="NIP" value={f.nip} onChange={(e) => ubah("nip", e.target.value)} />
            <Isian id="jabatan" label="Jabatan" value={f.jabatan} onChange={(e) => ubah("jabatan", e.target.value)} />
            <Isian id="masa-kerja" label="Masa kerja" value={f.masaKerja} onChange={(e) => ubah("masaKerja", e.target.value)} />
            <div className="sm:col-span-2">
              <Isian id="unit" label="Unit kerja" value={f.unitKerja} onChange={(e) => ubah("unitKerja", e.target.value)} />
            </div>
          </div>
        </Bagian>

        <Bagian judul="II–IV. Jenis, alasan, dan lamanya cuti">
          <div className="grid gap-1.5">
            <Label htmlFor="jenis">Jenis cuti yang diambil</Label>
            <Pilihan id="jenis" value={jenisCutiId} onChange={(e) => setJenisCutiId(e.target.value)} className="h-10">
              {jenis.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama}
                </option>
              ))}
            </Pilihan>
          </div>
          <Area id="alasan" label="Alasan cuti" nilai={alasan} ubah={setAlasan} baris={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Isian id="mulai" label="Tanggal mulai" type="date" value={mulai} min={j?.bolehTanggalLampau ? undefined : hariIni} onChange={(e) => {
              setMulai(e.target.value);
              if (!selesai || selesai < e.target.value) setSelesai(e.target.value);
            }} />
            <Isian id="selesai" label="Tanggal selesai" type="date" value={selesai} min={mulai || undefined} onChange={(e) => setSelesai(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Isian id="lamanya" label="Lamanya" value={f.lamanya} placeholder="mis. 12 (dua belas) hari kerja" onChange={(e) => {
              setLamanyaManual(true);
              ubah("lamanya", e.target.value);
            }} />
            <p className="text-xs text-slate-600" aria-live="polite">{info ?? "Pilih tanggal; jumlah hari kerja dihitung otomatis (Sabtu, Minggu, dan libur tidak dihitung)."}</p>
          </div>
        </Bagian>

        <Bagian judul="V. Catatan cuti">
          <p className="text-xs text-slate-600">Sisa cuti tahunan diisi dari data saldo; ubah bila perlu.</p>
          {f.catatanTahunan.map((b, i) => (
            <div key={i} className="grid grid-cols-[5rem_5rem_1fr] gap-2">
              <Input aria-label={`Tahun baris ${i + 1}`} value={b.tahun} className="bg-white" onChange={(e) => ubah("catatanTahunan", f.catatanTahunan.map((x, k) => (k === i ? { ...x, tahun: e.target.value } : x)) as IsianFormulir["catatanTahunan"])} />
              <Input aria-label={`Sisa ${b.tahun}`} value={b.sisa} className="bg-white" onChange={(e) => ubah("catatanTahunan", f.catatanTahunan.map((x, k) => (k === i ? { ...x, sisa: e.target.value } : x)) as IsianFormulir["catatanTahunan"])} />
              <Input aria-label={`Keterangan ${b.tahun}`} value={b.keterangan} placeholder="Keterangan" className="bg-white" onChange={(e) => ubah("catatanTahunan", f.catatanTahunan.map((x, k) => (k === i ? { ...x, keterangan: e.target.value } : x)) as IsianFormulir["catatanTahunan"])} />
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            {JENIS_FORMULIR.slice(1).map((x, i) => (
              <Isian key={x.kode} id={`cat-${x.kode}`} label={`Keterangan ${x.label.toLowerCase()}`} value={f.catatanLain[i]} onChange={(e) => ubah("catatanLain", f.catatanLain.map((y, k) => (k === i ? e.target.value : y)) as IsianFormulir["catatanLain"])} />
            ))}
          </div>
        </Bagian>

        <Bagian judul="VI. Alamat selama menjalankan cuti">
          <Area id="alamat" label="Alamat" nilai={alamat} ubah={setAlamat} baris={3} />
          <Isian id="telp" label="Telepon" inputMode="tel" value={f.telp} onChange={(e) => ubah("telp", e.target.value)} />
        </Bagian>

        <Bagian judul="VII. Pertimbangan atasan langsung">
          <IsianPejabat awalan="atasan" p={f.atasan} ubah={(p) => ubah("atasan", p)} />
        </Bagian>

        <Bagian judul="VIII. Keputusan pejabat yang berwenang">
          <IsianPejabat awalan="pejabat" p={f.pejabat} ubah={(p) => ubah("pejabat", p)} />
        </Bagian>

        {nota && (
          <div data-nota>
            <Bagian judul={`Nota Dinas — pengantar ke ${levelNota === "ESELON_II" ? "Gubernur" : "Sekretaris Daerah"}`}>
              <p className="text-xs text-slate-600">Dicetak terpisah di kertas Legal (8,5 × 14 inci) seperti contoh. Hal dan isi disusun otomatis dari isian cuti di atas; boleh diubah.</p>
              <Isian id="nota-kepada" label="Kepada Yth." value={nota.kepada} onChange={(e) => ubahNota("kepada", e.target.value)} />
              <Area id="nota-dari" label="Dari (boleh 2 baris)" nilai={nota.dari} ubah={(v) => ubahNota("dari", v)} baris={2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Isian id="nota-nomor" label="Nomor" value={nota.nomor} onChange={(e) => ubahNota("nomor", e.target.value)} />
                <div className="grid gap-1.5">
                  <Isian id="nota-tanggal" label="Tanggal nota dinas" type="date" value={nota.tanggal} onChange={(e) => ubahNota("tanggal", e.target.value)} />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={nota.hariKosong} onChange={(e) => ubahNota("hariKosong", e.target.checked)} className="size-4 accent-primary" />
                    Kosongkan tanggal (hari) untuk diisi tangan
                  </label>
                </div>
              </div>
              <Isian id="nota-hal" label="Hal" value={nota.hal} onChange={(e) => {
                setNotaManual((m) => ({ ...m, hal: true }));
                ubahNota("hal", e.target.value);
              }} />
              <Area id="nota-isi" label="Isi nota dinas (satu paragraf per baris)" nilai={nota.isi} baris={7} ubah={(v) => {
                setNotaManual((m) => ({ ...m, isi: true }));
                ubahNota("isi", v);
              }} />
              {(notaManual.hal || notaManual.isi) && (
                <Button type="button" variant="outline" size="sm" className="justify-self-start bg-white" onClick={() => setNotaManual({ hal: false, isi: false })}>
                  <RotateCcwIcon data-icon="inline-start" /> Susun ulang hal & isi dari isian cuti
                </Button>
              )}
              <h3 className="text-sm font-semibold text-judul">Penandatangan</h3>
              <Area id="nota-ttd-jabatan" label="Jabatan (boleh 2 baris)" nilai={nota.penandatangan.jabatan} ubah={(jabatan) => ubahTtd({ jabatan })} baris={2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Isian id="nota-ttd-nama" label="Nama penandatangan" value={nota.penandatangan.nama} onChange={(e) => ubahTtd({ nama: e.target.value })} />
                </div>
                <Isian id="nota-ttd-pangkat" label="Pangkat" value={nota.penandatangan.pangkat} onChange={(e) => ubahTtd({ pangkat: e.target.value })} />
                <Isian id="nota-ttd-nip" label="NIP penandatangan" value={nota.penandatangan.nip} onChange={(e) => ubahTtd({ nip: e.target.value })} />
              </div>
              <Area id="nota-disposisi" label="Kolom Disposisi Atasan (satu per baris)" nilai={nota.disposisi.join("\n")} ubah={(v) => ubahNota("disposisi", v.split("\n"))} baris={3} />
            </Bagian>
          </div>
        )}

        {galat && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-merah">
            {galat}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" onClick={() => simpan("formulir")} disabled={menunggu}>
            <PrinterIcon data-icon="inline-start" /> {label("formulir", "Simpan & cetak formulir")}
          </Button>
          {nota && (
            <Button type="button" size="lg" onClick={() => simpan("nota-dinas")} disabled={menunggu}>
              <PrinterIcon data-icon="inline-start" /> {label("nota-dinas", "Simpan & cetak nota dinas")}
            </Button>
          )}
          <Button type="button" size="lg" variant="outline" onClick={() => simpan(null)} disabled={menunggu}>
            <SaveIcon data-icon="inline-start" /> {label("", "Simpan saja")}
          </Button>
        </div>
        <p className="text-xs text-slate-600">
          {nota
            ? "Cetak formulir dan nota dinas, mintakan tanda tangan, lalu antar keduanya ke Kepegawaian (Sekretariat) untuk cap & tanda tangan. Kepegawaian kemudian membuatkan surat cutinya."
            : "Setelah dicetak, mintakan tanda tangan atasan, lalu antar formulir ke Kepegawaian (Sekretariat) untuk cap & tanda tangan. Kepegawaian kemudian membuatkan surat cutinya."}
        </p>
      </div>

      <div className="grid gap-2 xl:sticky xl:top-4">
        {nota && levelNota ? (
          <Tabs value={pratinjau} onValueChange={setPratinjau}>
            <TabsList className="bg-white/60">
              <TabsTrigger value="formulir">Formulir (A4)</TabsTrigger>
              <TabsTrigger value="nota">Nota dinas (Legal)</TabsTrigger>
            </TabsList>
            <TabsContent value="formulir">
              <PratinjauA4 label="Pratinjau formulir">
                <style>{CSS_FORMULIR}</style>
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </PratinjauA4>
            </TabsContent>
            <TabsContent value="nota">
              <PratinjauA4 label="Pratinjau nota dinas" lebarMm={215.9}>
                <style>{CSS_NOTA_DINAS}</style>
                <div dangerouslySetInnerHTML={{ __html: htmlNotaDinas(nota, levelNota) }} />
              </PratinjauA4>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-judul">Pratinjau formulir (A4)</h2>
            <PratinjauA4 label="Pratinjau formulir">
              <style>{CSS_FORMULIR}</style>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </PratinjauA4>
          </>
        )}
      </div>
    </div>
  );
}
