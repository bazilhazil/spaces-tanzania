import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  propertyLocation?: string
  propertyUrl?: string
}

const Email = ({ propertyTitle, propertyLocation, propertyUrl }: Props) => (
  <Shell
    preview={`${propertyTitle ?? 'Your space'} is now published on SPACES`}
    heading="Your space is now live"
    ctaLabel="View your space"
    ctaUrl={propertyUrl ?? `${SITE_URL}/dashboard/properties`}
  >
    <Text style={styles.text}>
      Good news — your space has been approved by SPACES and is now visible to buyers and tenants.
    </Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Location" value={propertyLocation} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d['propertyTitle'] ? `Approved: ${d['propertyTitle']} is live` : 'Your space is now live on SPACES',
  displayName: 'Property approved (owner/agent)',
  previewData: { propertyTitle: '3 Bedroom Apartment', propertyLocation: 'Masaki, Dar es Salaam' },
} satisfies TemplateEntry
