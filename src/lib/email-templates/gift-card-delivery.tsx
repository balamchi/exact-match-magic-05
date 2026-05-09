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

interface GiftCardDeliveryProps {
  recipientName?: string;
  senderName?: string;
  clinicName?: string;
  code?: string;
  amount?: string;
  personalMessage?: string;
  expiresAt?: string;
}

const GiftCardDeliveryEmail = ({
  recipientName,
  senderName,
  clinicName,
  code,
  amount,
  personalMessage,
  expiresAt,
}: GiftCardDeliveryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      You&rsquo;ve received a {amount ?? ""} gift card{clinicName ? ` to ${clinicName}` : ""}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {recipientName ? `${recipientName}, you&rsquo;ve got a gift!` : "You've got a gift!"}
        </Heading>
        <Text style={lead}>
          {senderName ? `${senderName} ` : "Someone "}
          sent you a gift card{clinicName ? ` for ${clinicName}` : ""}.
        </Text>

        {personalMessage ? (
          <Section style={messageCard}>
            <Text style={messageLabel}>A note for you</Text>
            <Text style={messageText}>&ldquo;{personalMessage}&rdquo;</Text>
          </Section>
        ) : null}

        <Section style={card}>
          <Text style={amountLabel}>Gift card value</Text>
          <Text style={amountValue}>{amount ?? "—"}</Text>
          <Text style={codeLabel}>Redemption code</Text>
          <Text style={codeValue}>{code ?? "—"}</Text>
          {expiresAt ? <Text style={expiresText}>Valid until {expiresAt}</Text> : null}
        </Section>

        <Text style={text}>
          To redeem, present this code at your next visit{clinicName ? ` to ${clinicName}` : ""}, or
          mention it when booking online.
        </Text>

        <Text style={signoff}>
          Enjoy!
          <br />
          The {clinicName ?? "Clinic"} team
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: GiftCardDeliveryEmail,
  subject: (data: Record<string, unknown>) =>
    `You&rsquo;ve received a gift card${data.clinicName ? ` from ${data.clinicName}` : ""}`,
  displayName: "Gift card delivery",
  previewData: {
    recipientName: "Sam Rivera",
    senderName: "Jordan Lee",
    clinicName: "Aurora Aesthetics",
    code: "GIFT-AB12-CD34",
    amount: "$100.00",
    personalMessage: "Happy birthday! Treat yourself to something lovely.",
    expiresAt: "May 9, 2027",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "24px", fontWeight: "bold", color: "#0a0a0b", margin: "0 0 16px" };
const lead = { fontSize: "16px", color: "#404040", lineHeight: "1.5", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#525252", lineHeight: "1.5", margin: "16px 0" };
const card = {
  background: "linear-gradient(135deg, #9333EA 0%, #6b21a8 100%)",
  borderRadius: "12px",
  padding: "28px 24px",
  margin: "24px 0",
  color: "#ffffff",
  textAlign: "center" as const,
};
const amountLabel = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.8)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const amountValue = { fontSize: "36px", fontWeight: "bold", color: "#ffffff", margin: "0 0 20px" };
const codeLabel = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.8)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const codeValue = {
  fontSize: "20px",
  fontFamily: "monospace",
  letterSpacing: "0.1em",
  color: "#ffffff",
  margin: "0 0 12px",
};
const expiresText = { fontSize: "12px", color: "rgba(255,255,255,0.85)", margin: "8px 0 0" };
const messageCard = {
  background: "#faf5ff",
  borderLeft: "3px solid #9333EA",
  borderRadius: "6px",
  padding: "14px 18px",
  margin: "16px 0",
};
const messageLabel = {
  fontSize: "11px",
  color: "#7e22ce",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const messageText = { fontSize: "15px", color: "#3b0764", fontStyle: "italic", margin: "0" };
const signoff = { fontSize: "14px", color: "#525252", margin: "24px 0 0" };
