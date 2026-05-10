import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  clientName?: string;
  planName?: string;
  amountCents?: number;
  nextBillingDate?: string;
  clinicName?: string;
  replyTo?: string;
}

const formatPrice = (cents?: number) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
    : "—";

const Email = ({ clientName, planName, amountCents, nextBillingDate, clinicName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received for your {planName ?? "membership"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment received {clientName ? `— thanks, ${clientName}` : ""}</Heading>
        <Text style={lead}>
          We&rsquo;ve successfully processed your monthly payment for{" "}
          <strong>{planName ?? "your membership"}</strong>.
        </Text>
        <Section style={card}>
          <Text style={label}>Amount charged</Text>
          <Text style={value}>{formatPrice(amountCents)}</Text>
          {nextBillingDate ? (
            <>
              <Text style={label}>Next billing date</Text>
              <Text style={subValue}>{nextBillingDate}</Text>
            </>
          ) : null}
        </Section>
        <Text style={text}>
          Your benefits remain active. Thank you for being a member of{" "}
          {clinicName ?? "our clinic"}.
        </Text>
        <Text style={signoff}>The {clinicName ?? "Clinic"} team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    `Payment received — ${(d.planName as string) ?? "your"} membership`,
  displayName: "Membership charge succeeded",
  previewData: {
    clientName: "Sam",
    planName: "Glow Monthly",
    amountCents: 14900,
    nextBillingDate: "June 9, 2026",
    clinicName: "Aurora Aesthetics",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.6", margin: "16px 0" };
const card = {
  background: "#f0fdf4", border: "1px solid #bbf7d0",
  borderRadius: "10px", padding: "20px 24px", margin: "20px 0",
};
const label = {
  fontSize: "11px", color: "#15803d", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", margin: "0 0 4px",
};
const value = { fontSize: "28px", fontWeight: "bold", color: "#14532d", margin: "0 0 14px" };
const subValue = { fontSize: "16px", color: "#14532d", margin: "0" };
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
