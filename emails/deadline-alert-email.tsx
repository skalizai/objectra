import { Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

export interface DeadlineAlertEmailProps {
  recipientName: string;
  projectName: string;
  items: { title: string; wricefId: string | null; dueDate: string; daysRemaining: number }[];
  appUrl: string;
}

export default function DeadlineAlertEmail({
  recipientName = "Jordan Lee",
  projectName = "Acme S/4HANA Rollout",
  items = [
    { title: "Vendor onboarding approval", wricefId: "WF-0142", dueDate: "2026-07-22", daysRemaining: 3 },
    { title: "Regional sales variance", wricefId: "RP-0087", dueDate: "2026-07-18", daysRemaining: -1 },
  ],
  appUrl = "https://objectra.app",
}: DeadlineAlertEmailProps) {
  return (
    <EmailShell
      preview={`${items.length} object${items.length === 1 ? "" : "s"} need attention on ${projectName}`}
      heading="Deadline alert"
    >
      <Text style={emailStyles.text}>Hi {recipientName},</Text>
      <Text style={emailStyles.text}>
        {items.length} object{items.length === 1 ? " is" : "s are"} overdue or due soon on{" "}
        <strong>{projectName}</strong>:
      </Text>

      <Section style={{ marginTop: 8 }}>
        {items.map((item) => (
          <table key={item.wricefId ?? item.title} role="presentation" style={{ width: "100%", marginBottom: 10 }}>
            <tr>
              <td style={{ padding: "10px 12px", background: "#F4F5F7", borderRadius: 10 }}>
                <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0E1116" }}>
                  {item.title} {item.wricefId ? `· ${item.wricefId}` : ""}
                </Text>
                <Text style={{ margin: "2px 0 0", fontSize: 12, color: item.daysRemaining < 0 ? "#F0574B" : "#6B7482" }}>
                  Due {item.dueDate} —{" "}
                  {item.daysRemaining < 0
                    ? `${Math.abs(item.daysRemaining)} day(s) overdue`
                    : `${item.daysRemaining} day(s) remaining`}
                </Text>
              </td>
            </tr>
          </table>
        ))}
      </Section>

      <a href={`${appUrl}/my-work`} style={emailStyles.button}>
        View in Objectra Labs
      </a>
    </EmailShell>
  );
}
