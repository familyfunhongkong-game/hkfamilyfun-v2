# HK Family Fun — Private Claim Photo Storage (2026-10-28 UTC)

## Changes applied BEFORE this documentation

- Staging Supabase: `storage.buckets.event-claim-images.public=false`.
- Production Supabase: `storage.buckets.event-claim-images.public=false`.
- Both updates were limited to this one bucket, and had a guard requiring **zero existing objects**.
- Production at audit: zero event claim requests, zero image proposals, zero objects in claim bucket.
- Public `event-images`, `promo-banners`, and `banner-images` were not changed.
- Do not bulk alter buckets or publish pending photos.

## Why the temporary client-side feature freeze is necessary

The claimant-only upload screen previously stored `getPublicUrl(path)` for an unapproved uploaded image. A private bucket invalidates that URL and the Admin approval screen currently relies on it to preview. The claimant-only upload is therefore disabled in the route while manual, documented image requests can be mailed to `info@hkfamilyfun.com` for review. The normal Merchant Create Event editor uses `event-images` and stays enabled.

## Prerequisites to re-enable

1. Upload to a **private** bucket, saving validated storage object paths rather than public URLs.
2. Authenticated merchant may read own pending object via short-lived signed URL; Admin review receives a scoped signed preview URL.
3. Approved image must be copied to approved public `event-images` by a controlled server-only action, with audit log and copyright acknowledgement.
4. Reject, revoke and clean up pending objects without leaking or confusing published media.
5. Test tenant isolation, malicious file types, image size, revoked claim, deleted event, and concurrent review.
6. Confirm the normal approved Merchant event editor still uploads to its existing bucket.
7. No cost-incurring external media service required.

## Verification query

```sql
select id, public from storage.buckets where id in (
  'event-claim-images','event-images','promo-banners','banner-images'
);
select count(*) from storage.objects where bucket_id='event-claim-images';
```

The general upload flow and Admin/Merchant live browser E2E are still separate launch requirements. Production Maintenance Mode was not touched.
