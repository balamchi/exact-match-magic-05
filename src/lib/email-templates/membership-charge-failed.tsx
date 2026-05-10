import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  clientName?: string;
  planName?: string;
  amountCents?: number;
  failureReason?: string;
  updateCardUrl?: string;
  clinicName?: string;
  replyTo?: string;
}

const formatPrice = (cents?: number) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
    : "—";

const Email = ({
  clientName, planName, amountCents, failureReason, updateCardUrl, clinicName,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Quick action needed on your {planName ?? "membership"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {clientName ? `Hi ${clientName}, ` : ""}we couldn&rsquo;t process your payment
        </Heading>
        <Text style={lead}>
          Your monthly payment of {formatPrice(amountCents)} for{" "}
          <strong>{planName ?? "your membership"}</strong> didn&rsquo;t go through.
        </Text>
        <Section style={warnCard}>
          <Text style={warnLabel}>What happened</Text>
          <Text style={warnText}>
            {failureReason ?? "Your card was declined or expired."}
          </Text>
        </Section>
        <Text style={text}>
          Don&rsquo;t worry — your membership is still active while we retry. To avoid any
          interruption, please update your payment method.
        </Text>
        {updateCardUrl ? (
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={updateCardUrl} style={btn}>Update payment method</Button>
          </Section>
        ) : null}
        <Text style={signoff}>The {clinicName ?? "Clinic"} team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: () => "Action needed — membership payment",
  displayName: "Membership charge failed",
  previewData: {
    clientName: "Sam",
    planName: "Glow Monthly",
    amountCents: 14900,
    failureReason: "Card declined",
    updateCardUrl: "https://example.com/portal/membership/abc",
    clinicName: "Aurora Aesthetics",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.6", margin: "16px 0" };
const warnCard = {
  background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "3px solid #f59e0b",
  borderRadius: "6px", padding: "14px 18px", margin: "16px 0",
};
const warnLabel = {
  fontSize: "11px", color: "#b45309", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", margin: "0 0 4px",
};
const warnText = { fontSize: "14px", color: "#78350f", margin: "0" };
const btn = {
  background: "#f59e0b", color: "#ffffff", padding: "12px 24px",
  borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold",
};
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
