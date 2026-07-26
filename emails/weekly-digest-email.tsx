import { Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

const BRASS = "#C79A4B";
const INK = "#0E1116";
const TEXT_2 = "#5B6472";
const OVERDUE = "#F0574B";

export interface WeeklyDigestEmailProps {
  recipientName: string;
  projectName: string;
  total: number;
  live: number;
  inFlight: number;
  atRisk: number;
  percentComplete: number;
  movedThisWeek: string[];
  overdue: { title: string; dueDate: string }[];
  appUrl: string;
}

export default function WeeklyDigestEmail({
  recipientName = "Priya Sharma",
  projectName = "Acme S/4HANA Rollout",
  total = 128,
  live = 64,
  inFlight = 52,
  atRisk = 12,
  percentComplete = 50,
  movedThisWeek = ["WF-0142 moved to Testing in Q", "RP-0087 went live"],
  overdue = [{ title: "Regional sales variance", dueDate: "2026-07-18" }],
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
          <Text style={{ ...emailStyles.text, fontWeight: 700, marginBottom: 6 }}>What moved this week</Text>
          {movedThisWeek.map((line) => (
            <Text key={line} style={{ ...emailStyles.text, margin: "3px 0", color: TEXT_2 }}>
              · {line}
            </Text>
          ))}
        </Section>
      )}

      {overdue.length > 0 && (
        <Section style={{ marginTop: 18 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 700, marginBottom: 6, color: OVERDUE }}>
            Needs attention
          </Text>
          {overdue.map((item) => (
            <Text key={item.title} style={{ ...emailStyles.text, margin: "3px 0", color: TEXT_2 }}>
              · {item.title} — due {item.dueDate}
            </Text>
          ))}
        </Section>
      )}

      <a href={`${appUrl}/dashboard`} style={emailStyles.button}>
        Open dashboard
      </a>
    </EmailShell>
  );
}
