import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/admin-auth";
import { verifyEventReviewToken } from "@/lib/event-review-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectBack(request: NextRequest, id: string, expires: string, sig: string, result: string) {
  const url = new URL("/event-review/" + encodeURIComponent(id), request.url);
  url.searchParams.set("expires", expires);
  url.searchParams.set("sig", sig);
  url.searchParams.set("result", result);
  return NextResponse.redirect(url, 303);
}

function publishMissing(event: Record<string, unknown>) {
  const missing: string[] = [];
  const value = (key: string) => String(event[key] ?? "").trim();

  if (!value("title_tc") && !value("title")) missing.push("活動名稱");
  if (!value("start_date")) missing.push("日期");
  if (!value("venue_name") && !value("address") && !value("district")) missing.push("地點");
  if (!value("organizer_name")) missing.push("主辦方");
  if (!value("description_tc") || value("description_tc").length < 20) missing.push("活動介紹");
  if (!value("price_display_mode") || value("price_display_mode") === "unknown") missing.push("收費");
  if (!value("registration_url") && !value("official_url") && !value("source_url")) missing.push("官方/報名連結");
  return missing;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = text(form.get("event_id"));
  const expires = text(form.get("expires"));
  const sig = text(form.get("sig"));
  const action = text(form.get("action"));

  if (!verifyEventReviewToken(id, expires, sig)) {
    return new NextResponse("Review link is invalid or expired.", { status: 403 });
  }

  const admin = serviceClient();
  if (!admin) {
    return new NextResponse("Service unavailable.", { status: 503 });
  }

  const { data: event, error: loadError } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !event) {
    return new NextResponse("Event not found.", { status: 404 });
  }

  const now = new Date().toISOString();

  // Every action reads the same editable form, so approval never loses corrections.
  const patch = {
    title_tc: text(form.get("title_tc")) || event.title_tc,
    description_tc: text(form.get("description_tc")) || null,
    highlights: text(form.get("highlights")) || null,
    terms: text(form.get("terms")) || null,
    parent_note_tc: text(form.get("parent_note_tc")) || null,
    safety_note_tc: text(form.get("safety_note_tc")) || null,
    venue_name: text(form.get("venue_name")) || null,
    address: text(form.get("address")) || null,
    organizer_name: text(form.get("organizer_name")) || null,
    start_date: text(form.get("start_date")) || null,
    end_date: text(form.get("end_date")) || null,
    start_time: text(form.get("start_time")) || null,
    end_time: text(form.get("end_time")) || null,
    price_display_mode:
      text(form.get("price_display_mode")) || event.price_display_mode || "unknown",
    price_label: text(form.get("price_label")) || null,
    is_free: text(form.get("price_display_mode")) === "free",
    cover_image_url: text(form.get("cover_image_url")) || null,
    registration_url: text(form.get("registration_url")) || null,
    official_url: text(form.get("official_url")) || event.official_url || null,
    updated_at: now,
  };

  // Quick approval submits only token and action. Never erase the existing event fields.
  const submittedPatch: Record<string, unknown> = { updated_at: now };
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (key === "updated_at") continue;
    if (form.has(key) || (key === "is_free" && form.has("price_display_mode"))) {
      submittedPatch[key] = patch[key];
    }
  }

  if (action === "save") {
    const { error } = await admin.from("events").update(submittedPatch).eq("id", id);
    if (error) return new NextResponse("Unable to save changes.", { status: 500 });
    return redirectBack(request, id, expires, sig, "saved");
  }

  if (!["approve", "publish", "reject"].includes(action)) {
    return new NextResponse("Unsupported action.", { status: 400 });
  }

  // An older email must never undo an already published event.
  if (event.status === "published" || event.status === "rejected") {
    return new NextResponse("This event has already been finalized.", { status: 409 });
  }

  const note = text(form.get("admin_note"));

  if (action === "approve") {
    const { error } = await admin
      .from("events")
      .update({
        ...submittedPatch,
        status: "approved",
        reviewed_at: now,
        admin_review_note: note || "Approved from secure email review.",
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) return new NextResponse("Unable to approve event.", { status: 500 });
    return redirectBack(request, id, expires, sig, "approved");
  }

  if (action === "publish") {
    const missing = publishMissing({ ...event, ...submittedPatch } as Record<string, unknown>);
    if (missing.length) {
      const url = new URL("/event-review/" + encodeURIComponent(id), request.url);
      url.searchParams.set("expires", expires);
      url.searchParams.set("sig", sig);
      url.searchParams.set("result", "blocked");
      url.searchParams.set("missing", missing.join("、"));
      return NextResponse.redirect(url, 303);
    }

    const { error } = await admin
      .from("events")
      .update({
        ...submittedPatch,
        status: "published",
        published_at: event.published_at || now,
        reviewed_at: now,
        admin_review_note: note || "Approved and published from secure email review.",
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) return new NextResponse("Unable to publish event.", { status: 500 });
    return redirectBack(request, id, expires, sig, "published");
  }

  if (action === "reject") {
    if (!note) {
      return redirectBack(request, id, expires, sig, "note-required");
    }

    const { error } = await admin
      .from("events")
      .update({
        ...submittedPatch,
        status: "rejected",
        reviewed_at: now,
        admin_review_note: note,
        rejection_reason: note,
        updated_at: now,
      })
      .eq("id", id);

    if (error) return new NextResponse("Unable to reject event.", { status: 500 });
    return redirectBack(request, id, expires, sig, "rejected");
  }

  return new NextResponse("Unsupported action.", { status: 400 });
}
