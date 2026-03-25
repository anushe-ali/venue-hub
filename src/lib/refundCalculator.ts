/**
 * Refund Calculator
 * Calculates refund amount based on cancellation policy and timing
 */

export interface CancellationPolicy {
  // Days before event -> Refund percentage
  rules: {
    daysBeforeEvent: number
    refundPercentage: number
  }[]
}

// Default cancellation policy
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  rules: [
    { daysBeforeEvent: 30, refundPercentage: 100 }, // 30+ days: 100% refund
    { daysBeforeEvent: 14, refundPercentage: 75 },  // 14-29 days: 75% refund
    { daysBeforeEvent: 7, refundPercentage: 50 },   // 7-13 days: 50% refund
    { daysBeforeEvent: 3, refundPercentage: 25 },   // 3-6 days: 25% refund
    { daysBeforeEvent: 0, refundPercentage: 0 },    // < 3 days: no refund
  ]
}

/**
 * Calculate refund amount based on cancellation timing
 */
export function calculateRefundAmount(
  eventDate: string,
  totalPaid: number,
  policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY
): {
  refundAmount: number
  refundPercentage: number
  daysUntilEvent: number
  policyRule: string
} {
  // Calculate days until event
  const now = new Date()
  const event = new Date(eventDate)
  const daysUntilEvent = Math.ceil((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Find applicable refund percentage
  // Rules are sorted by daysBeforeEvent in descending order
  const sortedRules = [...policy.rules].sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent)

  let refundPercentage = 0
  let policyRule = 'No refund'

  for (const rule of sortedRules) {
    if (daysUntilEvent >= rule.daysBeforeEvent) {
      refundPercentage = rule.refundPercentage
      if (refundPercentage === 100) {
        policyRule = `Full refund (${daysUntilEvent} days before event)`
      } else if (refundPercentage > 0) {
        policyRule = `${refundPercentage}% refund (${daysUntilEvent} days before event)`
      } else {
        policyRule = `No refund (less than ${rule.daysBeforeEvent} days before event)`
      }
      break
    }
  }

  const refundAmount = Math.round((totalPaid * refundPercentage) / 100)

  return {
    refundAmount,
    refundPercentage,
    daysUntilEvent,
    policyRule
  }
}

/**
 * Get cancellation policy details as formatted text
 */
export function getCancellationPolicyText(policy: CancellationPolicy = DEFAULT_CANCELLATION_POLICY): string {
  const rules = [...policy.rules].sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent)
  const lines: string[] = []

  for (let i = 0; i < rules.length - 1; i++) {
    const current = rules[i]
    const next = rules[i + 1]

    if (current.daysBeforeEvent === next.daysBeforeEvent + 1) {
      lines.push(`• ${current.daysBeforeEvent}+ days before: ${current.refundPercentage}% refund`)
    } else {
      lines.push(`• ${next.daysBeforeEvent + 1}-${current.daysBeforeEvent} days before: ${current.refundPercentage}% refund`)
    }
  }

  // Last rule
  const lastRule = rules[rules.length - 1]
  if (lastRule.daysBeforeEvent > 0) {
    lines.push(`• Less than ${lastRule.daysBeforeEvent} days: ${lastRule.refundPercentage}% refund`)
  }

  return lines.join('\n')
}
