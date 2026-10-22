type Param = Record<string, string | number | undefined | null>;

/** Query string dari objek; nilai kosong dibuang. */
export function queryString(p: Param): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
