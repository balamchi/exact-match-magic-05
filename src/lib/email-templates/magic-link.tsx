import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName = 'ClinicPro',
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>✦ {siteName}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to securely log in to your {siteName} dashboard.
          This link will expire shortly.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Log In to {siteName}
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>© {new Date().getFullYear()} {siteName}. All rights reserved.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#9333EA',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#999', margin: '0 0 8px' }
const footerBrand = { fontSize: '12px', color: '#bbb', margin: '0' }
