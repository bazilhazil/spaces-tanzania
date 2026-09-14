import * as React from 'react'
import { Text } from '@react-email/components'
import { Shell, styles, SITE_URL } from './_layout'
import type { TemplateEntry } from './registry'

const Email = () => (
  <Shell
    preview="SPACES production email test"
    heading="SPACES Production Email Test"
    ctaLabel="Open SPACES"
    ctaUrl={SITE_URL}
  >
    <Text style={styles.text}>Your SPACES production email system is working correctly.</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'SPACES Production Email Test',
  displayName: 'Admin production email test',
} satisfies TemplateEntry
