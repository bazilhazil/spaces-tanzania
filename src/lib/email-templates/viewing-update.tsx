import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  propertyLocation?: string
  scheduledAt?: string
  status?: string
  viewingsUrl?: string
}

const Email = ({ propertyTitle, propertyLocation, scheduledAt, status, viewingsUrl }: Props) => (
  <Shell
    preview={`Your viewing was ${status ?? 'updated'}`}
    heading={`Viewing ${status ?? 'updated'}`}
    ctaLabel="View details"
    ctaUrl={viewingsUrl ?? `${SITE_URL}/viewings`}
  >
    <Text style={styles.text}>Your viewing request on SPACES has been updated.</Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Location" value={propertyLocation} />
      <Detail label="Time" value={scheduledAt} />
      <Detail label="Status" value={status} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Viewing ${d['status'] ?? 'updated'}${d['propertyTitle'] ? `: ${d['propertyTitle']}` : ''}`,
  displayName: 'Viewing update (buyer)',
  previewData: { propertyTitle: '3 Bedroom Apartment', status: 'confirmed' },
} satisfies TemplateEntry
