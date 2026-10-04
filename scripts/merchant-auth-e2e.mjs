// Latest-main regression trigger: keep authenticated merchant/admin flow covered after launch hardening.
"use strict";

import { createClient } from "@supabase/supabase-js";

const url = "https://uiyrbqqvgnfhfdhedmav.supabase.co";
const publishableKey =
  "sb_publishable_w2KLFSsWv5uKFEmUC4ABLA_DvHEAhdX";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const siteUrl = process.env.SITE_URL || "https://hkfamilyfun-v2.vercel.app";
const requireNotification = process.env.REQUIRE_NOTIFICATION === "true";

if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `hkff-e2e-${Date.now()}@example.com`;
const password = `E2e-${Date.now()}-Aa!9`;
const recoveredPassword = `Recovered-${Date.now()}-Zz!7`;

let userId = "";
let merchantId = "";
let eventId = "";
let storagePath = "";
let tempStoragePath = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildSinglePagePdf(text) {
  const safeText = String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  const stream = `BT
/F1 18 Tf
72 720 Td
(${safeText}) Tj
ET
`;

  const objects = [
    `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`,
    `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`,
    `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
`,
    `4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`,
    `5 0 obj
<< /Length ${Buffer.byteLength(stream, "utf8")} >>
stream
${stream}endstream
endobj
`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n 
`;
  }

  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;

  return Buffer.from(pdf, "utf8");
}

async function cleanup() {
  const paths = [storagePath, tempStoragePath].filter(Boolean);
  if (paths.length) {
    await admin.storage.from("event-images").remove(paths);
  }
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
  const checks = [];
  let notificationSent = false;

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
    checks.push(
      "signup_trigger_created_pending_merchant",
      "legal_acceptance_recorded",
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
    checks.push("merchant_password_login");

    const blockedInsert = await merchantClient.from("events").insert({
      merchant_id: merchantId,
      title_tc: "HKFF E2E pending merchant event",
      status: "draft",
    });

    assert(
      Boolean(blockedInsert.error),
      "Pending merchant unexpectedly created an event",
    );
    checks.push("pending_merchant_cannot_create_event");

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
    checks.push("admin_can_approve_merchant");

    const draft = await merchantClient
      .from("events")
      .insert({
        merchant_id: merchantId,
        title_tc: "HKFF E2E Merchant Event",
        title_sc: "HKFF E2E 商户活动",
        title_en: "HKFF E2E Merchant Event",
        title: "HKFF E2E Merchant Event",
        short_description_tc: "HKFF E2E 測試活動",
        short_description_sc: "HKFF E2E 测试活动",
        short_description_en: "HKFF E2E test event",
        status: "draft",
        start_date: "2030-01-15",
        end_date: "2030-01-15",
        venue_name: "HKFF E2E Test Venue",
        venue_name_sc: "HKFF E2E Test Venue",
        venue_name_en: "HKFF E2E Test Venue",
        district: "中西區",
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
      throw new Error(
        "Approved merchant draft insert failed: " + draft.error?.message,
      );
    }

    eventId = draft.data.id;
    assert(draft.data.status === "draft", "Event must start as draft");
    checks.push("approved_merchant_can_create_draft");

    const pngBytes = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8WQAAAAASUVORK5CYII=",
        "base64",
      ),
    );

    tempStoragePath = `${eventId}/e2e-temp.png`;
    const tempUpload = await merchantClient.storage
      .from("event-images")
      .upload(tempStoragePath, pngBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (tempUpload.error) {
      throw new Error("Merchant temp image upload failed: " + tempUpload.error.message);
    }

    const tempDelete = await merchantClient.storage
      .from("event-images")
      .remove([tempStoragePath]);

    if (tempDelete.error) {
      throw new Error("Merchant temp image delete failed: " + tempDelete.error.message);
    }
    tempStoragePath = "";
    checks.push("merchant_can_upload_and_delete_draft_image");

    storagePath = `${eventId}/e2e-cover.png`;
    const imageUpload = await merchantClient.storage
      .from("event-images")
      .upload(storagePath, pngBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (imageUpload.error) {
      throw new Error("Merchant image upload failed: " + imageUpload.error.message);
    }

    const publicImageUrl = merchantClient.storage
      .from("event-images")
      .getPublicUrl(storagePath).data.publicUrl;

    assert(Boolean(publicImageUrl), "Public image URL was not generated");

    const publicImageResponse = await fetch(publicImageUrl);
    assert(publicImageResponse.ok, "Uploaded event image is not publicly readable");
    checks.push("uploaded_event_image_is_publicly_readable");

    const imageUpdate = await merchantClient
      .from("events")
      .update({
        cover_image_url: publicImageUrl,
        gallery_image_urls: [],
      })
      .eq("id", eventId)
      .select("id,cover_image_url")
      .single();

    if (imageUpdate.error) {
      throw new Error("Merchant image URL save failed: " + imageUpdate.error.message);
    }
    assert(
      imageUpdate.data.cover_image_url === publicImageUrl,
      "Event cover image URL did not save",
    );
    checks.push("merchant_can_save_event_image_reference");

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
    checks.push("merchant_can_submit_complete_event");

    try {
      const notificationRequest = () =>
        fetch(`${siteUrl}/api/merchant-notifications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${signedIn.data.session.access_token}`,
          },
          body: JSON.stringify({
            action: "event_submitted",
            event_id: eventId,
          }),
        });

      const notificationResponse = await notificationRequest();
      const notificationBody = await notificationResponse
        .json()
        .catch(() => ({}));

      assert(
        notificationResponse.ok,
        `Production notification API failed with HTTP ${notificationResponse.status}`,
      );
      assert(
        notificationBody.queued === true && Boolean(notificationBody.queue_id),
        "Event submission did not create a durable in-app notification",
      );
      checks.push("event_submission_notification_queued");

      const retryResponse = await notificationRequest();
      const retryBody = await retryResponse.json().catch(() => ({}));

      assert(
        retryResponse.ok,
        `Notification retry failed with HTTP ${retryResponse.status}`,
      );
      assert(
        retryBody.queued === true &&
          retryBody.duplicate === true &&
          retryBody.queue_id === notificationBody.queue_id,
        "Notification retry did not deduplicate to the existing queue item",
      );
      checks.push("event_submission_notification_deduplicated");

      notificationSent =
        notificationResponse.ok && notificationBody.sent === true;

      if (requireNotification) {
        assert(
          notificationSent,
          `Production Resend notification is not configured or failed: ${
            notificationBody.reason ||
            notificationBody.error ||
            "unknown"
          }`,
        );
        checks.push("production_admin_notification_sent");
      } else if (notificationSent) {
        checks.push("production_admin_notification_sent");
      } else {
        console.warn(
          "Resend email is optional for this core E2E; durable in-app queue passed:",
          notificationBody.reason || notificationBody.error || "email not sent",
        );
      }
    } catch (error) {
      throw error;
    }

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
    checks.push("merchant_cannot_self_publish");

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
      .from("public_events_i18n")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    assert(
      !hiddenBeforePublish.data,
      "Approved-but-unpublished event leaked to public_events_i18n",
    );
    checks.push("approved_event_not_public");

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
    checks.push("admin_can_publish");

    const publicEvent = await merchantClient
      .from("public_events_i18n")
      .select("id,status,title_tc,title_sc,title_en,cover_image_url")
      .eq("id", eventId)
      .single();

    if (publicEvent.error || !publicEvent.data) {
      throw new Error(
        "Published event was not visible publicly: " + publicEvent.error?.message,
      );
    }

    assert(publicEvent.data.status === "published", "Public event status mismatch");
    assert(publicEvent.data.title_en === "HKFF E2E Merchant Event", "English title missing");
    assert(publicEvent.data.cover_image_url === publicImageUrl, "Public cover mismatch");
    checks.push("published_event_public_with_i18n_and_image");

    const publicPageResponse = await fetch(`${siteUrl}/events/${eventId}`, {
      redirect: "follow",
    });
    assert(
      publicPageResponse.ok,
      `Published event page returned HTTP ${publicPageResponse.status}`,
    );
    checks.push("published_event_route_returns_200");

    const privateImportResponse = await fetch(`${siteUrl}/api/import-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signedIn.data.session.access_token}`,
      },
      body: JSON.stringify({
        url: "http://127.0.0.1/",
      }),
    });

    assert(
      privateImportResponse.status === 400,
      `Private-network import should be blocked with HTTP 400, got ${privateImportResponse.status}`,
    );
    checks.push("authenticated_private_network_import_is_blocked");

    const urlImportResponse = await fetch(`${siteUrl}/api/import-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signedIn.data.session.access_token}`,
      },
      body: JSON.stringify({
        url: `${siteUrl}/events/${eventId}`,
      }),
    });

    const urlImportBody = await urlImportResponse.json().catch(() => ({}));

    assert(
      urlImportResponse.ok && urlImportBody.ok === true,
      `URL import failed with HTTP ${urlImportResponse.status}: ${
        urlImportBody.error || "unknown"
      }`,
    );
    assert(
      Boolean(urlImportBody.event?.title_tc),
      "URL import did not extract an event title",
    );
    checks.push("authenticated_url_import_returns_editable_draft_data");

    const pdfBytes = buildSinglePagePdf(
      "HKFF E2E PDF Event - 16 January 2030 - HKFF E2E Test Venue",
    );
    const pdfForm = new FormData();
    pdfForm.append(
      "file",
      new Blob([pdfBytes], { type: "application/pdf" }),
      "hkff-e2e-event.pdf",
    );

    const pdfImportResponse = await fetch(`${siteUrl}/api/import-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${signedIn.data.session.access_token}`,
      },
      body: pdfForm,
    });

    const pdfImportBody = await pdfImportResponse.json().catch(() => ({}));

    assert(
      pdfImportResponse.ok && pdfImportBody.ok === true,
      `Direct PDF import failed with HTTP ${pdfImportResponse.status}: ${
        pdfImportBody.error || "unknown"
      }`,
    );
    assert(
      pdfImportBody.source_type === "pdf_upload",
      "Direct PDF import did not return pdf_upload source type",
    );
    assert(
      Boolean(pdfImportBody.event?.title_tc || pdfImportBody.event?.description_tc),
      "Direct PDF import did not extract usable text",
    );
    checks.push("authenticated_direct_pdf_import_returns_editable_draft_data");

    const generatedRecovery = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (generatedRecovery.error || !generatedRecovery.data?.properties?.hashed_token) {
      throw new Error(
        "Generate recovery link failed: " + generatedRecovery.error?.message,
      );
    }

    const recoveryClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const verifiedRecovery = await recoveryClient.auth.verifyOtp({
      type: "recovery",
      token_hash: generatedRecovery.data.properties.hashed_token,
    });

    if (verifiedRecovery.error || !verifiedRecovery.data.session) {
      throw new Error(
        "Recovery token verification failed: " + verifiedRecovery.error?.message,
      );
    }

    const updatedPassword = await recoveryClient.auth.updateUser({
      password: recoveredPassword,
    });

    if (updatedPassword.error) {
      throw new Error("Recovery password update failed: " + updatedPassword.error.message);
    }

    await recoveryClient.auth.signOut();

    const oldPasswordLogin = await merchantClient.auth.signInWithPassword({
      email,
      password,
    });
    assert(Boolean(oldPasswordLogin.error), "Old password unexpectedly still works");

    const newPasswordLogin = await merchantClient.auth.signInWithPassword({
      email,
      password: recoveredPassword,
    });

    if (newPasswordLogin.error || !newPasswordLogin.data.session) {
      throw new Error(
        "Recovered password login failed: " + newPasswordLogin.error?.message,
      );
    }
    checks.push("password_recovery_changes_login_password");

    console.log(
      JSON.stringify(
        {
          success: true,
          notification_required: requireNotification,
          notification_sent: notificationSent,
          checks,
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
