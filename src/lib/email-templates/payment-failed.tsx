import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface PaymentFailedProps {
  clinicName?: string;
  planName?: string;
  amountDisplay?: string;
  retryDate?: string;
  billingPortalUrl?: string;
  reason?: string;
}

const PaymentFailedEmail = ({
  clinicName,
  planName,
  amountDisplay,
  retryDate,
  billingPortalUrl,
  reason,
}: PaymentFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      We couldn&rsquo;t process your ClinicPro payment{clinicName ? ` for ${clinicName}` : ""}.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Action needed: payment failed</Heading>
        <Text style={lead}>
          Hi{clinicName ? ` ${clinicName} team` : ""}, we tried to charge your card on file
          {amountDisplay ? ` for ${amountDisplay}` : ""}
          {planName ? ` (ClinicPro ${planName} plan)` : ""}, but the payment didn&rsquo;t go through.
        </Text>

        {reason ? (
          <Section style={callout}>
            <Text style={calloutLabel}>Reason from your card issuer</Text>
            <Text style={calloutText}>{reason}</Text>
          </Section>
        ) : null}

        <Text style={p}>
          Paddle, our payment processor, will automatically retry the charge
          {retryDate ? ` on ${retryDate}` : " over the next few days"}. To avoid any
          interruption to your subscription, please update your payment method now.
        </Text>

        {billingPortalUrl ? (
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={billingPortalUrl} style={button}>
              Update payment method
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={small}>
          If you&rsquo;ve already updated your card, you can ignore this email — the next
          retry will succeed automatically. Need help? Reply to this email and our team
          will jump in.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#0a0a0a",
  color: "#f5f5f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};

const lead = { color: "#d4d4d4", fontSize: "16px", lineHeight: "24px", margin: "0 0 16px" };
const p = { color: "#a3a3a3", fontSize: "14px", lineHeight: "22px", margin: "0 0 16px" };
const small = { color: "#737373", fontSize: "12px", lineHeight: "18px", margin: "16px 0 0" };

const callout = {
  background: "#1f1410",
  border: "1px solid #7c2d12",
  borderRadius: "10px",
  padding: "14px 16px",
  margin: "20px 0",
};
const calloutLabel = {
  color: "#fb923c",
  fontSize: "11px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  margin: "0 0 4px",
};
const calloutText = { color: "#fed7aa", fontSize: "14px", lineHeight: "20px", margin: 0 };

const button = {
  backgroundColor: "#a78bfa",
  color: "#0a0a0a",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  borderRadius: "10px",
  padding: "12px 24px",
  display: "inline-block",
};

const hr = { borderColor: "#262626", margin: "24px 0" };

export const template: TemplateEntry = {
  component: PaymentFailedEmail,
  displayName: "Payment Failed",
  subject: (data) =>
    `Payment failed${data.clinicName ? ` for ${data.clinicName}` : ""} — action needed`,
  previewData: {
    clinicName: "Lakeshore Aesthetics",
    planName: "Professional",
    amountDisplay: "$199.00",
    retryDate: "May 1, 2026",
    billingPortalUrl: "https://example.com/app/settings/billing",
    reason: "Your card was declined.",
  },
};
