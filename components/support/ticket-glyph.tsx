import { cn } from "@/lib/utils";

/** A 24px rounded-square module-initial glyph — echoes the WRICEF-glyph
 * language (components/ui/wricef-glyph.tsx) for tickets, which don't have a
 * fixed type enum to key colors off of, so it uses a stable hash of the
 * module string instead. */
const PALETTE = ["#8B7CF0", "#43A5EF", "#26C2A0", "#E0A340", "#6E7BF2", "#EC6A9C", "#22B8C4"];

function colorFor(module: string) {
  let hash = 0;
  for (let i = 0; i < module.length; i++) hash = (hash * 31 + module.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function TicketGlyph({ module, size = 24, className }: { module: string; size?: number; className?: string }) {
  const letter = (module.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[7px] font-mono font-medium text-white", className)}
      style={{ width: size, height: size, background: colorFor(module || "?"), fontSize: size * 0.5 }}
      title={module}
      aria-label={module}
    >
      {letter}
    </span>
  );
}
