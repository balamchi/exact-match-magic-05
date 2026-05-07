import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
      `}</style>
    </Head>
    <Preview>Your verification code for ClinicPro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>✦ ClinicPro</Text>
          <Text style={tagline}>Run a clinic, not software</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Your verification code</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Section style={codeSection}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        </Section>
        <Section style={footerSection}>
          <Text style={footerDismiss}>
            This code will expire shortly. If you didn't request this, you can
            safely ignore this email.
          </Text>
          <Text style={footer}>© 2026 ClinicPro · clinicpro.io</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeSection = {
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(217,70,239,0.15))',
  borderRadius: '12px',
  padding: '24px',
  margin: '8px 0 0',
  border: '1px solid rgba(147,51,234,0.3)',
}
const codeStyle = {
  fontFamily: "'JetBrains Mono', 'Fira Code', Courier, monospace",
  fontSize: '36px',
  fontWeight: '700' as const,
  color: '#D946EF',
  letterSpacing: '8px',
  margin: '0',
}
const footerSection = { textAlign: 'center' as const, padding: '24px 0 0' }
const footerDismiss = { fontSize: '13px', color: '#666', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#555', margin: '0' }
