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

### Advertising enquiry workflow

Approved merchants can submit a paid advertising enquiry inside Merchant Portal.

1. Merchant chooses Banner / Featured / Sponsored placement.
2. Merchant submits campaign details without leaving HK Family Fun.
3. The server verifies the signed-in user owns an approved merchant account and has accepted the current Merchant Terms / Privacy Policy.
4. The enquiry is written to `merchant_advertising_orders` before any email is attempted. `request_id` is unique so a retry cannot create a duplicate order.
5. HK Family Fun receives an email notification when Resend is available. Email failure does **not** delete or invalidate the saved enquiry.
6. The merchant sees the saved request and lifecycle status in Merchant Portal.
7. Admin manages the durable lifecycle in Advertising CRM: `enquiry -> quoted -> payment_pending -> paid -> scheduled -> live -> completed`.
8. Only Admin can set quote/payment/schedule fields. A merchant cannot mark an order paid.
9. A campaign cannot be treated as Live until payment is confirmed and the order is linked to a Promotion Banner.
10. When Admin saves a paid linked order, Advertising CRM synchronizes the Banner commercial flag and schedule. Marking the order Live activates the linked paid Banner; refunded linked orders are paused. If Banner synchronization fails, the order stays saved but Promotion Manager's independent safety lock prevents accidental unpaid publication.
11. Promotion Banner activation continues to enforce the separate `is_paid` / house-promotion rule.

Submitting an enquiry does not reserve inventory, confirm payment, or guarantee publication.

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

Sell with Family Fun uses a two-part safety gate:

1. The code implementation gate must explicitly confirm that checkout, orders, refunds, disputes, merchant onboarding/KYC, platform fee, payout and reconciliation are implemented.
2. Only then may `NEXT_PUBLIC_ENABLE_SELL_WITH_FAMILY_FUN=true` request production activation.

At the current stage the code implementation gate is intentionally `false`. Changing the environment variable alone cannot enable ticketing. Admin System Health will flag an attempted environment activation while the implementation gate remains closed.

Do not open the implementation gate until the full payment and settlement workflow is production-ready and has passed end-to-end QA.
