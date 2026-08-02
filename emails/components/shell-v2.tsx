import { Body, Head, Html, Preview } from "@react-email/components";
import type { ReactNode } from "react";
import { LOGO_MARK_DATA_URI } from "./logo-mark";

// Palette matches the brand-refresh template (dark header band + gold
// accents on an off-white card) — kept separate from components/shell.tsx's
// simpler card, which invite/deadline-alert emails still use.
export const V2 = {
  pageBg: "#efece6",
  headerBg: "#1f1c16",
  gold: "#c9a45e",
  goldDark: "#b08d4c",
  cardBg: "#fdfcfa",
  heading: "#1f1c16",
  body: "#55503f",
  muted: "#8a8271",
  mutedFaint: "#b3ab9a",
  strong: "#7a5f2a",
  border: "#e6dfd1",
  borderLight: "#f0eadd",
  live: "#3e7d5a",
  livePillBg: "#e0ecdf",
  livePillText: "#2f5f45",
} as const;

const FONT = "Helvetica, Arial, sans-serif";

// Emails are static HTML with no access to the app's CSS custom properties,
// so a status color that isn't a plain hex (e.g. the app's own
// var(--status-process-pending) fallback, or a stale/renamed status with no
// picklist match) needs a literal fallback instead.
export const FALLBACK_STATUS_HEX = "#8a8271";
const HEX_SHAPE = /^#[0-9a-fA-F]{6}$/;

/** Lightens a hex colour toward white for a pill background, keeping the
 * colour itself as the pill's text — so a status pill always matches its
 * admin-configured colour (Settings → Object statuses) instead of a fixed
 * palette that only covers a few hand-picked statuses. */
export function pillTint(hex: string, amount = 0.85) {
  if (!HEX_SHAPE.test(hex)) return V2.border;
  const clean = hex.replace("#", "");
  const mix = (start: number) => Math.round(start + (255 - start) * amount);
  const r = mix(parseInt(clean.slice(0, 2), 16));
  const g = mix(parseInt(clean.slice(2, 4), 16));
  const b = mix(parseInt(clean.slice(4, 6), 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  const safeColor = HEX_SHAPE.test(color) ? color : FALLBACK_STATUS_HEX;
  return (
    <span
      style={{
        background: pillTint(safeColor),
        color: safeColor,
        borderRadius: 12,
        padding: "3px 10px",
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: "15px",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

export function EmailShellV2({
  preview,
  badge,
  appUrl,
  children,
}: {
  preview: string;
  badge: string;
  appUrl: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>
          {`
            @media only screen and (max-width: 620px) {
              .container { width: 100% !important; }
              .px { padding-left: 24px !important; padding-right: 24px !important; }
            }
            @media (prefers-color-scheme: dark) {
              .card-bg { background-color: #23211c !important; }
              .darktext { color: #f0ece3 !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: V2.pageBg, wordSpacing: "normal" as const }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ backgroundColor: V2.pageBg }}>
          <tr>
            <td align="center" style={{ padding: "32px 12px" }}>
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                width={600}
                className="container"
                style={{ width: 600, maxWidth: 600 }}
              >
                {/* Header band */}
                <tr>
                  <td
                    className="px"
                    style={{ backgroundColor: V2.headerBg, borderRadius: "14px 14px 0 0", padding: "22px 32px" }}
                  >
                    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                      <tr>
                        <td align="left">
                          <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                            <tr>
                              <td width={32} align="center" valign="middle" style={{ lineHeight: "32px" }}>
                                {/* Raster PNG, not inline <svg> — most mail clients (Gmail,
                                    Outlook) strip inline SVG for security, leaving a blank
                                    logo. A base64 data: URI renders everywhere, no external
                                    image request needed. next/image doesn't apply — this
                                    HTML ships to an email client, not a Next.js page. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={LOGO_MARK_DATA_URI}
                                  width={30}
                                  height={32}
                                  alt="Objectra Labs"
                                  style={{ display: "block", border: 0 }}
                                />
                              </td>
                              <td width={10} style={{ fontSize: 1, lineHeight: "1px" }}>
                                &nbsp;
                              </td>
                              <td
                                style={{
                                  fontFamily: FONT,
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "#ffffff",
                                  letterSpacing: 0.3,
                                  lineHeight: "24px",
                                }}
                              >
                                Objectra<span style={{ color: V2.gold, fontWeight: 700 }}>Labs</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td
                          align="right"
                          style={{
                            fontFamily: FONT,
                            fontSize: 11,
                            color: "#8f8574",
                            letterSpacing: 1.5,
                            textTransform: "uppercase" as const,
                            lineHeight: "16px",
                          }}
                        >
                          {badge}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                {/* Gold accent strip */}
                <tr>
                  <td height={4} style={{ backgroundColor: V2.goldDark, fontSize: 1, lineHeight: "1px" }}>
                    &nbsp;
                  </td>
                </tr>

                {/* Main card */}
                <tr>
                  <td
                    className="card-bg px"
                    style={{ backgroundColor: V2.cardBg, borderRadius: "0 0 14px 14px", padding: "36px 32px 32px 32px" }}
                  >
                    {children}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td className="px" style={{ padding: "24px 32px" }}>
                    <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px" }}>
                      You&apos;re receiving this because you have an active project on Objectra Labs.
                      <br />
                      <a href={`${appUrl}/settings`} style={{ color: V2.muted, textDecoration: "underline" }}>
                        Manage notification settings
                      </a>
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 11, color: V2.mutedFaint, paddingTop: 8, lineHeight: "16px" }}>
                      Objectra Labs · Automated project notifications
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}
