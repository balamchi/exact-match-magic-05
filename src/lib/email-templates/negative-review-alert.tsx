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

interface NegativeReviewAlertProps {
  clinicName?: string;
  rating?: number;
  title?: string;
  body?: string;
  clientName?: string;
  submittedAt?: string;
}

const NegativeReviewAlertEmail = ({
  clinicName,
  rating = 1,
  title,
  body,
  clientName,
  submittedAt,
}: NegativeReviewAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      ⚠️ {String(rating)}★ review received at {clinicName ?? "your clinic"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Negative Review Alert</Heading>
        <Text style={lead}>
          A {rating}-star review was just submitted at{" "}
          <strong>{clinicName ?? "your clinic"}</strong>. Please review and
          follow up.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Rating</Text>
          <Text style={cardValue}>{"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating}/5)</Text>

          {clientName && (
            <>
              <Text style={cardLabel}>Client</Text>
              <Text style={cardValue}>{clientName}</Text>
            </>
          )}

          {title && (
            <>
              <Text style={cardLabel}>Title</Text>
              <Text style={cardValue}>{title}</Text>
            </>
          )}

          {body && (
            <>
              <Text style={cardLabel}>Feedback</Text>
              <Text style={cardValue}>{body}</Text>
            </>
          )}

          {submittedAt && (
            <>
              <Text style={cardLabel}>Submitted</Text>
              <Text style={cardValue}>{submittedAt}</Text>
            </>
          )}
        </Section>

        <Text style={text}>
          View and respond to this review in your ClinicPro dashboard under
          Reviews.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: NegativeReviewAlertEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ ${data.rating ?? 1}★ review alert — ${data.clinicName ?? "Your Clinic"}`,
  displayName: "Negative review alert (internal)",
  previewData: {
    clinicName: "Aurora Aesthetics",
    rating: 2,
    title: "Not satisfied",
    body: "The wait time was very long and I didn't feel listened to.",
    clientName: "Jane Doe",
    submittedAt: "May 7, 2026 at 3:14 PM",
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
  fontSize: "24px",
  fontWeight: 600,
  color: "#dc2626",
  margin: "0 0 16px",
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
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "20px 22px",
  margin: "0 0 26px",
};
const cardLabel = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#dc2626",
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
