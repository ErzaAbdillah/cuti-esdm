import type { ReactNode } from "react";
import type { StatusCuti } from "@/lib/generated/prisma/enums";
import { LABEL_STATUS_CUTI, WARNA_STATUS_CUTI } from "@/lib/label";
import { cn } from "@/lib/utils";

export function Lencana({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>{children}</span>;
}

export function LencanaStatusCuti({ status }: { status: StatusCuti }) {
  return <Lencana className={WARNA_STATUS_CUTI[status]}>{LABEL_STATUS_CUTI[status]}</Lencana>;
}
