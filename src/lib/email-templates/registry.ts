import type { ComponentType } from 'react'

import { template as adminTest } from './admin-test'
import { template as newLead } from './new-lead'
import { template as viewingRequest } from './viewing-request'
import { template as viewingUpdate } from './viewing-update'
import { template as dealUpdate } from './deal-update'
import { template as propertyApproved } from './property-approved'
import { template as propertyChanges } from './property-changes'
import { template as paymentConfirmation } from './payment-confirmation'
import { template as accountSecurity } from './account-security'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/** Template registry — maps template names to their React Email components. */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-test': adminTest,
  'new-lead': newLead,
  'viewing-request': viewingRequest,
  'viewing-update': viewingUpdate,
  'deal-update': dealUpdate,
  'property-approved': propertyApproved,
  'property-changes': propertyChanges,
  'payment-confirmation': paymentConfirmation,
  'account-security': accountSecurity,
}
