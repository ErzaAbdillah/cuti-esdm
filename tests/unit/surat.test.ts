import { describe, expect, it } from "vitest";
import { terbilang } from "@/lib/domain/terbilang";
import { htmlLembar } from "@/lib/surat/lembar";
import { BLOK_IDENTITAS, formatNomor, formatTanggalSurat, hitungBlokIdentitas, isiPlaceholder, rapikanTembusan, tampilkanIsi } from "@/lib/surat/render";
import { sanitasiIsiSurat } from "@/server/surat/sanitasi";

describe("terbilang", () => {
  it.each([
    [1, "satu"],
    [3, "tiga"],
    [8, "delapan"],
    [11, "sebelas"],
    [12, "dua belas"],
    [20, "dua puluh"],
    [24, "dua puluh empat"],
    [90, "sembilan puluh"],
    [100, "seratus"],
    [115, "seratus lima belas"],
    [365, "tiga ratus enam puluh lima"],
    [1095, "seribu sembilan puluh lima"],
  ])("%i → %s", (n, s) => {
    expect(terbilang(n)).toBe(s);
  });
});

describe("render template", () => {
  const identitas = { nama: "Contoh <Nama>", nip: "19800326 200803 1 002", pangkat: "Pembina – IV/a", jabatan: "Kepala Seksi X", satuanOrganisasi: "Dinas ESDM" };

  it("mengisi placeholder dan meng-escape nilai", () => {
    expect(isiPlaceholder("<p>Selama {{jumlah_hari}} ({{jumlah_hari_terbilang}}) hari, a.n. {{nama}}</p>", { jumlah_hari: "8", jumlah_hari_terbilang: "delapan", nama: "A & B" })).toBe(
      "<p>Selama 8 (delapan) hari, a.n. A &amp; B</p>",
    );
  });

  it("blok identitas menjadi penanda, lalu tabel dari data kepegawaian saat ditampilkan", () => {
    const tersimpan = isiPlaceholder("<p>a</p>{{blok_identitas}}<p>b</p>", {});
    expect(tersimpan).toBe(`<p>a</p>${BLOK_IDENTITAS}<p>b</p>`);
    const tampil = tampilkanIsi(tersimpan, identitas);
    expect(tampil).toContain("<td>NIP</td><td>:</td><td>19800326 200803 1 002</td>");
    expect(tampil).toContain("Contoh &lt;Nama&gt;");
  });

  it("tembusan: placeholder diisi, kosong & duplikat dibuang", () => {
    expect(
      rapikanTembusan(["Kepala BKD", "Sekretaris Dinas ESDM Prov. Kalsel", "{{kepala_bidang_pemohon}}", "{{atasan_langsung_jabatan}}"], {
        kepala_bidang_pemohon: "Sekretaris Dinas ESDM Prov. Kalsel",
        atasan_langsung_jabatan: "",
      }),
    ).toEqual(["Kepala BKD", "Sekretaris Dinas ESDM Prov. Kalsel"]);
  });

  it("format nomor surat sesuai contoh 800.1.11.4/…/DESDM/2026", () => {
    const f = "{klasifikasi}/{urut}/DESDM/{tahun}";
    expect(formatNomor(f, { klasifikasi: "800.1.11.4", urut: 123, tahun: 2026, kodeInstansi: "DESDM" })).toBe("800.1.11.4/123/DESDM/2026");
    expect(formatNomor(f, { klasifikasi: "800.1.11.4", urut: null, tahun: 2026, kodeInstansi: "DESDM" })).toBe("800.1.11.4/       /DESDM/2026");
  });
});

describe("isian terkunci", () => {
  const identitas = { nama: "Contoh", nip: "19800326 200803 1 002", pangkat: "Pembina – IV/a", jabatan: "Kepala Seksi X", satuanOrganisasi: "Dinas ESDM" };

  it("data sistem menjadi isian terkunci, lalu diisi saat ditampilkan", () => {
    const draf = isiPlaceholder("<p>a.n. {{nama}} selama {{jumlah_hari}} hari karena {{alasan}}</p>", { alasan: "urusan keluarga" }, { kunciData: true });
    expect(draf).toBe('<p>a.n. <span data-isian="nama"></span> selama <span data-isian="jumlah_hari"></span> hari karena urusan keluarga</p>');
    expect(tampilkanIsi(draf, identitas, { nama: "A & B", jumlah_hari: "8" })).toBe("<p>a.n. A &amp; B selama 8 hari karena urusan keluarga</p>");
  });

  it("teks yang disisipkan ke dalam isian terkunci diabaikan", () => {
    expect(tampilkanIsi('<p><span data-isian="nip">999</span></p>', identitas, { nip: "1980" })).toBe("<p>1980</p>");
  });

  it("menghitung blok identitas", () => {
    expect(hitungBlokIdentitas(`<p>x</p>${BLOK_IDENTITAS}`)).toBe(1);
    expect(hitungBlokIdentitas("<p>x</p>")).toBe(0);
  });
});

describe("sanitasi isi surat", () => {
  it("membuang skrip, atribut berbahaya, dan gaya selain rata teks", () => {
    const kotor = `<p style="text-align: center; color: red" onclick="x()">Halo<script>alert(1)</script></p><img src=x onerror=alert(1)><a href="javascript:alert(1)">tautan</a>`;
    expect(sanitasiIsiSurat(kotor)).toBe('<p style="text-align:center">Halo</p>tautan');
  });

  it("mempertahankan blok identitas, isian terkunci, daftar, dan tabel isian", () => {
    const html = `<p><strong>a</strong> <em>b</em> <u>c</u></p><div data-blok="identitas">palsu</div><p><span data-isian="nama">diubah</span></p><ol><li><p>x</p></li></ol><table class="tabel-isian lain"><tbody><tr><td colspan="2">y</td></tr></tbody></table>`;
    expect(sanitasiIsiSurat(html)).toBe(
      `<p><strong>a</strong> <em>b</em> <u>c</u></p><div data-blok="identitas"></div><p><span data-isian="nama"></span></p><ol><li><p>x</p></li></ol><table class="tabel-isian"><tbody><tr><td colspan="2">y</td></tr></tbody></table>`,
    );
  });

  it("div lain menjadi paragraf, isian dengan kunci tak dikenal dibuang atributnya", () => {
    expect(sanitasiIsiSurat('<div data-blok="lain">z</div><span data-isian="alamat">q</span>')).toBe("<p>z</p>q");
  });
});

describe("format seperti surat fisik", () => {
  it("tanggal surat: hari bisa dikosongkan untuk diisi tangan", () => {
    expect(formatTanggalSurat("2026-06-15", false)).toBe("15 Juni 2026");
    expect(formatTanggalSurat("2026-06-15", true)).toBe(`${" ".repeat(8)}Juni 2026`);
  });

  it("jabatan penanda tangan dua baris; Nota Dinas Gubernur huruf kapital", () => {
    const ttd = { awalan: "Plt.", jabatanTeks: "Kepala Dinas Energi dan Sumber Daya Mineral Provinsi Kalimantan Selatan", nama: "Nama, S.T.", pangkat: "Pembina", nip: "19780901 200501 1 007" };
    const dasar = { kop: { pemerintah: "", nama: "", alamat: "", kodePos: "", telepon: "", fax: "", email: "", website: "" }, logoSrc: "", kota: "Banjarbaru", tanggal: "", nomor: "", sifat: null, lampiran: null, hal: "Hal", tujuanHtml: "", isiHtml: "", penandatangan: ttd, tembusan: [], disposisi: [] };
    expect(htmlLembar({ ...dasar, tataLetak: "SURAT" })).toContain("Plt. Kepala Dinas Energi dan Sumber Daya Mineral<br>Provinsi Kalimantan Selatan");
    const nd = htmlLembar({ ...dasar, tataLetak: "NOTA_DINAS", ttdKapital: true });
    expect(nd).toContain("PLT. KEPALA DINAS ENERGI DAN SUMBER DAYA MINERAL<br>PROVINSI KALIMANTAN SELATAN");
    expect(nd).toContain(">NAMA, S.T.<");
  });
});
