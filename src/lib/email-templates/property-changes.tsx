import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  reason?: string
  outcome?: string
  manageUrl?: string
}

const Email = ({ propertyTitle, reason, outcome, manageUrl }: Props) => (
  <Shell
    preview={`${propertyTitle ?? 'Your space'} needs changes before it can be published`}
    heading="Your space needs changes"
    ctaLabel="Update your space"
    ctaUrl={manageUrl ?? `${SITE_URL}/dashboard/properties`}
  >
    <Text style={styles.text}>
      Your space needs changes before it can be published. Please review the note below and resubmit.
    </Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Decision" value={outcome} />
      <Detail label="Reason" value={reason} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d['propertyTitle'] ? `Changes needed: ${d['propertyTitle']}` : 'Your space needs changes',
  displayName: 'Property rejected / changes requested',
  previewData: { propertyTitle: '3 Bedroom Apartment', outcome: 'Changes requested', reason: 'Please add clearer photos.' },
} satisfies TemplateEntry
