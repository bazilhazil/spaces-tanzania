import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { Detail, Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  propertyTitle?: string
  stage?: string
  dealsUrl?: string
}

const Email = ({ propertyTitle, stage, dealsUrl }: Props) => (
  <Shell
    preview={`Deal update${propertyTitle ? ` for ${propertyTitle}` : ''}`}
    heading="Deal updated"
    ctaLabel="Open deal"
    ctaUrl={dealsUrl ?? `${SITE_URL}/deals`}
  >
    <Text style={styles.text}>A deal you are part of has moved to a new stage on SPACES.</Text>
    <Section style={styles.card}>
      <Detail label="Space" value={propertyTitle} />
      <Detail label="Stage" value={stage} />
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Deal update${d['propertyTitle'] ? `: ${d['propertyTitle']}` : ''}`,
  displayName: 'Deal update',
  previewData: { propertyTitle: '3 Bedroom Apartment', stage: 'Negotiating' },
} satisfies TemplateEntry
