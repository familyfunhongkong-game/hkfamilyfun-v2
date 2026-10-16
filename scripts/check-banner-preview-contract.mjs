import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync("app/admin/promotions/page.tsx", "utf8");
const preview = readFileSync("components/admin/BannerApprovalPreview.tsx", "utf8");

assert.match(editor, /onSubmit=\{requestSavePreview\}/, "New/edit Banner form must request review, not save");
assert.match(editor, /function requestSavePreview\(/);
assert.match(editor, /setPreview\(\{ mode: "save"/);
assert.match(editor, /async function saveConfirmed\(/);
assert.match(editor, /if \(preview.mode === "save"\)/);
assert.match(editor, /await saveConfirmed\(\)/);
assert.match(editor, /onConfirm=\{\(\) => void confirmPreview\(\)\}/);
assert.match(editor, /先預覽圖片及 Banner/);
assert.match(editor, /mode: "view", banner: row/, "Existing banners must have a preview action");
assert.match(editor, /mode: "activate", banner: row/, "Activation must open preview first");
assert.doesNotMatch(editor, /onClick=\{\(\) => void setStatus\(row.id, "active"\)\}/, "Activation must not bypass preview");
assert.match(editor, /canActivatePromotion\(/, "Review must preserve payment and house rules");
assert.match(editor, /function isSafeBannerUrl\(/, "Reject unsafe banner URLs");
assert.match(editor, /!isSafeBannerUrl\(draft.image_url/, "Validate banner image URL before preview");
assert.match(editor, /!isSafeBannerUrl\(draft.target_url/, "Validate banner target URL before preview");
assert.match(editor, /href="https:\/\/hkfamilyfun-v2.vercel.app\//, "Admin must link to rebuilt public-site preview");
assert.match(preview, /const isHouseBanner/, "Logo house promotions should not be cropped in preview");
const serverBanner = readFileSync("components/promotion-slot.tsx", "utf8");
const clientBanner = readFileSync("components/client-promotion-slot.tsx", "utf8");
for (const [name, view] of [["server", serverBanner], ["client", clientBanner]]) {
  assert.match(view, /h-auto max-h-80/, name + " mobile artwork must display fully");
  assert.match(view, /object-contain/, name + " mobile image must not be cropped");
  assert.match(view, /sm:object-cover/, name + " desktop photography crop remains available");
  assert.match(view, /sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-transparent/,
    name + " mobile title CTA must be below image instead of covering its baked-in text");
  assert.match(view, /hidden bg-gradient-to-t/, name + " gradient overlay must be desktop-only");
}
assert.match(preview, /mobile \? "h-auto max-h-80" : "h-72"/,
  "Preview must show uncropped mobile image");
assert.match(preview, /mobile \? "relative bg-slate-950 p-5 text-white"/,
  "Preview mobile details must be placed outside the image");
assert.match(preview, /!banner.mobile_image_url\?\.trim\(\)/,
  "Show owner warning when a dedicated mobile image is missing");



assert.match(preview, /role="dialog" aria-modal="true"/, "Image preview must be a modal");
assert.match(preview, /src=\{image\}/, "Preview must display the actual uploaded image");
assert.match(preview, /onLoad=\{\(\) => onImageState\("loaded"\)\}/);
assert.match(preview, /onError=\{\(\) => onImageState\("error"\)\}/);
assert.match(preview, /mobileSrc = banner\.mobile_image_url/, "Mobile image must override desktop if supplied");
assert.match(preview, /const ready = Boolean\(desktopSrc && mobileSrc && desktop === "loaded" && mobile === "loaded"\)/);
assert.match(preview, /disabled=\{confirming \|\| !ready\}/, "Broken image must block approval");
assert.match(preview, /mode !== "view" && onConfirm/, "Read-only preview must not save or activate");
assert.doesNotMatch(preview, /PromotionTracker/, "Preview must not record impressions");
assert.doesNotMatch(preview, /window\.location\.href/, "Preview must not navigate to advertiser target");

console.log("[banner-preview] PASS: confirmation gate, desktop/mobile images and existing-banner activation preview");
