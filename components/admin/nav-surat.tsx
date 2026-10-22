import Link from "next/link";
import { cn } from "@/lib/utils";

const TAUTAN = [
  { href: "/admin/surat/template", label: "Template" },
  { href: "/admin/surat/penandatangan", label: "Penandatangan" },
  { href: "/admin/surat/penomoran", label: "Penomoran" },
] as const;

/** Sub-navigasi pengaturan surat cuti. */
export function NavSurat({ aktif }: { aktif: (typeof TAUTAN)[number]["href"] }) {
  return (
    <nav aria-label="Pengaturan surat" className="flex flex-wrap gap-1 rounded-xl border border-sky-100 bg-white/70 p-1">
      {TAUTAN.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === aktif ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-ring",
            t.href === aktif && "bg-primary text-white hover:bg-primary",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
