(function (global) {
  "use strict";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderCategoryDonut(container, breakdown, total, currency) {
    if (!container) return;

    if (!breakdown || breakdown.length === 0 || total <= 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No spending recorded in this period.</p>
        </div>`;
      return;
    }

    const size = 168;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 60;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;

    let cumulativeLength = 0;
    const circles = breakdown.map((item) => {
      const fraction = item.total / total;
      const segmentLen = Math.max(0, fraction * circumference);
      // Small visual gap only when there are multiple slices
      const gap = breakdown.length > 1 ? Math.min(2.5, segmentLen * 0.15) : 0;
      const dashLen = Math.max(0, segmentLen - gap);
      const dashOffset = -cumulativeLength;
      cumulativeLength += segmentLen;

      const amtStr = VeloStore.formatCurrency(item.total, currency);
      return `<circle
        cx="${cx}"
        cy="${cy}"
        r="${radius}"
        fill="none"
        stroke="${item.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${dashLen.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="${dashOffset.toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})"
      ><title>${escapeHtml(item.label)}: ${escapeHtml(amtStr)} (${item.pct.toFixed(1)}%)</title></circle>`;
    }).join("");

    const legendItems = breakdown.map((item) => {
      const amtStr = VeloStore.formatCurrency(item.total, currency);
      return `
        <div class="legend-item">
          <div class="legend-left">
            <span class="legend-swatch" style="background:${item.color}"></span>
            <span class="legend-name">${escapeHtml(item.label)}</span>
          </div>
          <div class="legend-right">
            <span class="legend-pct">${item.pct.toFixed(0)}%</span>
            <strong class="mono">${escapeHtml(amtStr)}</strong>
          </div>
        </div>`;
    }).join("");

    const totalStr = VeloStore.formatCurrency(total, currency);

    container.innerHTML = `
      <div class="donut-layout">
        <div class="donut-svg-wrap">
          <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Spending by category chart">
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="var(--border)" stroke-width="${strokeWidth}" opacity="0.35"></circle>
            ${circles}
          </svg>
          <div class="donut-center">
            <span class="donut-center-label">Total</span>
            <span class="donut-center-value mono">${escapeHtml(totalStr)}</span>
          </div>
        </div>
        <div class="chart-legend">
          ${legendItems}
        </div>
      </div>`;
  }

  function renderMonthlyBarChart(container, series, currency) {
    if (!container) return;

    const maxVal = series.reduce((m, s) => Math.max(m, s.total), 0);
    if (maxVal <= 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Log expenses over recent months to view your spending trend.</p>
        </div>`;
      return;
    }

    const width = 460;
    const height = 210;
    const padTop = 24;
    const padBottom = 30;
    const padLeft = 10;
    const padRight = 10;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const count = series.length;
    const slotW = plotW / count;
    const barW = Math.min(40, slotW * 0.56);

    const gridLines = [0.25, 0.5, 0.75, 1].map((ratio) => {
      const y = padTop + plotH * (1 - ratio);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" class="chart-grid-line" />`;
    }).join("");

    const bars = series.map((item, idx) => {
      const barH = item.total > 0 ? Math.max(4, (item.total / maxVal) * plotH) : 0;
      const x = padLeft + idx * slotW + (slotW - barW) / 2;
      const y = padTop + plotH - barH;
      const labelX = padLeft + idx * slotW + slotW / 2;
      const formatted = VeloStore.formatCurrency(item.total, currency);
      const compactVal = item.total >= 1000
        ? `${currency}${(item.total / 1000).toFixed(1)}k`
        : `${currency}${Math.round(item.total)}`;

      return `
        <g>
          ${barH > 0
            ? `<rect class="bar-rect" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="var(--accent)">
                 <title>${escapeHtml(item.label)} (${escapeHtml(item.monthKey)}): ${escapeHtml(formatted)}</title>
               </rect>
               <text x="${labelX.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="chart-value-text">${escapeHtml(compactVal)}</text>`
            : `<rect x="${x.toFixed(1)}" y="${(padTop + plotH - 2).toFixed(1)}" width="${barW.toFixed(1)}" height="2" rx="1" fill="var(--border)"></rect>`
          }
          <text x="${labelX.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-axis-text">${escapeHtml(item.label)}</text>
        </g>`;
    }).join("");

    container.innerHTML = `
      <div class="bar-chart-wrap">
        <svg class="bar-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Monthly spending trend chart">
          ${gridLines}
          <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--border-strong)" />
          ${bars}
        </svg>
      </div>`;
  }

  global.VeloCharts = {
    renderCategoryDonut,
    renderMonthlyBarChart
  };
})(window);
