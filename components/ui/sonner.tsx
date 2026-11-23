"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

function bacaTemaSonner(): "light" | "dark" {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.dataset.tema === "langit-pagi" ? "light" : "dark"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const [tema, setTema] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const sinkron = () => setTema(bacaTemaSonner())
    sinkron()
    const obs = new MutationObserver(sinkron)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] })
    return () => obs.disconnect()
  }, [])

  return (
    <Sonner
      theme={tema}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
