import { useTranslation } from "react-i18next";

const MAP: Record<string, string> = {
  unpaid: "badge-warning",
  partial: "badge-warning",
  pending: "badge-warning",
  paid: "badge-success",
  verified: "badge-success",
  posted: "badge-success",
  rejected: "badge-danger",
  void: "badge-muted",
  waived: "badge-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = MAP[status] ?? "badge-info";
  const label = t(`status.${status}`, { defaultValue: status });
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden="true">●</span>
      {label}
    </span>
  );
}
