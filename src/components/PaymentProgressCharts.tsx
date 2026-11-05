import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatPeso } from "../domain/money";
import type { MonthlyPaymentProgress } from "../domain/types";

type Props = {
  series: MonthlyPaymentProgress[];
};

function maxAmount(series: MonthlyPaymentProgress[]): number {
  let max = 0;
  for (const row of series) {
    max = Math.max(max, Number(row.received), Number(row.expected));
  }
  return max > 0 ? max : 1;
}

export function PaymentProgressCharts({ series }: Props) {
  const { t } = useTranslation();
  const peak = useMemo(() => maxAmount(series), [series]);
  const ytdReceived = series.reduce((s, row) => s + Number(row.received), 0);
  const ytdExpected = series.reduce((s, row) => s + Number(row.expected), 0);
  const ytdProgress =
    ytdExpected > 0 ? Math.round((ytdReceived / ytdExpected) * 1000) / 10 : 0;
  const bestMonth = series.reduce(
    (best, row) =>
      Number(row.received) > Number(best.received) ? row : best,
    series[0]!,
  );

  const barW = 56;
  const gap = 18;
  const chartW = 12 * (barW + gap) + 48;
  const chartH = 220;
  const plotTop = 24;
  const plotBottom = 188;
  const plotH = plotBottom - plotTop;

  return (
    <div className="payment-progress">
      <div className="metric-grid payment-progress-metrics">
        <div className="metric-tile mint">
          <p className="label">{t("reports.ytdReceived")}</p>
          <p className="value">{formatPeso(ytdReceived.toFixed(2))}</p>
        </div>
        <div className="metric-tile lilac">
          <p className="label">{t("reports.ytdProgress")}</p>
          <p className="value">{ytdProgress}%</p>
        </div>
        <div className="metric-tile lemon">
          <p className="label">{t("reports.bestMonth")}</p>
          <p className="value">
            {t(`months.${bestMonth.month}`)} · {formatPeso(bestMonth.received)}
          </p>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h3 className="chart-title">{t("reports.receivedVsExpected")}</h3>
          <div className="chart-legend" aria-hidden="true">
            <span className="chart-legend-item">
              <i className="chart-swatch received" />
              {t("reports.received")}
            </span>
            <span className="chart-legend-item">
              <i className="chart-swatch expected" />
              {t("reports.expected")}
            </span>
          </div>
        </div>
        <div className="chart-scroll">
          <svg
            className="collections-bar-chart"
            viewBox={`0 0 ${chartW} ${chartH}`}
            role="img"
            aria-label={t("reports.receivedVsExpected")}
          >
            {[0.25, 0.5, 0.75, 1].map((frac) => {
              const y = plotBottom - plotH * frac;
              return (
                <g key={frac}>
                  <line
                    x1={36}
                    x2={chartW - 8}
                    y1={y}
                    y2={y}
                    className="chart-grid"
                  />
                  <text x={4} y={y + 4} className="chart-axis-label">
                    {Math.round((peak * frac) / 100) * 100 || Math.round(peak * frac)}
                  </text>
                </g>
              );
            })}
            {series.map((row, i) => {
              const x = 48 + i * (barW + gap);
              const receivedH = (Number(row.received) / peak) * plotH;
              const expectedH = (Number(row.expected) / peak) * plotH;
              const receivedY = plotBottom - receivedH;
              const expectedY = plotBottom - expectedH;
              return (
                <g key={row.month}>
                  <rect
                    x={x}
                    y={expectedY}
                    width={22}
                    height={Math.max(expectedH, 0)}
                    rx={8}
                    className="bar-expected"
                  >
                    <title>
                      {t(`months.${row.month}`)} — {t("reports.expected")}:{" "}
                      {formatPeso(row.expected)}
                    </title>
                  </rect>
                  <rect
                    x={x + 26}
                    y={receivedY}
                    width={22}
                    height={Math.max(receivedH, 0)}
                    rx={8}
                    className="bar-received"
                  >
                    <title>
                      {t(`months.${row.month}`)} — {t("reports.received")}:{" "}
                      {formatPeso(row.received)} ({row.paymentCount})
                    </title>
                  </rect>
                  <text
                    x={x + barW / 2}
                    y={plotBottom + 18}
                    textAnchor="middle"
                    className="chart-month-label"
                  >
                    {t(`months.short.${row.month}`)}
                  </text>
                </g>
              );
            })}
            <line
              x1={36}
              x2={chartW - 8}
              y1={plotBottom}
              y2={plotBottom}
              className="chart-baseline"
            />
          </svg>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h3 className="chart-title">{t("reports.collectionRate")}</h3>
          <p className="chart-subtitle">{t("reports.collectionRateHint")}</p>
        </div>
        <div className="progress-month-grid">
          {series.map((row) => {
            const pct = row.progressPct ?? 0;
            const capped = Math.min(pct, 100);
            const tone =
              pct >= 90 ? "hot" : pct >= 60 ? "warm" : pct > 0 ? "cool" : "idle";
            return (
              <div key={row.month} className={`progress-month ${tone}`}>
                <div className="progress-month-top">
                  <span>{t(`months.short.${row.month}`)}</span>
                  <strong>{row.progressPct == null ? "—" : `${pct}%`}</strong>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={capped}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${t(`months.${row.month}`)} ${pct}%`}
                >
                  <span style={{ width: `${capped}%` }} />
                </div>
                <p className="progress-month-meta">
                  {formatPeso(row.received)}
                  <span aria-hidden="true"> / </span>
                  {formatPeso(row.expected)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
