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
        <article className="pay-card">
          <div>
            <h3>{t("pay.gcash")}</h3>
            <p>{t("pay.gcashBody")}</p>
          </div>
          <div className={`pay-qr-well${qrReady ? "" : " is-empty"}`}>
            {qrReady ? (
              <img
                className="pay-qr"
                src={GCASH_QR}
                alt={t("pay.gcashQr")}
                onError={() => setQrReady(false)}
              />
            ) : (
              <span>{t("pay.gcashQr")}</span>
            )}
          </div>
        </article>
        <article className="pay-card pay-card-cash">
          <div>
            <h3>{t("pay.cash")}</h3>
            <p>{t("pay.cashBody")}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
