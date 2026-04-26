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

interface BookingConfirmationProps {
  clientName?: string;
  clinicName?: string;
  serviceName?: string;
  preferredTime?: string;
  staffName?: string;
}

const BookingConfirmationEmail = ({
  clientName,
  clinicName,
  serviceName,
  preferredTime,
  staffName,
}: BookingConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your booking request at {clinicName ?? "our clinic"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {clientName ? `Thanks, ${clientName}!` : "Thanks for your request!"}
        </Heading>
        <Text style={lead}>
          We&rsquo;ve received your booking request{clinicName ? ` at ${clinicName}` : ""}.
          Our team will reach out shortly to confirm the appointment details.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Service</Text>
          <Text style={cardValue}>{serviceName ?? "—"}</Text>

          {staffName ? (
            <>
              <Text style={cardLabel}>Provider</Text>
              <Text style={cardValue}>{staffName}</Text>
            </>
          ) : null}

          <Text style={cardLabel}>Preferred time</Text>
          <Text style={cardValue}>{preferredTime ?? "We&rsquo;ll discuss when we call"}</Text>
        </Section>

        <Text style={text}>
          If anything changes, simply reply to this email and we&rsquo;ll take care of it.
        </Text>

        <Text style={signoff}>
          Warm regards,
          <br />
          The {clinicName ?? "Clinic"} team
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, unknown>) =>
    `Booking request received${data.clinicName ? ` — ${data.clinicName}` : ""}`,
  displayName: "Booking confirmation (client)",
  previewData: {
    clientName: "Jordan Lee",
    clinicName: "Aurora Aesthetics",
    serviceName: "Botox consultation",
    preferredTime: "Friday, May 3 at 2:00 PM",
    staffName: "Dr. Maya Chen",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  color: "#0a0a0b",
};
const container = { padding: "32px 28px", maxWidth: "560px", margin: "0 auto" };
const h1 = {
  fontFamily: "Fraunces, Georgia, serif",
  fontSize: "28px",
  fontWeight: 600,
  color: "#0a0a0b",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};
const lead = {
  fontSize: "15px",
  color: "#3f3f46",
  lineHeight: "1.6",
  margin: "0 0 24px",
};
const text = {
  fontSize: "14px",
  color: "#52525b",
  lineHeight: "1.6",
  margin: "0 0 18px",
};
const card = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  padding: "20px 22px",
  margin: "0 0 26px",
};
const cardLabel = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#9333ea",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  margin: "10px 0 4px",
};
const cardValue = {
  fontSize: "15px",
  color: "#0a0a0b",
  fontWeight: 500,
  margin: "0",
};
const signoff = {
  fontSize: "14px",
  color: "#0a0a0b",
  margin: "28px 0 0",
};
