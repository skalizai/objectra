import { Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

export interface InviteEmailProps {
  inviteeName: string;
  inviterName: string;
  projectName: string;
  role: string;
  actionUrl: string;
}

export default function InviteEmail({
  inviteeName = "Alex Rao",
  inviterName = "Priya Sharma",
  projectName = "Acme S/4HANA Rollout",
  role = "member",
  actionUrl = "https://objectra.app/accept-invite?invite=demo",
}: InviteEmailProps) {
  return (
    <EmailShell preview={`${inviterName} invited you to ${projectName} on Objectra Labs`} heading="You're invited">
      <Text style={emailStyles.text}>Hi {inviteeName},</Text>
      <Text style={emailStyles.text}>
        {inviterName} added you to <strong>{projectName}</strong> on Objectra Labs as a <strong>{role}</strong>.
        Set a password to see your assigned work.
      </Text>
      <a href={actionUrl} style={emailStyles.button}>
        Accept invite
      </a>
      <Text style={{ ...emailStyles.text, marginTop: 20, fontSize: 12, color: "#6B7482" }}>
        This link expires in 14 days. If you weren&apos;t expecting this, you can ignore this email.
      </Text>
    </EmailShell>
  );
}
