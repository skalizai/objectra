// Source SVG is 510x128 (~3.98:1) — width is derived from height to avoid
// distorting the wordmark at different sizes across the app.
const ASPECT_RATIO = 510 / 128;

export function Logo({ height = 28, className }: { height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, no next/image benefit
    <img
      src="/logo.svg"
      alt="Objectra Labs"
      height={height}
      width={Math.round(height * ASPECT_RATIO)}
      className={className}
    />
  );
}
