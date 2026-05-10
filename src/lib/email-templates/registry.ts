import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as bookingConfirmation } from './booking-confirmation'
import { template as bookingLeadInternal } from './booking-lead-internal'
import { template as paymentFailed } from './payment-failed'
import { template as reviewRequest } from './review-request'
import { template as negativeReviewAlert } from './negative-review-alert'
import { template as consentRequest } from './consent-request'
import { template as directMessage } from './direct-message'
import { template as giftCardDelivery } from './gift-card-delivery'
import { template as membershipWelcome } from './membership-welcome'
import { template as membershipChargeSuccess } from './membership-charge-success'
import { template as membershipChargeFailed } from './membership-charge-failed'
import { template as membershipPaused } from './membership-paused'
import { template as membershipCanceled } from './membership-canceled'

/**
 * Template registry — maps template names to their React Email components.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'booking-lead-internal': bookingLeadInternal,
  'payment-failed': paymentFailed,
  'review-request': reviewRequest,
  'negative-review-alert': negativeReviewAlert,
  'consent-request': consentRequest,
  'direct-message': directMessage,
  'gift-card-delivery': giftCardDelivery,
  'membership-welcome': membershipWelcome,
  'membership-charge-success': membershipChargeSuccess,
  'membership-charge-failed': membershipChargeFailed,
  'membership-paused': membershipPaused,
  'membership-canceled': membershipCanceled,
}
