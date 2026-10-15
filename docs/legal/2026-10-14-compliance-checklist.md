# HK Family Fun — legal publishing and operations checklist (2026-10-14)

## Scope and provenance
Updated legal pages are based on the pre-existing HK Family Fun Privacy, Terms, Merchant Terms, Disclaimer and Data Deletion documents and the current family-event discovery/listing business model. They are not adapted wholesale from Klook's transaction-based booking terms. The operative versions are `lib/legal/privacy.ts`, `terms.ts`, `merchant-terms.ts`, `disclaimer.ts`, and `deletion.ts`. The same 3 locales (`zh-Hant`, `en`, `zh-Hans`) are rendered at existing public URLs; language choice comes from `hkff_locale`.

## Changes made
- Expanded Personal Information Collection Statement, purposes, optional/required fields, recipient classes, access/correction, overseas processing, direct marketing and minors.
- Separated essential service notifications from direct marketing. Sign-up **does not** imply marketing opt-in.
- Identified Peyto Dev Hub Limited as stated in the existing Merchant Terms. Its legal registration number and registered address have **not** been independently verified.
- Explicitly distinguished platform event discovery from third-party bookings/payments/refunds. No suggestion of an active platform ticketing/escrow product.
- Added balanced limits subject to mandatory consumer and negligence protections, not blanket immunity.
- Required merchant rights to images, children's likenesses, SEN/accessibility statements, event information and clear sponsored labeling.
- Explained email-based data deletion request and permitted retention exceptions, without claiming self-service deletion exists.
- Updated merchant legal acceptance version keys to 2026-10-14, retaining existing audit fields and reacceptance UI. Avoid retroactive mutation of recorded acceptances.

## Operational compliance requirements requiring owner's confirmation
1. **Operator legal identity:** Verify Peyto Dev Hub Limited exact registered name, applicable company registration/business registration details, registered office, correspondence address and data protection enquiry contact. Add appropriate publicly disclosed address if required or recommended by Hong Kong counsel.
2. **Data inventory:** Confirm actual Supabase/Vercel/Auth/Resend/Analytics providers, collected fields, storage regions, access roles, subprocessors, retention schedule and logging. The policy describes potential collection and must not be read as proof of each processing activity.
3. **Direct marketing:** Audit every registration and newsletter form. Provide clearly separate optional marketing consent (not pre-ticked); store time, version, purposes and choice. Do not send promotional messages merely because someone accepted Terms. Verify unsubscribe effectiveness and suppression list.
4. **Collection notice:** Personal Information Collection Notice is displayed at both merchant email registration and completion flow; review any other entry points where personal data is first collected.
5. **Children and SEN:** Do not solicit unnecessary children's medical diagnoses. For identifiable children's images, verify parental/guardian or lawful authorization and takedown process; do not claim SEN/accessibility certification.
6. **Cookies and analytics:** Audit non-essential trackers and actual cookie choice/notice to align with disclosures; policy alone does not install controls.
7. **Data deletion:** Define and actually operate a secure manual workflow for verification, permitted retention, deletion in Supabase Auth and database/storage where appropriate, social login data and vendor requests. Track requests and responses; do not request passwords/OTP.
8. **Merchant material changes:** Verify that modifying a published activity requires admin review where appropriate; policy alone does not enforce this workflow.
9. **Advertising:** Before taking money, publish/agree a separate written order or invoice with price, deliverables, start/end, changes, cancellation, refund policy and sponsored labeling. Native ticket sales require new separate legal terms.
10. **Security and breach response:** Test actual access control, audit logging, deletion and notification procedures; policy does not guarantee operational compliance.
11. **Lawyer review:** Have a Hong Kong-qualified lawyer review all five documents and live flows before representing the site as fully legally compliant, especially limitations/indemnity, direct marketing, cross-border operations and company identity.

## Official references
- Hong Kong Privacy Commissioner for Personal Data: Personal Information Collection Statement — https://www.pcpd.org.hk/english/about_pcpd/personal_information_collection_statement/personal_information_collection_statement.html
- PCPD Guidance on Direct Marketing — https://www.pcpd.org.hk/english/publications/files/GN_DM_e.pdf
- Hong Kong Consumer Council: Unfair Terms in Standard Form Consumer Contracts — https://www.consumer.org.hk/en/advocacy/study-report/20120403
- Hong Kong Consumer Council: Consumer Protection / Control of Exemption Clauses Ordinance (Cap. 71) — https://www.consumer.org.hk/en/consumer-protection/consumer-protection

**Status:** legal text is a commercially tailored drafting and engineering deliverable, not a law firm's formal legal opinion or certification of operational compliance.
