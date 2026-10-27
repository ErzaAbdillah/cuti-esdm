import { describe, expect, it } from "vitest";
import { atasNamaNota, halNotaDinas, htmlNotaDinas, type IsianNotaDinas, isiNotaDinas, namaJenisCuti, perluNotaDinas } from "@/lib/formulir/nota-dinas";

const nota: IsianNotaDinas = {
  kepada: "Sekretaris Daerah Provinsi Kalimantan Selatan",
  dari: "Plt. Kepala Dinas Energi dan Sumber Daya Mineral\nProvinsi Kalimantan Selatan",
  nomor: "800.1.11.4 /          / DESDM / 2026",
  tanggal: "2026-06-15",
  hariKosong: true,
  hal: "Permohonan Izin Cuti Tahunan",
  isi: "Paragraf <satu>\n\nParagraf dua",
  penandatangan: { jabatan: "Plt. Kepala Dinas\nProvinsi Kalimantan Selatan", nama: "Budi", pangkat: "Pembina", nip: "19780901 200501 1 007" },
  disposisi: ["Asisten Perekonomian dan Pembangunan", " ", "Sekretaris Daerah"],
};

describe("nota dinas cuti", () => {
  it("hanya untuk Eselon II & III", () => {
    expect(perluNotaDinas("ESELON_II")).toBe(true);
    expect(perluNotaDinas("ESELON_III")).toBe(true);
    expect(perluNotaDinas("ESELON_IV")).toBe(false);
    expect(perluNotaDinas("STAF")).toBe(false);
  });

  it("menyusun hal & isi seperti contoh", () => {
    const jenis = namaJenisCuti("TAHUNAN", "Tahunan");
    expect(halNotaDinas(jenis)).toBe("Permohonan Izin Cuti Tahunan");
    const isi = isiNotaDinas({
      namaJenis: jenis,
      atasNama: atasNamaNota("ESELON_III", { dari: "", nama: "H. Nazaruddin Alhaidar, ST, MT", nip: "19690604 199803 1 011" }),
      alasan: "Adanya urusan keluarga.",
      lamanya: "8 (delapan) hari kerja",
      mulai: "01 Juli 2026",
      selesai: "10 Juli 2026",
    });
    expect(isi).toBe(
      "Sehubungan dengan pengambilan Cuti Tahunan atas nama : H. Nazaruddin Alhaidar, ST, MT / NIP 19690604 199803 1 011 dikarenakan adanya urusan keluarga, maka bersama ini mohon izin cuti tahunan selama 8 (delapan) hari kerja sejak tanggal 01 Juli 2026 sampai dengan 10 Juli 2026.\n" +
        "Demikian permohonan izin cuti tahunan ini disampaikan, atas perhatiannya diucapkan terima kasih.",
    );
  });

  it("Eselon II atas nama jabatan; singkatan di awal alasan tidak dikecilkan", () => {
    expect(atasNamaNota("ESELON_II", { dari: "Kepala Dinas ESDM\nProvinsi Kalimantan Selatan", nama: "X", nip: "Y" })).toBe("Kepala Dinas ESDM Provinsi Kalimantan Selatan");
    expect(isiNotaDinas({ namaJenis: "Cuti Besar", atasNama: "A", alasan: "KKN", lamanya: "", mulai: "", selesai: "" })).toContain("dikarenakan KKN, maka bersama ini mohon izin cuti besar selama … sejak tanggal … sampai dengan ….");
  });

  it("lembar: teks di-escape, paragraf kosong & kolom disposisi kosong dibuang", () => {
    const html = htmlNotaDinas(nota, "ESELON_III");
    expect(html).toContain('class="lembar-nota e3"');
    expect(html).toContain("Paragraf &lt;satu&gt;");
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).toMatch(/<td>\s{8}Juni 2026<\/td>/);
    expect(html.match(/<td>Sekretaris Daerah<\/td>/g)).toHaveLength(1);
    expect(html.match(/<td><\/td>/g)).toHaveLength(2);
    expect(htmlNotaDinas({ ...nota, disposisi: [] }, "ESELON_II")).not.toContain("Disposisi Atasan");
  });
});
