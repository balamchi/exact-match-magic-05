import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  clientName?: string;
  planName?: string;
  monthlyPriceCents?: number;
  benefits?: string[];
  clinicName?: string;
  clinicLogo?: string;
  portalUrl?: string;
  replyTo?: string;
}

const formatPrice = (cents?: number) =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
    : "—";

const MembershipWelcomeEmail = ({
  clientName, planName, monthlyPriceCents, benefits, clinicName, portalUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {planName ?? "your membership"} at {clinicName ?? "the clinic"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Welcome{clientName ? `, ${clientName}` : ""} ✦
        </Heading>
        <Text style={lead}>
          You&rsquo;re officially a member of <strong>{planName ?? "our membership"}</strong>
          {clinicName ? ` at ${clinicName}` : ""}.
        </Text>
        <Section style={card}>
          <Text style={amountLabel}>Monthly</Text>
          <Text style={amountValue}>{formatPrice(monthlyPriceCents)}</Text>
        </Section>

        {benefits && benefits.length > 0 ? (
          <Section style={benefitsBox}>
            <Text style={benefitsLabel}>Your benefits</Text>
            {benefits.map((b, i) => (
              <Text key={i} style={benefitItem}>• {b}</Text>
            ))}
          </Section>
        ) : null}

        <Text style={text}>
          Your card on file will be charged each month. You can manage your membership,
          update your payment method, or cancel anytime from your portal.
        </Text>

        {portalUrl ? (
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={portalUrl} style={btn}>Manage your membership</Button>
          </Section>
        ) : null}

        <Text style={signoff}>
          Welcome aboard,<br />
          The {clinicName ?? "Clinic"} team
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: MembershipWelcomeEmail,
  subject: (d: Record<string, unknown>) =>
    `Welcome to ${(d.planName as string) ?? "your membership"}${d.clinicName ? ` at ${d.clinicName}` : ""} ✦`,
  displayName: "Membership welcome",
  previewData: {
    clientName: "Sam Rivera",
    planName: "Glow Monthly",
    monthlyPriceCents: 14900,
    benefits: ["1 facial per month", "10% off injectables", "Priority booking"],
    clinicName: "Aurora Aesthetics",
    portalUrl: "https://example.com/portal/membership/abc",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "24px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.6", margin: "16px 0" };
const card = {
  background: "linear-gradient(135deg, #9333EA 0%, #6b21a8 100%)",
  borderRadius: "12px", padding: "24px", margin: "24px 0",
  color: "#ffffff", textAlign: "center" as const,
};
const amountLabel = {
  fontSize: "12px", color: "rgba(255,255,255,0.85)",
  textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 4px",
};
const amountValue = { fontSize: "32px", fontWeight: "bold", color: "#ffffff", margin: "0" };
const benefitsBox = {
  background: "#faf5ff", borderLeft: "3px solid #9333EA",
  borderRadius: "6px", padding: "16px 20px", margin: "20px 0",
};
const benefitsLabel = {
  fontSize: "11px", color: "#7e22ce", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", margin: "0 0 8px",
};
const benefitItem = { fontSize: "14px", color: "#3b0764", margin: "4px 0" };
const btn = {
  background: "#9333EA", color: "#ffffff", padding: "12px 24px",
  borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: "bold",
};
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
