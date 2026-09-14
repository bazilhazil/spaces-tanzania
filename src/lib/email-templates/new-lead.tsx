import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  propertyLocation?: string
  contactMethod?: string
  message?: string
  buyerName?: string
  leadsUrl?: string
}

const Email = ({ propertyTitle, propertyLocation, contactMethod, message, buyerName, leadsUrl }: Props) => (
  <Shell
    preview={`New inquiry for ${propertyTitle ?? 'your space'}`}
    heading="You have a new inquiry"
    ctaLabel="View inquiry"
    ctaUrl={leadsUrl ?? `${SITE_URL}/leads`}
  >
    <Text style={styles.text}>
      {buyerName ? `${buyerName} is` : 'Someone is'} interested in your space on SPACES. Respond
      quickly to keep the lead warm.
    </Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Location" value={propertyLocation} />
      <Detail label="Contact method" value={contactMethod} />
      <Detail label="Message" value={message} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d['propertyTitle'] ? `New inquiry: ${d['propertyTitle']}` : 'New inquiry on SPACES',
  displayName: 'New inquiry (owner/agent)',
  previewData: {
    propertyTitle: '3 Bedroom Apartment',
    propertyLocation: 'Masaki, Dar es Salaam',
    contactMethod: 'Message',
    message: 'Is this still available?',
    buyerName: 'A SPACES member',
  },
} satisfies TemplateEntry
