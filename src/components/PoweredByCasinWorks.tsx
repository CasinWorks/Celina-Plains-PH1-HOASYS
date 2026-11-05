import { CASINWORKS_NAME, CASINWORKS_URL } from "../lib/config";

type Props = {
  variant?: "float" | "banner" | "inline";
};

export function PoweredByCasinWorks({ variant = "inline" }: Props) {
  return (
    <a
      className={`powered-by powered-by-${variant}`}
      href={CASINWORKS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Powered by ${CASINWORKS_NAME} — opens in a new tab`}
    >
      <span className="powered-by-kicker">Powered by</span>
      <strong className="powered-by-brand">{CASINWORKS_NAME}</strong>
    </a>
  );
}
