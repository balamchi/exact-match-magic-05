import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

const SITE_NAME = "ClinicPro";

interface DirectMessageProps {
  firstName?: string;
  clinicName?: string;
  messageBody?: string;
  siteUrl?: string;
}

const DirectMessageEmail = ({
  firstName = "there",
  clinicName = "Your Clinic",
  messageBody = "",
  siteUrl = "https://clinicpro.io",
}: DirectMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Message from {clinicName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>✦ {clinicName}</Text>

        <Heading style={h1}>You have a new message</Heading>

        <Text style={lead}>Hi {firstName},</Text>

        <Section style={messageBox}>
          <Text style={messageText}>{messageBody}</Text>
        </Section>

        <Text style={smallText}>
          Reply to this email to respond directly to {clinicName}.
        </Text>

        <Text style={footer}>
          Powered by ✦ {SITE_NAME} · {siteUrl.replace("https://", "")}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: DirectMessageEmail,
  subject: (data: Record<string, any>) =>
    `Message from ${data.clinicName ?? "your clinic"}`,
  displayName: "Direct message",
  previewData: {
    firstName: "Sarah",
    clinicName: "Aurora Aesthetics",
    messageBody:
      "Hi Sarah! Just wanted to check in and see how you're feeling after Tuesday's appointment. Let me know if you have any questions!",
    siteUrl: "https://clinicpro.io",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  color: "#0a0a0b",
};
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const brandMark = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#9333ea",
  margin: "0 0 24px",
};
const h1 = {
  fontFamily: "Fraunces, Georgia, serif",
  fontSize: "24px",
  fontWeight: 600,
  color: "#0a0a0b",
  margin: "0 0 16px",
};
const lead = { fontSize: "15px", color: "#3f3f46", lineHeight: "1.6", margin: "0 0 12px" };
const messageBox = {
  backgroundColor: "#faf7ff",
  border: "1px solid #e9dffd",
  borderRadius: "12px",
  padding: "18px 20px",
  margin: "8px 0 20px",
};
const messageText = {
  fontSize: "15px",
  color: "#27272a",
  lineHeight: "1.7",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};
const smallText = { fontSize: "12px", color: "#71717a", lineHeight: "1.5", margin: "0 0 18px" };
const footer = {
  fontSize: "11px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  margin: "28px 0 0",
  borderTop: "1px solid #e4e4e7",
  paddingTop: "18px",
};
