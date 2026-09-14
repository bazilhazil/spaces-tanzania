import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  amount?: string
  reference?: string
  description?: string
  paidAt?: string
}

const Email = ({ amount, reference, description, paidAt }: Props) => (
  <Shell
    preview="Your SPACES payment is confirmed"
    heading="Payment confirmed"
    ctaLabel="View billing"
    ctaUrl={`${SITE_URL}/billing`}
  >
    <Text style={styles.text}>Thank you — your payment to SPACES has been confirmed.</Text>
    <Section style={styles.card}>
      <Detail label="Amount" value={amount} />
      <Detail label="For" value={description} />
      <Detail label="Reference" value={reference} />
      <Detail label="Paid on" value={paidAt} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Your SPACES payment is confirmed',
  displayName: 'Payment confirmation',
  previewData: { amount: 'TZS 50,000', reference: 'SPC-000123', description: 'Featured listing' },
} satisfies TemplateEntry
