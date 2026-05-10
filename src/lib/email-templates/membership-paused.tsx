import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  clientName?: string;
  planName?: string;
  resumesAt?: string;
  clinicName?: string;
  replyTo?: string;
}

const Email = ({ clientName, planName, resumesAt, clinicName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName ?? "membership"} is paused</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {clientName ? `${clientName}, your` : "Your"} membership is on pause
        </Heading>
        <Text style={lead}>
          We&rsquo;ve paused <strong>{planName ?? "your membership"}</strong>
          {clinicName ? ` at ${clinicName}` : ""}. Billing will not occur while paused.
        </Text>
        {resumesAt ? (
          <Section style={card}>
            <Text style={label}>Scheduled to resume</Text>
            <Text style={value}>{resumesAt}</Text>
          </Section>
        ) : null}
        <Text style={text}>
          You can resume anytime from your member portal.
        </Text>
        <Text style={signoff}>The {clinicName ?? "Clinic"} team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    `Your ${(d.planName as string) ?? ""} membership is paused`.replace(/\s+/g, " ").trim(),
  displayName: "Membership paused",
  previewData: {
    clientName: "Sam",
    planName: "Glow Monthly",
    resumesAt: "August 1, 2026",
    clinicName: "Aurora Aesthetics",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.6", margin: "16px 0" };
const card = {
  background: "#f5f3ff", border: "1px solid #e9d5ff",
  borderRadius: "10px", padding: "18px 22px", margin: "18px 0",
};
const label = {
  fontSize: "11px", color: "#7e22ce", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", margin: "0 0 4px",
};
const value = { fontSize: "18px", fontWeight: "bold", color: "#3b0764", margin: "0" };
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
