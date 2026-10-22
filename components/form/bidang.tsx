"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BidangProps extends ComponentProps<typeof Input> {
  label: string;
  name: string;
  galat?: string;
  petunjuk?: string;
}

/** Label + input + petunjuk + pesan galat yang terhubung lewat aria-describedby. */
export function Bidang({ label, name, galat, petunjuk, className, type, ...props }: BidangProps) {
  const id = useId();
  const [lihat, setLihat] = useState(false);
  const password = type === "password";
  const idKet = `${id}-ket`;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-judul">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={password && lihat ? "text" : type}
          aria-invalid={galat ? true : undefined}
          aria-describedby={galat || petunjuk ? idKet : undefined}
          className={cn("h-11 bg-white text-base md:text-sm", password && "pr-11")}
          {...props}
        />
        {password && (
          <button
            type="button"
            onClick={() => setLihat((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-judul focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
          >
            {lihat ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        )}
      </div>
      {(galat || petunjuk) && (
        <p id={idKet} className={cn("text-xs", galat ? "font-medium text-destructive" : "text-muted-foreground")}>
          {galat ?? petunjuk}
        </p>
      )}
    </div>
  );
}
