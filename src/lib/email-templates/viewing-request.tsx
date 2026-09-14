import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  propertyLocation?: string
  scheduledAt?: string
  message?: string
  viewingsUrl?: string
}

const Email = ({ propertyTitle, propertyLocation, scheduledAt, message, viewingsUrl }: Props) => (
  <Shell
    preview={`Viewing request for ${propertyTitle ?? 'your space'}`}
    heading="New viewing request"
    ctaLabel="Review request"
    ctaUrl={viewingsUrl ?? `${SITE_URL}/viewings`}
  >
    <Text style={styles.text}>
      A SPACES member has asked to view your space. Confirm or propose another time.
    </Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Location" value={propertyLocation} />
      <Detail label="Requested time" value={scheduledAt} />
      <Detail label="Note" value={message} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d['propertyTitle'] ? `Viewing request: ${d['propertyTitle']}` : 'New viewing request on SPACES',
  displayName: 'Viewing request (owner/agent)',
  previewData: {
    propertyTitle: '3 Bedroom Apartment',
    propertyLocation: 'Masaki, Dar es Salaam',
    scheduledAt: 'Friday, 12 June 2026 at 10:00',
  },
} satisfies TemplateEntry
