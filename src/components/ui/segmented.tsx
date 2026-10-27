"use client";
// Segmented control, estilo "Segmented Control Tabs" de cnippet-dev (21st.dev).
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex w-full items-center rounded-lg bg-muted p-[3px] text-muted-foreground", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm font-medium transition-all",
            value === o.value ? "bg-background text-foreground shadow-sm shadow-black/10" : "hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
