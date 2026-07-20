import { OBJECT_TYPE_META } from "@/lib/object-meta";
import type { ObjectType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function WricefGlyph({
  type,
  size = 24,
  className,
}: {
  type: ObjectType;
  size?: number;
  className?: string;
}) {
  const meta = OBJECT_TYPE_META[type];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[7px] font-mono font-medium text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: meta.colorVar,
        fontSize: size * 0.5,
      }}
      title={type}
      aria-label={type}
    >
      {meta.letter}
    </span>
  );
}
