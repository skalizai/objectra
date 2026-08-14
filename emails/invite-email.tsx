import { Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./components/shell";

export interface InviteEmailProps {
  inviteeName: string;
  inviterName: string;
  projectName: string;
  role: string;
  loginEmail: string;
  password: string;
  signInUrl: string;
  /** True for a resend (password reset) rather than a first-time invite —
   * only changes the copy, not the layout. */
  isResend?: boolean;
}

const CREDENTIAL_BOX = {
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  padding: "16px 18px",
  marginTop: 16,
  marginBottom: 8,
};
const CREDENTIAL_LABEL = { fontSize: 11, color: "#6B7482", margin: "0 0 2px", textTransform: "uppercase" as const, letterSpacing: 0.5 };
const CREDENTIAL_VALUE = { fontSize: 15, color: "#0E1116", margin: "0 0 12px", fontFamily: "monospace" };

export default function InviteEmail({
  inviteeName = "Alex Rao",
  inviterName = "Priya Sharma",
  projectName = "Acme S/4HANA Rollout",
  role = "member",
  loginEmail = "alex@example.com",
  password = "Xy4mPz9Qra",
  signInUrl = "https://objectra.app/sign-in",
  isResend = false,
}: InviteEmailProps) {
  return (
    <EmailShell
      preview={isResend ? `Your new Objectra Labs password` : `${inviterName} invited you to ${projectName} on Objectra Labs`}
      heading={isResend ? "Your login was reset" : "You're invited"}
    >
      <Text style={emailStyles.text}>Hi {inviteeName},</Text>
      <Text style={emailStyles.text}>
        {isResend ? (
          <>Your password for Objectra Labs was just reset. Use the credentials below to sign in.</>
        ) : (
          <>
            {inviterName} added you to <strong>{projectName}</strong> on Objectra Labs as a <strong>{role}</strong>.
            Sign in with the credentials below to see your assigned work.
          </>
        )}
      </Text>

      <div style={CREDENTIAL_BOX}>
        <Text style={CREDENTIAL_LABEL}>Email</Text>
        <Text style={CREDENTIAL_VALUE}>{loginEmail}</Text>
        <Text style={CREDENTIAL_LABEL}>Password</Text>
        <Text style={{ ...CREDENTIAL_VALUE, margin: 0 }}>{password}</Text>
      </div>

      <a href={signInUrl} style={emailStyles.button}>
        Sign in
      </a>
      <Text style={{ ...emailStyles.text, marginTop: 20, fontSize: 12, color: "#6B7482" }}>
        If you weren&apos;t expecting this, let your project manager know.
      </Text>
    </EmailShell>
  );
}
