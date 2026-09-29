"use strict";

import { createClient } from "@supabase/supabase-js";

const url = "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const publishableKey =
  "sb_publishable_w2KLFSsWv5uKFEmUC4ABLA_DvHEAhdX";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `hkff-e2e-${Date.now()}@example.com`;
const password = `E2e-${Date.now()}-Aa!9`;

let userId = "";
let merchantId = "";
let eventId = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  if (eventId) {
    await admin.from("events").delete().eq("id", eventId);
  }
  if (merchantId) {
    await admin.from("merchants").delete().eq("id", merchantId);
  }
  if (userId) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: "merchant",
        display_name: "HKFF E2E Contact",
        business_name: "HKFF E2E Merchant",
        contact_name: "HKFF E2E Contact",
        contact_phone: "00000000",
        website_url: "https://example.com",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2026-09-28",
        privacy_accepted: true,
        privacy_accepted_at: new Date().toISOString(),
        privacy_version: "2026-09-28",
      },
    });

    if (created.error || !created.data.user) {
      throw new Error("Create test user failed: " + created.error?.message);
    }

    userId = created.data.user.id;

    const merchantResult = await admin
      .from("merchants")
      .select("*")
      .eq("owner_user_id", userId)
      .single();

    if (merchantResult.error || !merchantResult.data) {
      throw new Error(
        "Merchant trigger failed: " + merchantResult.error?.message,
      );
    }

    merchantId = merchantResult.data.id;

    assert(merchantResult.data.status === "pending", "Merchant must start pending");
    assert(
      Boolean(merchantResult.data.terms_accepted_at) &&
        Boolean(merchantResult.data.privacy_accepted_at),
      "Legal acceptance audit fields were not created",
    );

    const merchantClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const signedIn = await merchantClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signedIn.error || !signedIn.data.session) {
      throw new Error("Test merchant sign-in failed: " + signedIn.error?.message);
    }

    const blockedInsert = await merchantClient.from("events").insert({
      merchant_id: merchantId,
      title_tc: "HKFF E2E pending merchant event",
      status: "draft",
    });

    assert(
      Boolean(blockedInsert.error),
      "Pending merchant unexpectedly created an event",
    );

    const approvedMerchant = await admin
      .from("merchants")
      .update({ status: "approved", rejection_reason: null })
      .eq("id", merchantId)
      .select("id,status")
      .single();

    if (approvedMerchant.error) {
      throw new Error(
        "Admin merchant approval failed: " + approvedMerchant.error.message,
      );
    }
    assert(
      approvedMerchant.data.status === "approved",
      "Merchant did not become approved",
    );

    const draft = await merchantClient
      .from("events")
      .insert({
        merchant_id: merchantId,
        title_tc: "HKFF E2E Merchant Event",
        title: "HKFF E2E Merchant Event",
        status: "draft",
        start_date: "2030-01-15",
        end_date: "2030-01-15",
        venue_name: "HKFF E2E Test Venue",
        district: "中西區",
        cover_image_url: "https://example.com/hkff-e2e.jpg",
        gallery_image_urls: [],
        price_display_mode: "free",
        price_label: "免費",
        is_free: true,
        cta_type: "none",
        registration_required: false,
      })
      .select("id,status")
      .single();

    if (draft.error || !draft.data) {
      throw new Error("Approved merchant draft insert failed: " + draft.error?.message);
    }

    eventId = draft.data.id;
    assert(draft.data.status === "draft", "Event must start as draft");

    const submitted = await merchantClient
      .from("events")
      .update({ status: "submitted" })
      .eq("id", eventId)
      .select("id,status,submitted_at")
      .single();

    if (submitted.error) {
      throw new Error("Merchant submit failed: " + submitted.error.message);
    }
    assert(submitted.data.status === "submitted", "Event did not submit");
    assert(Boolean(submitted.data.submitted_at), "submitted_at was not recorded");

    const forbiddenPublish = await merchantClient
      .from("events")
      .update({ status: "published" })
      .eq("id", eventId)
      .select("id,status")
      .maybeSingle();

    const statusAfterAttack = await admin
      .from("events")
      .select("id,status")
      .eq("id", eventId)
      .single();

    if (statusAfterAttack.error) {
      throw new Error(
        "Could not verify status after merchant publish attempt: " +
          statusAfterAttack.error.message,
      );
    }

    assert(
      statusAfterAttack.data.status === "submitted",
      "Merchant unexpectedly changed submitted event status",
    );

    assert(
      !forbiddenPublish.data || forbiddenPublish.data.status !== "published",
      "Merchant publish attempt returned a published row",
    );

    const approvedEvent = await admin
      .from("events")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        admin_review_note: "E2E approved",
      })
      .eq("id", eventId)
      .select("id,status")
      .single();

    if (approvedEvent.error) {
      throw new Error("Admin event approval failed: " + approvedEvent.error.message);
    }

    const hiddenBeforePublish = await merchantClient
      .from("public_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    assert(
      !hiddenBeforePublish.data,
      "Approved-but-unpublished event leaked to public_events",
    );

    const published = await admin
      .from("events")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        admin_review_note: "E2E published",
      })
      .eq("id", eventId)
      .select("id,status")
      .single();

    if (published.error) {
      throw new Error("Admin publish failed: " + published.error.message);
    }

    const publicEvent = await merchantClient
      .from("public_events")
      .select("id,status,title_tc")
      .eq("id", eventId)
      .single();

    if (publicEvent.error || !publicEvent.data) {
      throw new Error(
        "Published event was not visible publicly: " + publicEvent.error?.message,
      );
    }

    assert(publicEvent.data.status === "published", "Public event status mismatch");

    console.log(
      JSON.stringify(
        {
          success: true,
          checks: [
            "signup_trigger_created_pending_merchant",
            "legal_acceptance_recorded",
            "pending_merchant_cannot_create_event",
            "admin_can_approve_merchant",
            "approved_merchant_can_create_draft",
            "merchant_can_submit_complete_event",
            "merchant_cannot_self_publish",
            "approved_event_not_public",
            "admin_can_publish",
            "published_event_public",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error("Cleanup failed:", cleanupError);
  }
  process.exit(1);
});
