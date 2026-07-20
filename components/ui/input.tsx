import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text placeholder:text-text-3 transition-colors focus:border-brass focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-text-2", className)} {...props} />
  );
}
