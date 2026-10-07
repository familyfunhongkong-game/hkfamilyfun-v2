# HK Family Fun Merchant Operations

## Standard merchant lifecycle

1. Merchant registers with business name, contact person, email and password.
2. Merchant accepts Merchant Terms and Privacy Policy.
3. Supabase verifies the merchant email.
4. Merchant profile is created as `pending`.
5. Admin reviews the merchant profile.
6. Only a complete profile with legal acceptance can become `approved`.
7. Approved merchant creates event drafts.
8. Merchant previews and submits a complete event.
9. Submitted event becomes read-only to the merchant.
10. Admin either rejects it for revision or approves it.
11. Approved event is still private.
12. Admin performs the final publish action.
13. Only `published` events that pass the public-view date rules appear to families.

## Event state model

`draft -> submitted -> approved -> published -> archived`

Revision path:

`submitted -> rejected -> draft/submitted`

Merchants can only edit/delete their own `draft` or `rejected` events.

## What merchant profile fields can merchants edit?

Allowed:
- Business name
- Contact name
- Contact email
- Contact phone
- Website
- Description

Platform-controlled:
- Merchant ID
- Owner user ID
- Approval status
- Rejection/review reason
- Account creation timestamp
- Merchant Terms acceptance record
- Privacy acceptance record

## Notifications

Automatic notification intentions:
- Pending merchant -> Admin
- Merchant submits event -> Admin
- Merchant approved/rejected/suspended -> Merchant
- Event approved/published/rejected/archived -> Merchant

Notification delivery must not block the business transaction. A successful DB status update remains successful even if email delivery later fails.

## Operating principle

HK Family Fun keeps normal event listing and paid promotion as separate products.

- Normal merchant event listing is free.
- Uploading event information and images is free.
- Submission, approval and normal publication are free.
- Banner, Featured and Sponsored exposure are paid advertising products.
- A merchant advertisement must not be activated publicly until HK Family Fun confirms payment.
- HK Family Fun house promotions are not merchant advertisements and do not require an advertising payment.

HK Family Fun is currently a discovery/sharing platform. Registration and payment remain with the organizer. The platform does not process event tickets or customer payments yet.

`Sell with Family Fun` is reserved for a later growth stage and stays disabled until checkout, orders, refunds, merchant onboarding/KYC, commission, payout and reconciliation are fully production-ready.
