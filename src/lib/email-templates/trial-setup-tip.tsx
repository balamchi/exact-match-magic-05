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
import { BRAND } from "@/lib/brand";
import type { TemplateEntry } from "./registry";

interface Props {
  firstName: string;
  appUrl: string;
}

const TrialSetupTipEmail = ({ firstName, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Add your services first — everything else flows from there</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{BRAND.displayName}</Text>
        <Heading style={h1}>
          3 days in, {firstName} — here&rsquo;s the one thing that matters most
        </Heading>
        <Text style={lead}>
          The #1 thing clinics get wrong in setup is skipping the services catalog. Without
          services configured, calendar slots can&rsquo;t be booked online, invoices can&rsquo;t
          be generated, and your reports won&rsquo;t show revenue.
        </Text>
        <Text style={lead}>
          Take five minutes to add your top three services and prices — the rest of ClinicPro
          comes alive the moment you do.
        </Text>

        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button href={`${appUrl}/app/services`} style={btn}>
            Add your services
          </Button>
        </Section>

        <Text style={text}>
          Stuck?{" "}
          <Link href={`mailto:${BRAND.supportEmail}`} style={link}>
            Reply and we&rsquo;ll set it up for you free.
          </Link>
        </Text>

        <Text style={signoff}>— The ClinicPro team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TrialSetupTipEmail,
  subject: "One tip to get the most out of ClinicPro",
  displayName: "Trial setup tip (Day 3)",
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
  fontSize: "26px",
  fontWeight: 600,
  color: "#ffffff",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
  lineHeight: "1.3",
};
const lead = { fontSize: "15px", color: "#a1a1aa", lineHeight: "1.6", margin: "0 0 16px" };
const text = { fontSize: "14px", color: "#a1a1aa", lineHeight: "1.6", margin: "20px 0" };
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
const link = { color: "#9333ea", textDecoration: "underline" };
const signoff = { fontSize: "14px", color: "#a1a1aa", margin: "32px 0 0" };
