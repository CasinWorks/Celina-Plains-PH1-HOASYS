import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyTextSize,
  getStoredTextSize,
  type TextSize,
} from "../lib/textSize";

const OPTIONS: TextSize[] = ["normal", "large", "xlarge"];

export function TextSizeToggle() {
  const { t } = useTranslation();
  const [size, setSize] = useState<TextSize>(() => getStoredTextSize());

  useEffect(() => {
    applyTextSize(size);
  }, [size]);

  return (
    <div
      className="text-size-toggle"
      role="group"
      aria-label={t("textSize.label")}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={size === opt}
          onClick={() => setSize(opt)}
        >
          {t(`textSize.${opt}`)}
        </button>
      ))}
    </div>
  );
}
