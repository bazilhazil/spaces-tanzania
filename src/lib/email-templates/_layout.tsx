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

export const SITE_URL = 'https://spacestz.com'
export const SUPPORT_EMAIL = 'info@spacestz.com'
export const BRAND = '#1f3a63'
export const GOLD = '#c99a3d'

export const styles = {
  main: { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' },
  container: { padding: '24px', maxWidth: '560px', margin: '0 auto' },
  brand: {
    fontSize: '20px',
    letterSpacing: '3px',
    fontWeight: 'bold' as const,
    color: BRAND,
    margin: '0',
  },
  tagline: { fontSize: '12px', color: GOLD, margin: '2px 0 24px', letterSpacing: '1px' },
  h1: { fontSize: '20px', fontWeight: 'bold' as const, color: '#101828', margin: '0 0 16px' },
  text: { fontSize: '15px', color: '#475467', lineHeight: '1.6', margin: '0 0 16px' },
  small: { fontSize: '12px', color: '#98a2b3', lineHeight: '1.6', margin: '0 0 6px' },
  card: {
    border: '1px solid #e4e7ec',
    borderRadius: '12px',
    padding: '16px',
    margin: '0 0 20px',
  },
  label: { fontSize: '12px', color: '#98a2b3', margin: '0' },
  value: { fontSize: '15px', color: '#101828', margin: '0 0 12px', fontWeight: 'bold' as const },
  button: {
    backgroundColor: BRAND,
    color: '#ffffff',
    fontSize: '15px',
    borderRadius: '10px',
    padding: '12px 22px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  hr: { borderColor: '#e4e7ec', margin: '28px 0 16px' },
  link: { color: BRAND },
}

export function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <Section>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </Section>
  )
}

interface ShellProps {
  preview: string
  heading: string
  children: React.ReactNode
  ctaLabel?: string
  ctaUrl?: string
}

/** Shared SPACES email shell — brand header, content, support footer. */
export function Shell({ preview, heading, children, ctaLabel, ctaUrl }: ShellProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Text style={styles.brand}>SPACES</Text>
          <Text style={styles.tagline}>Find Your Perfect Space.</Text>
          <Heading style={styles.h1}>{heading}</Heading>
          {children}
          {ctaLabel && ctaUrl ? (
            <Button style={styles.button} href={ctaUrl}>
              {ctaLabel}
            </Button>
          ) : null}
          <Hr style={styles.hr} />
          <Text style={styles.small}>SPACES GROUP LTD — Dar es Salaam, Tanzania</Text>
          <Text style={styles.small}>
            Need help? <Link href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</Link>
            {' · '}
            <Link href={SITE_URL} style={styles.link}>spacestz.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
