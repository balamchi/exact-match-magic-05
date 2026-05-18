import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  firstName: string;
  appUrl: string;
}

const TrialCheckInEmail = ({ firstName, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You&rsquo;re halfway through. Quick question.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND.displayName}</Text>
        <Heading style={h1}>Halfway there, {firstName}</Heading>
        <Text style={lead}>
          You&rsquo;re 7 days into your ClinicPro trial — 7 days left. I wanted to personally
          check in. Most clinics that get the most out of ClinicPro have done at least one of
          these by Day 7:
        </Text>

        <Section style={card}>
          <Text style={item}>
            <span style={bullet}>✦</span> Imported their existing client list
          </Text>
          <Text style={item}>
            <span style={bullet}>✦</span> Booked at least 3 appointments through the new calendar
          </Text>
          <Text style={item}>
            <span style={bullet}>✦</span> Sent their first invoice
          </Text>
        </Section>

        <Text style={lead}>
          If you haven&rsquo;t done any of these yet, jump back in — your dashboard has quick
          guides for each.
        </Text>

        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button href={`${appUrl}/app/dashboard`} style={btn}>
            Open dashboard
          </Button>
        </Section>

        <Text style={text}>
          If anything&rsquo;s broken or confusing, reply to this email — I read every one.
        </Text>

        <Text style={signoff}>— The ClinicPro team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TrialCheckInEmail,
  subject: "How's your ClinicPro trial going?",
  displayName: "Trial check-in (Day 7)",
  previewData: { firstName: "Sarah", appUrl: "https://www.clinicpro.io" },
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
  fontSize: "28px",
  fontWeight: 600,
  color: "#ffffff",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};
const lead = { fontSize: "15px", color: "#a1a1aa", lineHeight: "1.6", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#a1a1aa", lineHeight: "1.6", margin: "20px 0" };
const card = {
  backgroundColor: "#161616",
  border: "1px solid #262626",
  borderRadius: "12px",
  padding: "20px 22px",
  margin: "8px 0 20px",
};
const item = { fontSize: "15px", color: "#ffffff", margin: "8px 0" };
const bullet = { color: "#9333ea", marginRight: "10px" };
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
const signoff = { fontSize: "14px", color: "#a1a1aa", margin: "32px 0 0" };
