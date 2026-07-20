import { Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

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
    <EmailShell preview={`Weekly status for ${projectName} — ${percentComplete}% complete`} heading="Weekly status digest">
      <Text style={emailStyles.text}>Hi {recipientName},</Text>
      <Text style={emailStyles.text}>
        Here&apos;s the weekly status for <strong>{projectName}</strong>.
      </Text>

      <table role="presentation" style={{ width: "100%", marginTop: 8 }}>
        <tr>
          {[
            { label: "Total", value: total },
            { label: "Live", value: live },
            { label: "In flight", value: inFlight },
            { label: "At risk", value: atRisk },
          ].map((kpi) => (
            <td key={kpi.label} style={{ padding: 8, textAlign: "center" as const }}>
              <Text style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0E1116" }}>{kpi.value}</Text>
              <Text style={{ margin: 0, fontSize: 11, color: "#6B7482" }}>{kpi.label}</Text>
            </td>
          ))}
        </tr>
      </table>

      <Text style={{ ...emailStyles.text, marginTop: 16, fontWeight: 700 }}>{percentComplete}% complete</Text>

      {movedThisWeek.length > 0 && (
        <Section style={{ marginTop: 12 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 600, marginBottom: 4 }}>What moved this week</Text>
          {movedThisWeek.map((line) => (
            <Text key={line} style={{ ...emailStyles.text, margin: "2px 0" }}>
              · {line}
            </Text>
          ))}
        </Section>
      )}

      {overdue.length > 0 && (
        <Section style={{ marginTop: 12 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 600, marginBottom: 4, color: "#F0574B" }}>
            What&apos;s overdue
          </Text>
          {overdue.map((item) => (
            <Text key={item.title} style={{ ...emailStyles.text, margin: "2px 0" }}>
              · {item.title} (was due {item.dueDate})
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
