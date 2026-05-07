import * as React from 'react'

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
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName = 'ClinicPro',
  siteUrl = 'https://clinicpro.io',
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
      `}</style>
    </Head>
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>✦ ClinicPro</Text>
          <Text style={tagline}>Run a clinic, not software</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            . Click the button below to accept the invitation and create your account.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              Accept Invitation
            </Button>
          </Section>
        </Section>
        <Section style={footerSection}>
          <Text style={footerDismiss}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>
          <Text style={footer}>© 2026 ClinicPro · clinicpro.io</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
  color: '#9333EA',
  margin: '0 0 4px',
}
const tagline = { fontSize: '13px', color: '#888', margin: '0', fontStyle: 'italic' as const }
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
const text = { fontSize: '15px', color: '#d1d1d1', lineHeight: '1.65', margin: '0 0 18px' }
const link = { color: '#D946EF', textDecoration: 'underline' }
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
const footerSection = { textAlign: 'center' as const, padding: '24px 0 0' }
const footerDismiss = { fontSize: '13px', color: '#666', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#555', margin: '0' }
