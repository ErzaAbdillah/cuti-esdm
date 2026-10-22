import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** <select> bawaan browser bergaya input — andal di HP dan mudah diakses. */
export function Pilihan({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
