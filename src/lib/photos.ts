const MAX_EDGE = 960;
const MAX_DATA_URL = 180_000;

/** Shrink a photo so it can be stored with the announcement. */
export async function compressImageFile(file: File): Promise<{
  mimeType: string;
  dataUrl: string;
}> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read that photo.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.62);
  if (dataUrl.length > MAX_DATA_URL) {
    throw new Error("That photo is too large. Choose a smaller one.");
  }
  return { mimeType: "image/jpeg", dataUrl };
}
