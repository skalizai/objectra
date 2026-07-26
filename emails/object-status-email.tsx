import { Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

export interface ObjectStatusEmailProps {
  recipientName: string;
  heading: string;
  message: string;
  objectTitle: string;
  wricefId: string | null;
  projectName: string;
  status: string;
  dueDate: string | null;
  technicalName: string | null;
  functionalName: string | null;
  appUrl: string;
}

export default function ObjectStatusEmail({
  recipientName = "Jordan Lee",
  heading = "New object assigned to you",
  message = "This object has moved to Development in Progress and is now assigned to you.",
  objectTitle = "Vendor onboarding approval",
  wricefId = "WF-0142",
  projectName = "Acme S/4HANA Rollout",
  status = "Development in Progress",
  dueDate = null,
  technicalName = "Jordan Lee",
  functionalName = "Priya Sharma",
  appUrl = "https://objectra.app",
}: ObjectStatusEmailProps) {
  return (
    <EmailShell preview={`${wricefId ? `${wricefId} — ` : ""}${objectTitle} on ${projectName}`} heading={heading}>
      <Text style={emailStyles.text}>Hi {recipientName},</Text>
      <Text style={emailStyles.text}>{message}</Text>

      <Section style={{ marginTop: 8 }}>
        <table role="presentation" style={{ width: "100%" }}>
          <tr>
            <td style={{ padding: "14px 16px", background: "#F4F5F7", borderRadius: 10 }}>
              <Text style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0E1116" }}>
                {objectTitle} {wricefId ? `· ${wricefId}` : ""}
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7482" }}>
                {projectName} · {status}
                {dueDate ? ` · Due ${dueDate}` : ""}
              </Text>
              {technicalName && (
                <Text style={{ margin: "8px 0 0", fontSize: 12, color: "#333B48" }}>
                  Technical consultant: <strong>{technicalName}</strong>
                </Text>
              )}
              {functionalName && (
                <Text style={{ margin: "2px 0 0", fontSize: 12, color: "#333B48" }}>
                  Functional consultant: <strong>{functionalName}</strong>
                </Text>
              )}
            </td>
          </tr>
        </table>
      </Section>

      <a href={`${appUrl}/my-work`} style={emailStyles.button}>
        View in Objectra Labs
      </a>
    </EmailShell>
  );
}
