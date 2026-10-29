import { redirect } from "next/navigation";
import { googleAktif, MODE_GOOGLE, type ModeGoogle, mulaiGoogle } from "@/server/auth/google";
import { penggunaSaatIni } from "@/server/auth/pengguna";

/** Mulai masuk/daftar/hubungkan dengan Google: ?mode=masuk | hubungkan | reset. */
export async function GET(req: Request) {
  if (!googleAktif()) redirect("/login?google=nonaktif");
  const diminta = new URL(req.url).searchParams.get("mode") as ModeGoogle | null;
  const mode = diminta && MODE_GOOGLE.includes(diminta) ? diminta : "masuk";
  if (mode === "hubungkan" && !(await penggunaSaatIni())) redirect("/login");
  redirect(await mulaiGoogle(mode));
}
