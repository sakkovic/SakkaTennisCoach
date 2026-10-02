/** Shared rules for journey image uploads. */
export const JOURNEY_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Server limit (must stay below serverActions.bodySizeLimit in next.config.ts). */
export const JOURNEY_IMAGE_MAX_BYTES = 3.8 * 1024 * 1024;

export function validateJourneyImage(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) return "Choose an image to upload.";
  if (!JOURNEY_IMAGE_TYPES[file.type]) return "Use a JPG, PNG or WebP image.";
  if (file.size > JOURNEY_IMAGE_MAX_BYTES) return "Image is too large — please use a smaller photo.";
  return null;
}

/**
 * Browser-side: downscale to max 2000px and re-encode as JPEG so phone photos
 * (often 5–10 MB) upload quickly. Returns the original if it's already small.
 */
export async function prepareImageForUpload(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  if (!JOURNEY_IMAGE_TYPES[file.type]) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
