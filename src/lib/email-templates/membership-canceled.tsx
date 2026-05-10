import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  clientName?: string;
  planName?: string;
  lastActiveDate?: string;
  clinicName?: string;
  replyTo?: string;
}

const Email = ({ clientName, planName, lastActiveDate, clinicName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName ?? "membership"} has been canceled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {clientName ? `${clientName}, we&rsquo;ll miss you` : "We&rsquo;ll miss you"}
        </Heading>
        <Text style={lead}>
          Your <strong>{planName ?? "membership"}</strong>
          {clinicName ? ` at ${clinicName}` : ""} has been canceled. Thank you for being part
          of our community.
        </Text>
        {lastActiveDate ? (
          <Section style={card}>
            <Text style={label}>Active through</Text>
            <Text style={value}>{lastActiveDate}</Text>
          </Section>
        ) : null}
        <Text style={text}>
          You&rsquo;re welcome back anytime — we&rsquo;d love to have you again. Just reach
          out and we&rsquo;ll get you reactivated in minutes.
        </Text>
        <Text style={signoff}>
          With gratitude,<br />
          The {clinicName ?? "Clinic"} team
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: () => "Membership canceled — we&rsquo;ll miss you",
  displayName: "Membership canceled",
  previewData: {
    clientName: "Sam",
    planName: "Glow Monthly",
    lastActiveDate: "June 9, 2026",
    clinicName: "Aurora Aesthetics",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.6", margin: "16px 0" };
const card = {
  background: "#fafafa", border: "1px solid #e5e5e5",
  borderRadius: "10px", padding: "18px 22px", margin: "18px 0",
};
const label = {
  fontSize: "11px", color: "#525252", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", margin: "0 0 4px",
};
const value = { fontSize: "18px", fontWeight: "bold", color: "#0a0a0b", margin: "0" };
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
