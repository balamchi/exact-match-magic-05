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
import type { TemplateEntry } from "./registry";

const SITE_NAME = "ClinicPro";

interface ReviewRequestProps {
  firstName?: string;
  clinicName?: string;
  publicToken?: string;
  siteUrl?: string;
}

const ReviewRequestEmail = ({
  firstName,
  clinicName,
  publicToken,
  siteUrl = "https://clinicpro.io",
}: ReviewRequestProps) => {
  const reviewUrl = `${siteUrl}/reviews/${publicToken ?? "preview"}`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {firstName ? `${firstName}, how` : "How"} was your visit at{" "}
        {clinicName ?? "the clinic"}?
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Brand header */}
          <Text style={brandMark}>✦ {SITE_NAME}</Text>

          <Heading style={h1}>
            {firstName ? `Hi ${firstName}, how` : "How"} was your visit?
          </Heading>
          <Text style={lead}>
            We hope you had a great experience at{" "}
            <strong>{clinicName ?? "our clinic"}</strong>. Your feedback helps us
            improve and helps others discover us.
          </Text>

          {/* Star buttons */}
          <Section style={starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Link
                key={n}
                href={`${reviewUrl}?rating=${n}`}
                style={starLink}
              >
                <Text style={starText}>{"★".repeat(n)}{"☆".repeat(5 - n)}</Text>
                <Text style={starLabel}>{n === 1 ? "Poor" : n === 2 ? "Fair" : n === 3 ? "Good" : n === 4 ? "Great" : "Excellent"}</Text>
              </Link>
            ))}
          </Section>

          <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
            <Button href={reviewUrl} style={ctaButton}>
              Leave a Review
            </Button>
          </Section>

          <Text style={text}>
            It only takes a minute and means the world to our team. Thank you for
            choosing {clinicName ?? "us"}!
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
};

export const template = {
  component: ReviewRequestEmail,
  subject: (data: Record<string, any>) =>
    `${data.firstName ? `${data.firstName}, h` : "H"}ow was your visit${data.clinicName ? ` at ${data.clinicName}` : ""}?`,
  displayName: "Review request",
  previewData: {
    firstName: "Jordan",
    clinicName: "Aurora Aesthetics",
    publicToken: "abc123",
    siteUrl: "https://clinicpro.io",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  color: "#0a0a0b",
};
const container = {
  padding: "32px 28px",
  maxWidth: "560px",
  margin: "0 auto",
};
const brandMark = {
  fontSize: "14px",
  fontWeight: 700,
  background: "linear-gradient(135deg, #9333ea, #d946ef)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  color: "#9333ea",
  margin: "0 0 24px",
};
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
const starsRow = {
  textAlign: "center" as const,
  margin: "0 0 8px",
};
const starLink = {
  display: "inline-block" as const,
  textDecoration: "none",
  margin: "0 4px",
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1px solid #e4e4e7",
  backgroundColor: "#fafafa",
};
const starText = {
  fontSize: "18px",
  color: "#f59e0b",
  margin: "0",
  lineHeight: "1",
};
const starLabel = {
  fontSize: "10px",
  color: "#71717a",
  margin: "4px 0 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};
const ctaButton = {
  backgroundColor: "#9333ea",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
  display: "inline-block" as const,
};
const signoff = {
  fontSize: "14px",
  color: "#0a0a0b",
  margin: "28px 0 0",
};
