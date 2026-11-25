import { createSign, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, PENANDA_TANPA_PASSWORD, punyaPassword } from "@/lib/password";
import { tujuanAman } from "@/lib/validasi/auth";

// ─── Tiruan State In-Memory & Mock Dependencies ───
class RedirectStop extends Error {
  constructor(public tujuan: string) {
    super(`NEXT_REDIRECT:${tujuan}`);
  }
}

const cookieStore = new Map<string, string>();
let sesiAktifId = "sesi-aktif-1";
let penggunaMock: {
  userId: string;
  sesiId: string;
  loginId: string;
  googleEmail: string | null;
  wajibGantiPassword: boolean;
  peran: ReadonlySet<string>;
  hakAkses: ReadonlySet<string>;
  pegawai: null;
} | null = null;

interface PegawaiRow {
  id: string;
  nip: string | null;
  idNonAsn: string | null;
  nik: string | null;
  email: string | null;
  nama: string;
  aktif: boolean;
  atasanLangsungId: string | null;
}

interface UserRow {
  id: string;
  loginId: string;
  pegawaiId: string | null;
  passwordHash: string;
  googleSub: string | null;
  googleEmail: string | null;
  aktif: boolean;
  gagalBerturut: number;
  terkunciSampai: Date | null;
  wajibGantiPassword: boolean;
  terakhirLogin: Date | null;
  peran: { peran: "ADMIN" | "KEPEGAWAIAN" }[];
  hakAkses?: { hakAkses: string }[];
}

const dbState = {
  pegawai: [] as PegawaiRow[],
  users: [] as UserRow[],
  kodeAktivasi: [] as { id: string; pegawaiId: string; kodeHash: string; dipakaiPada: Date | null; kedaluwarsaPada: Date }[],
  sesi: [] as { id: string; userId: string }[],
  logLogin: [] as { loginIdDicoba: string; berhasil: boolean; alasan: string | null; userId: string | null; ip?: string | null; waktu?: Date }[],
  auditLog: [] as { aksi: string; entitasId: string | null }[],
};

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectStop(url);
  }),
  revalidatePath: vi.fn(),
  cookies: vi.fn(async () => ({
    get: (k: string) => (cookieStore.has(k) ? { value: cookieStore.get(k)! } : undefined),
    set: (k: string, v: string) => {
      cookieStore.set(k, v);
    },
    delete: (k: string) => {
      cookieStore.delete(k);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }));

vi.mock("@/server/auth/sesi", () => ({
  buatSesi: vi.fn(async (userId: string) => {
    dbState.sesi.push({ id: `sesi-${Date.now()}-${Math.random()}`, userId });
  }),
  hapusSesi: vi.fn(async () => {
    dbState.sesi = dbState.sesi.filter((s) => s.id !== sesiAktifId);
  }),
  hapusSesiLain: vi.fn(async (userId: string, kecualiId?: string) => {
    dbState.sesi = dbState.sesi.filter((s) => s.userId !== userId || (kecualiId ? s.id === kecualiId : false));
  }),
}));

vi.mock("@/server/auth/pengguna", () => ({
  penggunaSaatIni: vi.fn(async () => penggunaMock),
  wajibLogin: vi.fn(async () => {
    if (!penggunaMock) throw new RedirectStop("/login");
    return penggunaMock;
  }),
  adalahSuperadmin: (u: { peran: ReadonlySet<string>; loginId: string; googleEmail?: string | null }) =>
    u.peran.has("SUPERADMIN") || u.loginId.toLowerCase() === "admin" || u.googleEmail?.toLowerCase() === "eerza311@gmail.com",
  punyaPeran: (u: { peran: ReadonlySet<string> }, ...p: string[]) => p.some((x) => u.peran.has(x)),
  punyaHakAkses: (u: { peran: ReadonlySet<string>; hakAkses: ReadonlySet<string> }, ...h: string[]) =>
    u.peran.has("SUPERADMIN") || h.some((x) => u.hakAkses.has(x)),
}));

vi.mock("@/server/db", () => {
  const lampirPegawai = (u: UserRow | undefined) => {
    if (!u) return null;
    const p = dbState.pegawai.find((x) => x.id === u.pegawaiId);
    return { ...u, hakAkses: u.hakAkses ?? [], pegawai: p ? { aktif: p.aktif } : null };
  };
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    user: {
      findUnique: async ({ where }: { where: { id?: string; googleSub?: string } }) =>
        lampirPegawai(dbState.users.find((u) => (where.id ? u.id === where.id : where.googleSub ? u.googleSub === where.googleSub : false))),
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const u = dbState.users.find((x) => x.id === where.id);
        if (!u) throw new Error("User tidak ada");
        return u;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if ("OR" in where && Array.isArray(where.OR)) {
          return dbState.users.find((u) => u.loginId.toLowerCase() === "admin" || u.googleEmail?.toLowerCase() === "eerza311@gmail.com") ?? null;
        }
        const eq = (where.loginId as { equals?: string } | undefined)?.equals?.toLowerCase();
        return dbState.users.find((u) => u.loginId.toLowerCase() === eq) ?? null;
      },
      create: async ({ data }: { data: { loginId: string; pegawaiId: string; passwordHash: string; googleSub?: string; googleEmail?: string } }) => {
        const u: UserRow = {
          id: `user-${dbState.users.length + 1}`,
          loginId: data.loginId,
          pegawaiId: data.pegawaiId,
          passwordHash: data.passwordHash,
          googleSub: data.googleSub ?? null,
          googleEmail: data.googleEmail ?? null,
          aktif: true,
          gagalBerturut: 0,
          terkunciSampai: null,
          wajibGantiPassword: false,
          terakhirLogin: null,
          peran: [],
        };
        dbState.users.push(u);
        return u;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
        const u = dbState.users.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return u;
      },
    },
    pegawai: {
      findFirst: async ({ where }: { where: { nip?: string; idNonAsn?: { equals: string }; aktif?: boolean } }) => {
        const p = dbState.pegawai.find((x) => {
          if (where.aktif && !x.aktif) return false;
          if (where.nip) return x.nip === where.nip;
          if (where.idNonAsn) return x.idNonAsn?.toLowerCase() === where.idNonAsn.equals.toLowerCase();
          return false;
        });
        if (!p) return null;
        return {
          ...p,
          user: dbState.users.find((u) => u.pegawaiId === p.id) ?? null,
          kodeAktivasi: dbState.kodeAktivasi.filter((k) => k.pegawaiId === p.id && !k.dipakaiPada && k.kedaluwarsaPada > new Date()),
        };
      },
    },
    kodeAktivasi: {
      update: async ({ where, data }: { where: { id: string }; data: { dipakaiPada: Date } }) => {
        const k = dbState.kodeAktivasi.find((x) => x.id === where.id);
        if (k) k.dipakaiPada = data.dipakaiPada;
      },
    },
    logLogin: {
      count: async ({ where }: { where: { loginIdDicoba?: string; berhasil?: boolean; ip?: string; alasan?: { not?: string }; waktu?: { gt?: Date } } }) =>
        dbState.logLogin.filter((l) => {
          if (where.loginIdDicoba && l.loginIdDicoba !== where.loginIdDicoba) return false;
          if (where.berhasil !== undefined && l.berhasil !== where.berhasil) return false;
          if (where.ip && l.ip !== where.ip) return false;
          if (where.alasan?.not && l.alasan === where.alasan.not) return false;
          if (where.waktu?.gt && (l.waktu ?? new Date()) <= where.waktu.gt) return false;
          return true;
        }).length,
      create: async ({ data }: { data: { loginIdDicoba: string; berhasil: boolean; alasan: string | null; userId: string | null; ip?: string | null } }) => {
        dbState.logLogin.push({ ...data, waktu: new Date() });
      },
    },
    userPeran: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        const u = dbState.users.find((x) => x.id === where.userId);
        if (u) u.peran = [];
      },
      createMany: async ({ data }: { data: { userId: string; peran: "ADMIN" | "KEPEGAWAIAN" }[] }) => {
        for (const d of data) {
          const u = dbState.users.find((x) => x.id === d.userId);
          if (u) u.peran.push({ peran: d.peran });
        }
      },
    },
    userHakAkses: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        const u = dbState.users.find((x) => x.id === where.userId);
        if (u) u.hakAkses = [];
      },
      createMany: async ({ data }: { data: { userId: string; hakAkses: string }[] }) => {
        for (const d of data) {
          const u = dbState.users.find((x) => x.id === d.userId);
          if (u) {
            u.hakAkses ??= [];
            u.hakAkses.push({ hakAkses: d.hakAkses });
          }
        }
      },
    },
    auditLog: {
      create: async ({ data }: { data: { aksi: string; entitasId?: string | null } }) => {
        dbState.auditLog.push({ aksi: data.aksi, entitasId: data.entitasId ?? null });
      },
    },
  };
  return {
    db: {
      ...tx,
      $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
    },
  };
});

import { GET as googleCallbackGet } from "@/app/api/auth/google/callback/route";
import { GET as googleStartGet } from "@/app/api/auth/google/route";
import { aturAktifAkun, aturHakAkses, aturPeran, resetPassword } from "@/server/aksi/akun";
import { aktivasiDenganGoogle, aturPasswordBaru, hubungkanGoogleAkunLama, keluar, masuk, pulihkanDenganGoogle, putuskanGoogle } from "@/server/aksi/auth";
import { asalSah } from "@/server/auth/csrf";
import { simpanIdentitasTertunda } from "@/server/auth/google";

// Kunci RSA uji untuk menandatangani id_token tiruan & memverifikasi JWS RS256.
const { privateKey: rsaPrivat, publicKey: rsaPublik } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwkPublik = { ...(rsaPublik.export({ format: "jwk" }) as Record<string, unknown>), kid: "kunci-uji-1", alg: "RS256", use: "sig" };

function buatJwtGoogle(payload: object, kid = "kunci-uji-1", kunciTanda = rsaPrivat): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString("base64url");
  const isi = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createSign("RSA-SHA256").update(`${header}.${isi}`).sign(kunciTanda, "base64url");
  return `${header}.${isi}.${sig}`;
}

function stubFetchGoogle(payloadFn: () => object, buatToken = (p: object) => buatJwtGoogle(p)) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/certs")) {
        return { ok: true, json: async () => ({ keys: [jwkPublik] }) };
      }
      return { ok: true, json: async () => ({ id_token: buatToken(payloadFn()) }) };
    }),
  );
}

// ─── Data Pegawai & Akun Google Dummy untuk Pengujian ───
const DUMMY_BELUM_AKTIF = {
  id: "11111111-1111-4111-8111-111111111111",
  nip: "199206062019031907",
  idNonAsn: null,
  nik: "9999000000000907",
  email: "pegawai.aktivasi.dummy@gmail.com",
  nama: "Pegawai Dummy Aktivasi",
  aktif: true,
  atasanLangsungId: null,
};

const DUMMY_GOOGLE_ONLY = {
  id: "22222222-2222-4222-8222-222222222222",
  nip: "199405102020121908",
  idNonAsn: null,
  nik: "9999000000000908",
  email: "pegawai.google.dummy@gmail.com",
  nama: "Pegawai Dummy Google",
  aktif: true,
  atasanLangsungId: null,
};

const DUMMY_AKTIF_LAMA = {
  id: "33333333-3333-4333-8333-333333333333",
  nip: "199002202015031905",
  idNonAsn: null,
  nik: "9999000000000905",
  email: "pegawai.lama.dummy@gmail.com",
  nama: "Pegawai Dummy Lama",
  aktif: true,
  atasanLangsungId: null,
};

const USER_SUPERADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ADMIN_BIASA_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_GOOGLE_ONLY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_AKTIF_LAMA_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function buatFormData(isi: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(isi)) fd.set(k, v);
  return fd;
}

describe("Keamanan Login, Sign Up, Akun Google & Anti-Eskalasi", () => {
  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = "dummy-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "dummy-client-secret-rahasia-uji-32byte";
    process.env.APP_URL = "http://localhost:3000";

    cookieStore.clear();
    penggunaMock = null;
    sesiAktifId = "sesi-aktif-1";
    dbState.kodeAktivasi = [];
    dbState.logLogin = [];
    dbState.auditLog = [];
    dbState.pegawai = [{ ...DUMMY_BELUM_AKTIF }, { ...DUMMY_GOOGLE_ONLY }, { ...DUMMY_AKTIF_LAMA }];

    const hashBiasa = await hashPassword("Rahasia123");
    dbState.users = [
      {
        id: USER_SUPERADMIN_ID,
        loginId: "admin",
        pegawaiId: null,
        passwordHash: hashBiasa,
        googleSub: "sub-superadmin",
        googleEmail: "eerza311@gmail.com",
        aktif: true,
        gagalBerturut: 0,
        terkunciSampai: null,
        wajibGantiPassword: false,
        terakhirLogin: null,
        peran: [{ peran: "ADMIN" }],
      },
      {
        id: USER_ADMIN_BIASA_ID,
        loginId: "198205122006042902",
        pegawaiId: null,
        passwordHash: hashBiasa,
        googleSub: null,
        googleEmail: null,
        aktif: true,
        gagalBerturut: 0,
        terkunciSampai: null,
        wajibGantiPassword: false,
        terakhirLogin: null,
        peran: [{ peran: "ADMIN" }],
      },
      {
        id: USER_GOOGLE_ONLY_ID,
        loginId: DUMMY_GOOGLE_ONLY.nip,
        pegawaiId: DUMMY_GOOGLE_ONLY.id,
        passwordHash: PENANDA_TANPA_PASSWORD,
        googleSub: "dummy-google-sub-199405102020121908",
        googleEmail: DUMMY_GOOGLE_ONLY.email,
        aktif: true,
        gagalBerturut: 0,
        terkunciSampai: null,
        wajibGantiPassword: false,
        terakhirLogin: null,
        peran: [],
      },
      {
        id: USER_AKTIF_LAMA_ID,
        loginId: DUMMY_AKTIF_LAMA.nip,
        pegawaiId: DUMMY_AKTIF_LAMA.id,
        passwordHash: hashBiasa,
        googleSub: null,
        googleEmail: null,
        aktif: true,
        gagalBerturut: 0,
        terkunciSampai: null,
        wajibGantiPassword: false,
        terakhirLogin: null,
        peran: [],
      },
    ];
    dbState.sesi = [
      { id: "sesi-aktif-1", userId: USER_GOOGLE_ONLY_ID },
      { id: "sesi-perangkat-lain", userId: USER_GOOGLE_ONLY_ID },
      { id: "sesi-lama-lain", userId: USER_AKTIF_LAMA_ID },
    ];
  });

  it("1a. Daftar dengan Google menolak Gmail penyerang meski NIP & NIK benar, dan mengizinkan email yang cocok", async () => {
    // Skenario serangan: NIP + NIK benar, tapi email Gmail berbeda
    await simpanIdentitasTertunda({ sub: "sub-penyerang", email: "penyerang@gmail.com" });
    const gagalEmail = await aktivasiDenganGoogle(
      {},
      buatFormData({ loginId: DUMMY_BELUM_AKTIF.nip, verifikasi: DUMMY_BELUM_AKTIF.nik }),
    );
    expect(gagalEmail.galat).toContain("Aktivasi gagal");
    expect(dbState.users.some((u) => u.loginId === DUMMY_BELUM_AKTIF.nip)).toBe(false);

    // Skenario sah: memakai akun Google dummy dengan email sama dengan data pegawai
    await simpanIdentitasTertunda({ sub: "sub-dummy-aktivasi", email: DUMMY_BELUM_AKTIF.email });
    await expect(
      aktivasiDenganGoogle({}, buatFormData({ loginId: DUMMY_BELUM_AKTIF.nip, verifikasi: DUMMY_BELUM_AKTIF.nik })),
    ).rejects.toThrow("NEXT_REDIRECT:/beranda");

    const baru = dbState.users.find((u) => u.loginId === DUMMY_BELUM_AKTIF.nip);
    expect(baru?.googleEmail).toBe(DUMMY_BELUM_AKTIF.email);
    expect(baru?.passwordHash).toBe(PENANDA_TANPA_PASSWORD);
  });

  it("1b. Lupa password via Google menolak Gmail sembarang atau saat email pegawai kosong, dan menutup sesi lama bila valid", async () => {
    // Serangan 1: email pegawai kosong
    dbState.pegawai[2].email = null;
    await simpanIdentitasTertunda({ sub: "sub-penyerang-1", email: "penyerang@gmail.com" });
    const tolakKosong = await pulihkanDenganGoogle(
      {},
      buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, verifikasi: DUMMY_AKTIF_LAMA.nik }),
    );
    expect(tolakKosong.galat).toContain("Verifikasi gagal");

    // Serangan 2: email pegawai ada, tapi penyerang memakai Gmail lain
    dbState.pegawai[2].email = DUMMY_AKTIF_LAMA.email;
    const tolakBeda = await pulihkanDenganGoogle(
      {},
      buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, verifikasi: DUMMY_AKTIF_LAMA.nik }),
    );
    expect(tolakBeda.galat).toContain("Verifikasi gagal");

    // Pemulihan sah: NIP + NIK + email Google cocok
    await simpanIdentitasTertunda({ sub: "sub-pemilik-lama", email: DUMMY_AKTIF_LAMA.email });
    await expect(
      pulihkanDenganGoogle({}, buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, verifikasi: DUMMY_AKTIF_LAMA.nik })),
    ).rejects.toThrow("NEXT_REDIRECT:/profil?atur=1");

    // Sesi lama di perangkat lain harus dihapus dan Google tertaut
    expect(dbState.sesi.some((s) => s.id === "sesi-lama-lain")).toBe(false);
    expect(dbState.users.find((u) => u.id === USER_AKTIF_LAMA_ID)?.googleSub).toBe("sub-pemilik-lama");
  });

  it("2. Akun Google-only dummy tidak bisa Putuskan Google sebelum membuat password, lalu bisa login NIP + password setelah membuat password", async () => {
    penggunaMock = {
      userId: USER_GOOGLE_ONLY_ID,
      sesiId: sesiAktifId,
      loginId: DUMMY_GOOGLE_ONLY.nip,
      googleEmail: DUMMY_GOOGLE_ONLY.email,
      wajibGantiPassword: false,
      peran: new Set(["PEGAWAI"]),
      hakAkses: new Set(),
      pegawai: null,
    };

    expect(punyaPassword(PENANDA_TANPA_PASSWORD)).toBe(false);

    // Putuskan Google wajib ditolak sebelum membuat password
    const gagalPutus = await putuskanGoogle({}, buatFormData({ password: "PasswordBaru123" }));
    expect(gagalPutus.galat).toContain("Buat password baru terlebih dahulu");
    expect(dbState.users.find((u) => u.id === USER_GOOGLE_ONLY_ID)?.googleSub).toBe("dummy-google-sub-199405102020121908");

    // Buat password pertama lewat aturPasswordBaru (tanpa password lama)
    const simpanPw = await aturPasswordBaru({}, buatFormData({ password: "PasswordBaru123", konfirmasi: "PasswordBaru123" }));
    expect(simpanPw.sukses).toContain("Password tersimpan");
    const updatedUser = dbState.users.find((u) => u.id === USER_GOOGLE_ONLY_ID)!;
    expect(punyaPassword(updatedUser.passwordHash)).toBe(true);
    // Sesi perangkat lain ikut dikeluarkan saat buat password
    expect(dbState.sesi.some((s) => s.id === "sesi-perangkat-lain")).toBe(false);

    // Uji login pakai NIP + password baru
    await expect(
      masuk({}, buatFormData({ loginId: DUMMY_GOOGLE_ONLY.nip, password: "PasswordBaru123" })),
    ).rejects.toThrow("NEXT_REDIRECT:/beranda");

    // Putuskan Google menolak password salah, lalu berhasil jika password benar
    const pwSalah = await putuskanGoogle({}, buatFormData({ password: "SalahPassword1" }));
    expect(pwSalah.galatField?.password).toBe("Password salah.");

    await expect(
      putuskanGoogle({}, buatFormData({ password: "PasswordBaru123" })),
    ).rejects.toThrow("NEXT_REDIRECT:/profil?google=diputus");
    expect(dbState.users.find((u) => u.id === USER_GOOGLE_ONLY_ID)?.googleSub).toBeNull();
  });

  it("3. Pemegang PENGATURAN_ADMIN tidak bisa menindak Superadmin/Admin lain atau mengatur hak akses, tetapi Superadmin membersihkan peran lama saat aturHakAkses", async () => {
    // Sub-admin / pemegang hak PENGATURAN_ADMIN (non-Superadmin)
    penggunaMock = {
      userId: USER_ADMIN_BIASA_ID,
      sesiId: sesiAktifId,
      loginId: "198205122006042902",
      googleEmail: null,
      wajibGantiPassword: false,
      peran: new Set(["PEGAWAI"]),
      hakAkses: new Set(["PENGATURAN_ADMIN"]),
      pegawai: null,
    };

    // Tidak boleh mereset password Superadmin
    const tolakReset = await resetPassword(USER_SUPERADMIN_ID);
    expect(tolakReset.galat).toContain("Superadmin dilindungi");

    // Tidak boleh mengatur hak akses atau peran (khusus Superadmin)
    const tolakHak = await aturHakAkses(USER_AKTIF_LAMA_ID, ["PENGATURAN_ADMIN"]);
    expect(tolakHak.galat).toContain("Superadmin");
    const tolakPeran = await aturPeran(USER_AKTIF_LAMA_ID, ["ADMIN"]);
    expect(tolakPeran.galat).toContain("Superadmin");

    // Boleh membantu mereset password pegawai biasa
    const suksesResetPegawai = await resetPassword(USER_AKTIF_LAMA_ID);
    expect(suksesResetPegawai.rahasia).toBeTruthy();

    // Tidak boleh menonaktifkan sesama pemegang PENGATURAN_ADMIN
    const targetAdminLain = dbState.users.find((u) => u.id === USER_AKTIF_LAMA_ID)!;
    targetAdminLain.hakAkses = [{ hakAkses: "PENGATURAN_ADMIN" }];
    const tolakNonaktifAdmin = await aturAktifAkun(USER_AKTIF_LAMA_ID, false);
    expect(tolakNonaktifAdmin.galat).toContain("Superadmin");

    // Pegawai biasa tanpa PENGATURAN_ADMIN ditolak mereset password siapa pun
    penggunaMock.hakAkses = new Set();
    const tolakPegawaiBiasa = await resetPassword(USER_AKTIF_LAMA_ID);
    expect(tolakPegawaiBiasa.galat).toBe("Hanya Admin yang bisa mereset password.");

    // Superadmin menyimpan PENGATURAN_ADMIN saja: membersihkan peran lama ADMIN/KEPEGAWAIAN agar tidak bocor
    penggunaMock = {
      userId: USER_SUPERADMIN_ID,
      sesiId: sesiAktifId,
      loginId: "admin",
      googleEmail: "eerza311@gmail.com",
      wajibGantiPassword: false,
      peran: new Set(["SUPERADMIN"]),
      hakAkses: new Set(["KELOLA_SALDO_CUTI", "PROSES_CUTI", "KELOLA_PEGAWAI", "KELOLA_DOKUMEN_ORGANISASI", "PENGATURAN_ADMIN"]),
      pegawai: null,
    };
    targetAdminLain.peran = [{ peran: "ADMIN" }, { peran: "KEPEGAWAIAN" }];
    const simpanHak = await aturHakAkses(USER_AKTIF_LAMA_ID, ["PENGATURAN_ADMIN"]);
    expect(simpanHak.pesan).toContain("disimpan");
    expect(targetAdminLain.peran).toEqual([]);
    expect(targetAdminLain.hakAkses).toEqual([{ hakAkses: "PENGATURAN_ADMIN" }]);
  });

  it("3b. Akun dengan wajibGantiPassword ditolak menautkan Google (mode=hubungkan)", async () => {
    penggunaMock = {
      userId: USER_AKTIF_LAMA_ID,
      sesiId: sesiAktifId,
      loginId: "198501012010011901",
      googleEmail: null,
      wajibGantiPassword: true,
      peran: new Set(["PEGAWAI"]),
      hakAkses: new Set(),
      pegawai: null,
    };

    await expect(
      googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=hubungkan")),
    ).rejects.toThrow("NEXT_REDIRECT:/profil?wajib=1");
  });

  it("4. State OAuth mode=hubungkan terikat ke sesi user dan tidak boleh menimpa Google yang sudah terhubung", async () => {
    // Pengguna Google-only memulai mode=hubungkan dengan sesi 1
    penggunaMock = {
      userId: USER_GOOGLE_ONLY_ID,
      sesiId: "sesi-1",
      loginId: DUMMY_GOOGLE_ONLY.nip,
      googleEmail: DUMMY_GOOGLE_ONLY.email,
      wajibGantiPassword: false,
      peran: new Set(["PEGAWAI"]),
      hakAkses: new Set(),
      pegawai: null,
    };

    let urlOauth = "";
    try {
      await googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=hubungkan"));
    } catch (e) {
      if (e instanceof RedirectStop) urlOauth = e.tujuan;
    }
    const state = new URL(urlOauth).searchParams.get("state")!;
    expect(state).toBeTruthy();

    // Simulasi sesi berganti ke user lain sebelum callback tiba
    penggunaMock = { ...penggunaMock, userId: USER_AKTIF_LAMA_ID, sesiId: "sesi-2" };
    stubFetchGoogle(() => ({
      iss: "https://accounts.google.com",
      aud: "dummy-client-id",
      exp: Math.floor(Date.now() / 1000) + 600,
      nonce: new URL(urlOauth).searchParams.get("nonce"),
      sub: "sub-baru-lain",
      email: "lain@gmail.com",
      email_verified: true,
    }));

    await expect(
      googleCallbackGet(new Request(`http://localhost:3000/api/auth/google/callback?code=kode&state=${state}`)),
    ).rejects.toThrow("NEXT_REDIRECT:/profil?google=sesi-berubah");

    // Uji 4b: Pengguna yang sama & sesi sama mencoba menimpa googleSub yang sudah ada via callback langsung -> ditolak
    let urlOauth2 = "";
    penggunaMock = { ...penggunaMock, userId: USER_GOOGLE_ONLY_ID, sesiId: "sesi-aktif-1" };
    try {
      await googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=hubungkan"));
    } catch (e) {
      if (e instanceof RedirectStop) urlOauth2 = e.tujuan;
    }
    const state2 = new URL(urlOauth2).searchParams.get("state")!;
    stubFetchGoogle(() => ({
      iss: "https://accounts.google.com",
      aud: "dummy-client-id",
      exp: Math.floor(Date.now() / 1000) + 600,
      nonce: new URL(urlOauth2).searchParams.get("nonce"),
      sub: "sub-google-pengganti",
      email: "pengganti@gmail.com",
      email_verified: true,
    }));
    await expect(
      googleCallbackGet(new Request(`http://localhost:3000/api/auth/google/callback?code=kode2&state=${state2}`)),
    ).rejects.toThrow("NEXT_REDIRECT:/profil?google=sudah-terhubung");

    // Uji 4c: Token id_token dengan tanda tangan palsu ditolak
    let urlPalsu = "";
    try {
      await googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=masuk"));
    } catch (e) {
      if (e instanceof RedirectStop) urlPalsu = e.tujuan;
    }
    const statePalsu = new URL(urlPalsu).searchParams.get("state")!;
    const { privateKey: kunciPalsu } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    stubFetchGoogle(
      () => ({
        iss: "https://accounts.google.com",
        aud: "dummy-client-id",
        exp: Math.floor(Date.now() / 1000) + 600,
        nonce: new URL(urlPalsu).searchParams.get("nonce"),
        sub: "dummy-google-sub-199405102020121908",
        email: DUMMY_GOOGLE_ONLY.email,
        email_verified: true,
      }),
      (p) => buatJwtGoogle(p, "kunci-uji-1", kunciPalsu),
    );
    await expect(
      googleCallbackGet(new Request(`http://localhost:3000/api/auth/google/callback?code=kode-palsu&state=${statePalsu}`)),
    ).rejects.toThrow("NEXT_REDIRECT:/login?google=gagal");

    // Uji 4d: Masuk dengan Google memakai akun dummy (googleDummy) yang bertanda tangan sah berhasil ke /beranda
    let urlMasuk = "";
    try {
      await googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=masuk"));
    } catch (e) {
      if (e instanceof RedirectStop) urlMasuk = e.tujuan;
    }
    const stateMasuk = new URL(urlMasuk).searchParams.get("state")!;
    stubFetchGoogle(() => ({
      iss: "https://accounts.google.com",
      aud: "dummy-client-id",
      exp: Math.floor(Date.now() / 1000) + 600,
      nonce: new URL(urlMasuk).searchParams.get("nonce"),
      sub: "dummy-google-sub-199405102020121908",
      email: DUMMY_GOOGLE_ONLY.email,
      email_verified: true,
    }));
    await expect(
      googleCallbackGet(new Request(`http://localhost:3000/api/auth/google/callback?code=kode3&state=${stateMasuk}`)),
    ).rejects.toThrow("NEXT_REDIRECT:/beranda");

    // Juga uji hubungkanGoogleAkunLama menolak bila akun sudah terhubung Google lain
    await simpanIdentitasTertunda({ sub: "sub-baru-lagi", email: "baru@gmail.com" });
    dbState.users[3].googleSub = "sub-sudah-ada";
    const tolakTimpa = await hubungkanGoogleAkunLama(
      {},
      buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, password: "Rahasia123" }),
    );
    expect(tolakTimpa.galat).toContain("sudah terhubung ke akun Google lain");
    vi.unstubAllGlobals();
  });

  it("5. Batas salah password 5x (pesan seragam 1-4, kunci di ke-5) dan batas salah NIK 5x per jam", async () => {
    // Salah password 1-4 kali selalu menampilkan pesan umum yang sama (cegah enumerasi sebelum terkunci)
    for (let i = 1; i <= 4; i++) {
      const h = await masuk({}, buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, password: `Salah${i}23` }));
      expect(h.galat).toBe("NIP/ID atau password salah.");
    }
    // Percobaan ke-5 mengunci akun 15 menit
    const ke5 = await masuk({}, buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, password: "Salah523" }));
    expect(ke5.galat).toContain("Akun dikunci 15 menit");

    // Salah NIK pada aktivasi/pemulihan: diperbolehkan hingga 5x dalam 1 jam, ke-6 diblokir
    for (let i = 1; i <= 5; i++) {
      await simpanIdentitasTertunda({ sub: `sub-${i}`, email: DUMMY_BELUM_AKTIF.email });
      const h = await aktivasiDenganGoogle({}, buatFormData({ loginId: DUMMY_BELUM_AKTIF.nip, verifikasi: `999900000000000${i}` }));
      expect(h.galat).toContain("Aktivasi gagal");
    }
    await simpanIdentitasTertunda({ sub: "sub-6", email: DUMMY_BELUM_AKTIF.email });
    const ke6 = await aktivasiDenganGoogle({}, buatFormData({ loginId: DUMMY_BELUM_AKTIF.nip, verifikasi: DUMMY_BELUM_AKTIF.nik }));
    expect(ke6.galat).toContain("Coba lagi 1 jam lagi");
  });

  it("6. Pegawai nonaktif ditolak login (password & Google), keluar() hapus cookie Google, serta cek CSRF & tujuanAman", async () => {
    dbState.pegawai[1].aktif = false; // googleDummy nonaktif
    dbState.pegawai[2].aktif = false; // aktifLama nonaktif

    const pwNonaktif = await masuk({}, buatFormData({ loginId: DUMMY_AKTIF_LAMA.nip, password: "Rahasia123" }));
    expect(pwNonaktif.galat).toBe("Akun tidak aktif. Hubungi Admin.");

    let urlMasuk = "";
    try {
      await googleStartGet(new Request("http://localhost:3000/api/auth/google?mode=masuk"));
    } catch (e) {
      if (e instanceof RedirectStop) urlMasuk = e.tujuan;
    }
    const stateMasuk = new URL(urlMasuk).searchParams.get("state")!;
    stubFetchGoogle(() => ({
      iss: "https://accounts.google.com",
      aud: "dummy-client-id",
      exp: Math.floor(Date.now() / 1000) + 600,
      nonce: new URL(urlMasuk).searchParams.get("nonce"),
      sub: "dummy-google-sub-199405102020121908",
      email: DUMMY_GOOGLE_ONLY.email,
      email_verified: true,
    }));
    await expect(
      googleCallbackGet(new Request(`http://localhost:3000/api/auth/google/callback?code=kode4&state=${stateMasuk}`)),
    ).rejects.toThrow("NEXT_REDIRECT:/login?google=nonaktif-akun");
    vi.unstubAllGlobals();

    // Logout membersihkan semua cookie sementara Google
    await simpanIdentitasTertunda({ sub: "s", email: "a@gmail.com" });
    cookieStore.set("g-alur", "isi");
    cookieStore.set("g-reset", "isi");
    penggunaMock = {
      userId: USER_GOOGLE_ONLY_ID,
      sesiId: sesiAktifId,
      loginId: DUMMY_GOOGLE_ONLY.nip,
      googleEmail: DUMMY_GOOGLE_ONLY.email,
      wajibGantiPassword: false,
      peran: new Set(["PEGAWAI"]),
      hakAkses: new Set(),
      pegawai: null,
    };
    await expect(keluar()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(cookieStore.has("g-tertunda")).toBe(false);
    expect(cookieStore.has("g-alur")).toBe(false);
    expect(cookieStore.has("g-reset")).toBe(false);

    // asalSah & tujuanAman
    expect(asalSah(new Request("http://localhost:3000/api/test", { headers: { origin: "https://jahat.example", host: "localhost:3000" } }))).toBe(false);
    expect(asalSah(new Request("http://localhost:3000/api/test", { headers: { origin: "http://localhost:3000", host: "localhost:3000" } }))).toBe(true);
    expect(tujuanAman("/\t//jahat.example")).toBe("/beranda");
    expect(tujuanAman("/cuti?tab=1")).toBe("/cuti?tab=1");
  });
});
