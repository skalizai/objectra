import { Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

const BRASS = "#C79A4B";
const INK = "#0E1116";
const TEXT_2 = "#5B6472";
const OVERDUE = "#F0574B";

export interface DigestObjectItem {
  title: string;
  module: string | null;
  status: string;
  functionalName: string | null;
  technicalName: string | null;
  dueDate?: string | null;
}

export interface WeeklyDigestEmailProps {
  recipientName: string;
  projectName: string;
  total: number;
  live: number;
  inFlight: number;
  atRisk: number;
  percentComplete: number;
  movedThisWeek: DigestObjectItem[];
  overdue: DigestObjectItem[];
  appUrl: string;
}

function DigestItemCard({ item }: { item: DigestObjectItem }) {
  return (
    <table role="presentation" style={{ width: "100%", marginBottom: 8 }}>
      <tr>
        <td style={{ padding: "10px 12px", background: "#F4F5F7", borderRadius: 8 }}>
          <Text
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              color: BRASS,
              textTransform: "uppercase" as const,
              letterSpacing: 0.5,
            }}
          >
            {item.module || "No module"}
          </Text>
          <Text style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: INK }}>{item.title}</Text>
          <Text style={{ margin: "3px 0 0", fontSize: 12, color: TEXT_2 }}>
            {item.status}
            {item.dueDate ? ` · Due ${item.dueDate}` : ""}
          </Text>
          <Text style={{ margin: "3px 0 0", fontSize: 11, color: "#333B48" }}>
            Functional: <strong>{item.functionalName ?? "Unassigned"}</strong>
            {"   ·   "}
            Technical: <strong>{item.technicalName ?? "Unassigned"}</strong>
          </Text>
        </td>
      </tr>
    </table>
  );
}

export default function WeeklyDigestEmail({
  recipientName = "Priya Sharma",
  projectName = "Acme S/4HANA Rollout",
  total = 128,
  live = 64,
  inFlight = 52,
  atRisk = 12,
  percentComplete = 50,
  movedThisWeek = [
    {
      title: "Vendor onboarding approval",
      module: "MM",
      status: "Testing in QA",
      functionalName: "Priya Sharma",
      technicalName: "Jordan Lee",
    },
  ],
  overdue = [
    {
      title: "Regional sales variance",
      module: "SD",
      status: "Development in Progress",
      functionalName: "Priya Sharma",
      technicalName: "Jordan Lee",
      dueDate: "2026-07-18",
    },
  ],
  appUrl = "https://objectra.app",
}: WeeklyDigestEmailProps) {
  return (
    <EmailShell
      preview={`Weekly status for ${projectName} — ${percentComplete}% complete`}
      heading="Weekly status digest"
    >
      <Text style={emailStyles.text}>Hi {recipientName},</Text>
      <Text style={emailStyles.text}>
        Here&apos;s this week&apos;s status summary for <strong>{projectName}</strong>.
      </Text>

      <Section style={{ marginTop: 12 }}>
        <table role="presentation" style={{ width: "100%" }}>
          <tr>
            <td style={{ padding: "16px 18px", background: "#F4F5F7", borderRadius: 12 }}>
              <table role="presentation" style={{ width: "100%" }}>
                <tr>
                  <td>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: INK }}>
                      {percentComplete}%
                    </Text>
                    <Text style={{ margin: 0, fontSize: 12, color: TEXT_2 }}>complete</Text>
                  </td>
                  <td style={{ textAlign: "right" as const, verticalAlign: "bottom" as const }}>
                    <Text style={{ margin: 0, fontSize: 12, color: TEXT_2 }}>
                      {live} of {total} objects live
                    </Text>
                  </td>
                </tr>
              </table>

              <table role="presentation" style={{ width: "100%", marginTop: 10 }}>
                <tr>
                  <td style={{ height: 8, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" as const }}>
                    <table role="presentation" style={{ width: `${percentComplete}%`, height: 8 }}>
                      <tr>
                        <td style={{ height: 8, borderRadius: 999, background: BRASS }} />
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" style={{ width: "100%", marginTop: 16 }}>
                <tr>
                  {[
                    { label: "Live", value: live, color: "#35C08A" },
                    { label: "In flight", value: inFlight, color: INK },
                    { label: "At risk", value: atRisk, color: atRisk > 0 ? OVERDUE : INK },
                  ].map((kpi) => (
                    <td key={kpi.label} style={{ textAlign: "center" as const }}>
                      <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: kpi.color }}>
                        {kpi.value}
                      </Text>
                      <Text style={{ margin: 0, fontSize: 11, color: TEXT_2 }}>{kpi.label}</Text>
                    </td>
                  ))}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      {movedThisWeek.length > 0 && (
        <Section style={{ marginTop: 18 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 700, marginBottom: 8 }}>What moved this week</Text>
          {movedThisWeek.map((item) => (
            <DigestItemCard key={item.title} item={item} />
          ))}
        </Section>
      )}

      {overdue.length > 0 && (
        <Section style={{ marginTop: 18 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 700, marginBottom: 8, color: OVERDUE }}>
            Needs attention
          </Text>
          {overdue.map((item) => (
            <DigestItemCard key={item.title} item={item} />
          ))}
        </Section>
      )}

      <a href={`${appUrl}/dashboard`} style={emailStyles.button}>
        Open dashboard
      </a>
    </EmailShell>
  );
}
