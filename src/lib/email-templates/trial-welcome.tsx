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
import { BRAND } from "@/lib/brand";
import type { TemplateEntry } from "./registry";

interface Props {
  firstName: string;
  planName: string;
  appUrl: string;
}

const TrialWelcomeEmail = ({ firstName, planName, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your 7-day ClinicPro trial has started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND.displayName}</Text>
        <Heading style={h1}>Welcome, {firstName}</Heading>
        <Text style={lead}>
          Your 7-day {planName} trial is live. No card was charged — you have full access to
          every feature for the next two weeks.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Get started in 3 steps</Text>
          <Text style={step}>
            <span style={stepNum}>1.</span> Add your clinic&rsquo;s services and prices
          </Text>
          <Text style={step}>
            <span style={stepNum}>2.</span> Invite your staff
          </Text>
          <Text style={step}>
            <span style={stepNum}>3.</span> Book your first appointment
          </Text>
        </Section>

        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button href={`${appUrl}/app/dashboard`} style={btn}>
            Open your dashboard
          </Button>
        </Section>

        <Text style={text}>
          Need help getting started?{" "}
          <Link href={`mailto:${BRAND.supportEmail}`} style={link}>
            Reply to this email
          </Link>
          .
        </Text>

        <Text style={signoff}>
          — The ClinicPro team
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TrialWelcomeEmail,
  subject: "Welcome to ClinicPro — your trial is live",
  displayName: "Trial welcome (Day 0)",
  previewData: {
    firstName: "Sarah",
    planName: "Professional",
    appUrl: "https://www.clinicpro.io",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  color: "#ffffff",
  padding: "24px 0",
};
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const brand = {
  fontSize: "14px",
  color: "#9333ea",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: "0 0 24px",
  fontWeight: 600,
};
const h1 = {
  fontFamily: "Fraunces, Georgia, serif",
  fontSize: "30px",
  fontWeight: 600,
  color: "#ffffff",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};
const lead = {
  fontSize: "15px",
  color: "#a1a1aa",
  lineHeight: "1.6",
  margin: "0 0 24px",
};
const text = {
  fontSize: "14px",
  color: "#a1a1aa",
  lineHeight: "1.6",
  margin: "20px 0",
};
const card = {
  backgroundColor: "#161616",
  border: "1px solid #262626",
  borderRadius: "12px",
  padding: "20px 22px",
  margin: "8px 0 28px",
};
const cardLabel = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#9333ea",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 12px",
};
const step = {
  fontSize: "15px",
  color: "#ffffff",
  margin: "8px 0",
};
const stepNum = {
  color: "#9333ea",
  fontWeight: 600,
  marginRight: "8px",
};
const btn = {
  backgroundColor: "#9333ea",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "10px",
  textDecoration: "none",
  fontSize: "15px",
  fontWeight: 600,
  display: "inline-block",
};
const link = { color: "#9333ea", textDecoration: "underline" };
const signoff = { fontSize: "14px", color: "#a1a1aa", margin: "32px 0 0" };
