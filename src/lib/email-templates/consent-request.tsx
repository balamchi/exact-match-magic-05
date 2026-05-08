import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const SITE_NAME = "ClinicPro";

interface ConsentRequestProps {
  firstName?: string;
  clinicName?: string;
  templateName?: string;
  publicToken?: string;
  siteUrl?: string;
}

const ConsentRequestEmail = ({
  firstName,
  clinicName,
  templateName = "Consent Form",
  publicToken,
  siteUrl = "https://clinicpro.io",
}: ConsentRequestProps) => {
  const consentUrl = `${siteUrl}/consent/${publicToken ?? "preview"}`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {clinicName ?? "Your clinic"} requests your signature for {templateName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>✦ {SITE_NAME}</Text>

          <Heading style={h1}>Action Required: Sign Consent Form</Heading>

          <Text style={lead}>
            Hi {firstName ?? "there"},
          </Text>

          <Text style={text}>
            <strong>{clinicName ?? "Your clinic"}</strong> has requested your
            signature for the following consent form before your upcoming
            appointment:
          </Text>

          <Section style={templateBox}>
            <Text style={templateNameStyle}>📋 {templateName}</Text>
          </Section>

          <Text style={text}>
            Please review the consent form carefully and provide your electronic
            signature. This helps us provide you with the safest, most informed
            care possible.
          </Text>

          <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
            <Button href={consentUrl} style={ctaButton}>
              Review &amp; Sign Consent
            </Button>
          </Section>

          <Text style={smallText}>
            Or copy and paste this link:{" "}
            <Link href={consentUrl} style={linkStyle}>
              {consentUrl}
            </Link>
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              ⏱ This link expires in 7 days.
              <br />
              🔒 Your information is secure and confidential.
              <br />
              📱 You can sign on any device — phone, tablet, or computer.
            </Text>
          </Section>

          <Text style={smallText}>
            If you have questions about this consent form, please contact{" "}
            {clinicName ?? "the clinic"} directly. If you didn't expect this
            email, please disregard.
          </Text>

          <Text style={footer}>
            © 2026 {SITE_NAME} · {siteUrl?.replace("https://", "") ?? "clinicpro.io"}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: ConsentRequestEmail,
  subject: (data: Record<string, any>) =>
    `Action Required: Sign ${data.templateName ?? "Consent Form"} — ${data.clinicName ?? "Your Clinic"}`,
  displayName: "Consent form request",
  previewData: {
    firstName: "Jordan",
    clinicName: "Aurora Aesthetics",
    templateName: "Botox Treatment Consent",
    publicToken: "abc123",
    siteUrl: "https://clinicpro.io",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  color: "#0a0a0b",
};
const container = {
  padding: "32px 28px",
  maxWidth: "560px",
  margin: "0 auto",
};
const brandMark = {
  fontSize: "14px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #9333ea, #d946ef)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  color: "#9333ea",
  margin: "0 0 24px",
};
const h1 = {
  fontFamily: "Fraunces, Georgia, serif",
  fontSize: "26px",
  fontWeight: 600,
  color: "#0a0a0b",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};
const lead = {
  fontSize: "15px",
  color: "#3f3f46",
  lineHeight: "1.6",
  margin: "0 0 8px",
};
const text = {
  fontSize: "14px",
  color: "#52525b",
  lineHeight: "1.6",
  margin: "0 0 18px",
};
const smallText = {
  fontSize: "12px",
  color: "#71717a",
  lineHeight: "1.5",
  margin: "0 0 18px",
};
const templateBox = {
  backgroundColor: "#f4f0ff",
  border: "1px solid #e0d4fc",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "0 0 20px",
};
const templateNameStyle = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#7c3aed",
  margin: "0",
};
const ctaButton = {
  backgroundColor: "#9333ea",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
  display: "inline-block" as const,
};
const linkStyle = {
  color: "#9333ea",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};
const infoBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  padding: "14px 18px",
  margin: "0 0 20px",
};
const infoText = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: "1.8",
  margin: "0",
};
const footer = {
  fontSize: "11px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "28px 0 0",
  borderTop: "1px solid #e4e4e7",
  paddingTop: "18px",
};
