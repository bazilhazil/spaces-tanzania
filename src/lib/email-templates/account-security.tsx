import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  headline?: string
  detail?: string
  occurredAt?: string
}

const Email = ({ headline, detail, occurredAt }: Props) => (
  <Shell
    preview="Important update about your SPACES account"
    heading={headline || 'Important account update'}
    ctaLabel="Open SPACES"
    ctaUrl={`${SITE_URL}/dashboard`}
  >
    <Text style={styles.text}>
      We are letting you know about a change to your SPACES account. If this wasn't you, contact
      SPACES support straight away.
    </Text>
    <Section style={styles.card}>
      <Detail label="What happened" value={detail} />
      <Detail label="When" value={occurredAt} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d['headline'] || 'Important update about your SPACES account',
  displayName: 'Account / security notice',
  previewData: { headline: 'Your account was suspended', detail: 'Please contact SPACES support.' },
} satisfies TemplateEntry
