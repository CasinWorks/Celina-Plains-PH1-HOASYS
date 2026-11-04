export type TextSize = "normal" | "large" | "xlarge";

export const TEXT_SIZE_KEY = "celina_hoa_text_size";

export function getStoredTextSize(): TextSize {
  const raw = localStorage.getItem(TEXT_SIZE_KEY);
  if (raw === "large" || raw === "xlarge") return raw;
  return "normal";
}

export function applyTextSize(size: TextSize): void {
  document.documentElement.setAttribute("data-text-size", size);
  localStorage.setItem(TEXT_SIZE_KEY, size);
}
