/** Penyamaran data pribadi untuk tampilan bawaan (UU PDP: minimisasi data). */
export function samarkanNik(nik: string | null): string | null {
  return nik ? `${nik.slice(0, 4)} •••• •••• ${nik.slice(-4)}` : null;
}

export function samarkanHp(hp: string | null): string | null {
  return hp ? `${hp.slice(0, 4)}••••${hp.slice(-3)}` : null;
}

export function samarkanAlamat(alamat: string | null): string | null {
  return alamat ? "••••••••••••" : null;
}
