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

interface BookingLeadProps {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clinicName?: string;
  serviceName?: string;
  preferredTime?: string;
  staffName?: string;
  notes?: string;
}

const BookingLeadEmail = ({
  clientName,
  clientEmail,
  clientPhone,
  clinicName,
  serviceName,
  preferredTime,
  staffName,
  notes,
}: BookingLeadProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New booking request from {clientName ?? "a website visitor"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New booking request</Heading>
        <Text style={lead}>
          A new request just came in through your public booking page
          {clinicName ? ` for ${clinicName}` : ""}. Reach out to confirm the
          appointment.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Client</Text>
          <Text style={cardValue}>{clientName ?? "—"}</Text>

          <Text style={cardLabel}>Email</Text>
          <Text style={cardValue}>{clientEmail ?? "—"}</Text>

          {clientPhone ? (
            <>
              <Text style={cardLabel}>Phone</Text>
              <Text style={cardValue}>{clientPhone}</Text>
            </>
          ) : null}

          <Text style={cardLabel}>Service</Text>
          <Text style={cardValue}>{serviceName ?? "—"}</Text>

          {staffName ? (
            <>
              <Text style={cardLabel}>Requested provider</Text>
              <Text style={cardValue}>{staffName}</Text>
            </>
          ) : null}

          <Text style={cardLabel}>Preferred time</Text>
          <Text style={cardValue}>{preferredTime ?? "Flexible"}</Text>

          {notes ? (
            <>
              <Text style={cardLabel}>Notes</Text>
              <Text style={cardValue}>{notes}</Text>
            </>
          ) : null}
        </Section>

        <Text style={text}>
          Open ClinicPro to convert this into a confirmed appointment.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingLeadEmail,
  subject: (data: Record<string, unknown>) =>
    `New booking — ${data.clientName ?? "anonymous"}${data.serviceName ? ` · ${data.serviceName}` : ""}`,
  displayName: "Booking notification (clinic)",
  previewData: {
    clientName: "Jordan Lee",
    clientEmail: "jordan@example.com",
    clientPhone: "+1 555 123 4567",
    clinicName: "Aurora Aesthetics",
    serviceName: "Botox consultation",
    preferredTime: "Friday, May 3 at 2:00 PM",
    staffName: "Dr. Maya Chen",
    notes: "First-time client, prefers afternoon slots.",
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
  fontSize: "26px",
  fontWeight: 600,
  color: "#0a0a0b",
  margin: "0 0 14px",
  letterSpacing: "-0.01em",
};
const lead = {
  fontSize: "15px",
  color: "#3f3f46",
  lineHeight: "1.6",
  margin: "0 0 22px",
};
const text = {
  fontSize: "14px",
  color: "#52525b",
  lineHeight: "1.6",
  margin: "12px 0 0",
};
const card = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  padding: "20px 22px",
  margin: "0 0 22px",
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
