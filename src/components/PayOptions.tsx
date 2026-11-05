import { useState } from "react";
import { useTranslation } from "react-i18next";

const GCASH_QR = "/payments/gcash-qr.png";

export function PayOptions() {
  const { t } = useTranslation();
  const [qrReady, setQrReady] = useState(true);

  return (
    <section className="pay-options" aria-label={t("pay.where")}>
      <h2>{t("pay.where")}</h2>
      <div className="pay-options-grid">
        <article>
          <h3>{t("pay.gcash")}</h3>
          <p>{t("pay.gcashBody")}</p>
          {qrReady ? (
            <img
              className="pay-qr"
              src={GCASH_QR}
              alt={t("pay.gcashQr")}
              onError={() => setQrReady(false)}
            />
          ) : (
            <p className="meta-line">{t("pay.gcashMissing")}</p>
          )}
        </article>
        <article>
          <h3>{t("pay.cash")}</h3>
          <p>{t("pay.cashBody")}</p>
        </article>
      </div>
    </section>
  );
}
