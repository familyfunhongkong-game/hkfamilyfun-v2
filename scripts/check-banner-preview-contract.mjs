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
