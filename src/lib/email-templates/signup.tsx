import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName = 'ClinicPro',
  siteUrl = 'https://clinicpro.io',
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
      `}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>✦ ClinicPro</Text>
          <Text style={tagline}>Run a clinic, not software</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Thanks for signing up for{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            ! We're excited to help you run your clinic smarter.
          </Text>
          <Text style={text}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={linkSubtle}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={smallText}>
            This link will expire in 24 hours. If the button doesn't work, copy
            and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerDismiss}>
            If you didn't create an account with {siteName}, you can safely ignore this email.
          </Text>
          <Text style={footer}>© 2026 ClinicPro · clinicpro.io</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",
}
const container = { padding: '40px 16px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, padding: '0 0 24px' }
const logoText = {
  fontSize: '24px',
  fontWeight: '700' as const,
  fontFamily: "'Fraunces', Georgia, serif",
  background: 'linear-gradient(135deg, #9333EA, #D946EF)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: '#9333EA',
  margin: '0 0 4px',
}
const tagline = {
  fontSize: '13px',
  color: '#888',
  margin: '0',
  fontStyle: 'italic' as const,
}
const card = {
  backgroundColor: '#1A1A1A',
  borderRadius: '16px',
  padding: '36px 32px',
  border: '1px solid #2a2a2a',
}
const h1 = {
  fontSize: '26px',
  fontWeight: '700' as const,
  fontFamily: "'Fraunces', Georgia, serif",
  color: '#ffffff',
  margin: '0 0 20px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#d1d1d1',
  lineHeight: '1.65',
  margin: '0 0 18px',
}
const link = { color: '#D946EF', textDecoration: 'underline' }
const linkSubtle = { color: '#c084fc', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  background: 'linear-gradient(135deg, #9333EA, #D946EF)',
  backgroundColor: '#9333EA',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
}
const smallText = {
  fontSize: '13px',
  color: '#777',
  lineHeight: '1.5',
  margin: '0 0 6px',
}
const urlText = {
  fontSize: '12px',
  color: '#9333EA',
  wordBreak: 'break-all' as const,
  margin: '0',
}
const footerSection = { textAlign: 'center' as const, padding: '24px 0 0' }
const footerDismiss = { fontSize: '13px', color: '#666', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#555', margin: '0' }
