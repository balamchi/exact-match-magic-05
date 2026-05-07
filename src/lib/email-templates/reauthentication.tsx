import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
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
    <Head />
    <Preview>Your verification code for ClinicPro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>✦ ClinicPro</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Your verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Section style={codeSection}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
        <Text style={footerBrand}>© {new Date().getFullYear()} ClinicPro. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",
}
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '10px' }
const logoText = { fontSize: '20px', fontWeight: '700' as const, color: '#9333EA', margin: '0' }
const divider = { borderColor: '#eee', margin: '20px 0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0A0A0B', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3c3c3c', lineHeight: '1.6', margin: '0 0 20px' }
const codeSection = {
  textAlign: 'center' as const,
  backgroundColor: '#f4f0ff',
  borderRadius: '10px',
  padding: '20px',
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '32px',
  fontWeight: '700' as const,
  color: '#9333EA',
  letterSpacing: '6px',
  margin: '0',
}
const footer = { fontSize: '13px', color: '#999', margin: '0 0 8px' }
const footerBrand = { fontSize: '12px', color: '#bbb', margin: '0' }
