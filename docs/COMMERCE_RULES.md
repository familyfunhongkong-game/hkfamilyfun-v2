# HK Family Fun Commerce Rules

## Current commercial rule

HK Family Fun separates discovery from promotion.

### Free
- Merchant registration
- Create and edit normal event listings
- Upload event details and images
- Submit an event for platform review
- Publish approved normal event listings

Normal event listing must never require a promotion payment.

### Paid
- Homepage banner / hero
- Featured placement
- Sponsored promotion
- Sponsored content

Paid promotion is separate from event listing. A merchant banner must not become publicly active until payment has been confirmed by HK Family Fun. Platform house promotions for HK Family Fun itself are exempt.

## Current ticketing rule

HK Family Fun is currently a discovery/sharing platform. Event registration and payment continue on the organizer's own official booking channel.

## Future: Sell with Family Fun

Sell with Family Fun stays disabled by default.

Activation gate:
1. Meaningful parent traffic and repeat usage
2. Sufficient active merchants
3. Stripe account and production payment configuration completed
4. Marketplace onboarding / KYC flow completed
5. Order, refund, dispute, payout and reconciliation QA completed
6. Legal terms, refund policy and merchant settlement rules approved
7. End-to-end production test completed before public launch

Planned payment architecture:

Customer -> HK Family Fun Checkout -> Payment Processor -> Order -> Ticket -> Platform Fee -> Merchant Payout

The production feature flag is:

`NEXT_PUBLIC_ENABLE_SELL_WITH_FAMILY_FUN=true`

Do not enable this flag merely because the UI exists. It should only be enabled after the full payment and settlement workflow is production-ready.
