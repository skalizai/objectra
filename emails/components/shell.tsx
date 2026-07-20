import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const BRASS = "#C79A4B";
const INK = "#0E1116";
const TEXT_2 = "#5B6472";

export function EmailShell({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F4F5F7", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "32px auto", maxWidth: 480, borderRadius: 12 }}>
          <Section style={{ padding: "28px 32px 0" }}>
            <table role="presentation">
              <tr>
                <td
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: BRASS,
                    color: INK,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    textAlign: "center" as const,
                    verticalAlign: "middle" as const,
                  }}
                >
                  O
                </td>
                <td style={{ paddingLeft: 10, fontWeight: 700, fontSize: 16, color: INK }}>
                  Objectra <span style={{ color: BRASS }}>Labs</span>
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ padding: "20px 32px 0" }}>
            <Text style={{ fontSize: 20, fontWeight: 700, color: INK, margin: "0 0 12px" }}>{heading}</Text>
            {children}
          </Section>

          <Hr style={{ borderColor: "#E5E7EB", margin: "28px 32px 0" }} />
          <Section style={{ padding: "16px 32px 28px" }}>
            <Text style={{ fontSize: 12, color: TEXT_2, margin: 0 }}>
              You received this because you have an active project on Objectra Labs.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  text: { fontSize: 14, lineHeight: "22px", color: "#333B48" },
  button: {
    display: "inline-block" as const,
    backgroundColor: BRASS,
    color: INK,
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 20px",
    borderRadius: 10,
    textDecoration: "none",
    marginTop: 16,
  },
};
