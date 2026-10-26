// Shared event-upload validation. The caller must read at least the first 12 bytes.
// Check both exact byte counts and signatures: Array.every([]) is otherwise true.

/** @param {Uint8Array} header @param {number[]} signature */
function hasSignature(header, signature) {
  return header.length >= signature.length &&
    signature.every((expected, index) => header[index] === expected);
}

/**
 * @param {string} fileName
 * @param {Uint8Array} header
 * @param {number} size
 * @returns {{kind: "pdf" | "image" | null, extension: string, mime: string, error: string | null}}
 */
export function validateEventUpload(fileName, header, size) {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase() || "";
  const pdf = ext === "pdf" && hasSignature(header, [37, 80, 68, 70, 45]);
  const png = ext === "png" && hasSignature(header, [137, 80, 78, 71, 13, 10, 26, 10]);
  const jpeg = (ext === "jpg" || ext === "jpeg") && hasSignature(header, [255, 216, 255]);
  const webp = ext === "webp" &&
    hasSignature(header, [82, 73, 70, 70]) &&
    header.length >= 12 &&
    hasSignature(header.slice(8), [87, 69, 66, 80]);

  const kind = pdf ? "pdf" : png || jpeg || webp ? "image" : null;
  const mime = pdf ? "application/pdf"
    : png ? "image/png"
    : jpeg ? "image/jpeg"
    : webp ? "image/webp"
    : "";

  if (!kind) {
    return { kind: null, extension: ext, mime: "", error: "檔案格式不支援，或檔案內容不完整／與副檔名不符。請使用 PNG、JPG/JPEG、WEBP 或 PDF。" };
  }

  const limit = kind === "pdf" ? 4 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!Number.isFinite(size) || size <= 0 || size > limit) {
    return { kind: null, extension: ext, mime: "", error: kind === "pdf" ? "PDF 必須大於 0 並小於 4MB。" : "圖片必須大於 0 並小於 8MB。" };
  }

  return { kind, extension: ext === "jpeg" ? "jpg" : ext, mime, error: null };
}
