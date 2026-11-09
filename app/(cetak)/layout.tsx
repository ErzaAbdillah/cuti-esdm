/** Lembar cetak: tanpa sidebar & latar langit, putih penuh. */
export default function LayoutCetak({ children }: LayoutProps<"/">) {
  return <div className="lembar-cetak min-h-dvh bg-white text-black">{children}</div>;
}
