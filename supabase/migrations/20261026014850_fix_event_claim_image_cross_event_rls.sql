-- Already applied to production via Supabase migration 20261026014850.
-- Tested in disposable rollback-only transactions on staging.
-- Do NOT use routine db:push until GitHub issue #52 migration drift is resolved.
DROP POLICY IF EXISTS "verified organizers propose images"
  ON public.event_claim_image_proposals;

CREATE POLICY "verified organizers propose images"
  ON public.event_claim_image_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = (SELECT auth.uid())
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.event_claim_requests c
      WHERE c.id = event_claim_image_proposals.claim_id
        AND c.event_id = event_claim_image_proposals.event_id
        AND c.claimant_user_id = (SELECT auth.uid())
        AND c.status = 'approved'
    )
  );
