/** Lembar cetak: tanpa sidebar & latar langit, putih penuh. */
export default function LayoutCetak({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-white text-black">{children}</div>;
}
