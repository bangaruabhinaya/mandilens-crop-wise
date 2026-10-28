/**
 * Vanilla Canvas Line Chart Component
 * Visualizes dated mandi price and net-return trends without third-party chart libraries.
 */

const Charts = {
  activeCropId: '11111111-0000-0000-0000-000000000001',
  canvas: null,
  ctx: null,

  init() {
    this.canvas = document.getElementById('price-history-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const select = document.getElementById('chart-crop-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.activeCropId = e.target.value;
        this.loadAndRender();
      });
    }

    // Handle responsive resize
    window.addEventListener('resize', () => {
      if (State.activeView === 'charts') {
        this.loadAndRender();
      }
    });
  },

  async loadAndRender() {
    if (!this.canvas) this.init();
    if (!this.canvas) return;

    try {
      const res = await API.getPriceHistory(this.activeCropId, 14);
      if (!res.success || !res.data) return;

      this.render(res.data);
    } catch (err) {
      console.error('Failed to load chart data:', err);
    }
  },

  render(chartData) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    const rect = canvas.parentElement.getBoundingClientRect();

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width - 32;
    const height = 340;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 40, left: 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const { dates, series } = chartData;
    if (!series || series.length === 0 || !dates || dates.length === 0) {
      ctx.fillStyle = '#82786A';
      ctx.font = '14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No historical market data available.', width / 2, height / 2);
      return;
    }

    // Find min and max price across all series
    let minVal = Infinity;
    let maxVal = -Infinity;

    series.forEach(s => {
      s.dataPoints.forEach(pt => {
        if (pt.headlinePrice < minVal) minVal = pt.headlinePrice;
        if (pt.headlinePrice > maxVal) maxVal = pt.headlinePrice;
        if (pt.netPricePerQtl < minVal) minVal = pt.netPricePerQtl;
        if (pt.netPricePerQtl > maxVal) maxVal = pt.netPricePerQtl;
      });
    });

    // Add 10% breathing room to Y-axis
    const margin = (maxVal - minVal) * 0.1 || 100;
    const yMin = Math.floor((minVal - margin) / 50) * 50;
    const yMax = Math.ceil((maxVal + margin) / 50) * 50;

    // Draw horizontal grid lines & Y labels
    const gridLines = 5;
    ctx.strokeStyle = '#E6DFD5';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#82786A';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridLines; i++) {
      const yVal = yMin + (i * (yMax - yMin) / gridLines);
      const yPos = padding.top + chartH - (i * (chartH / gridLines));

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillText(`₹${Math.round(yVal)}`, padding.left - 10, yPos + 4);
    }

    // Draw X-axis dates
    ctx.textAlign = 'center';
    const xStep = chartW / (dates.length - 1);
    dates.forEach((d, idx) => {
      if (idx % 2 === 0 || idx === dates.length - 1) {
        const xPos = padding.left + idx * xStep;
        const shortDate = d.substring(5); // MM-DD
        ctx.fillText(shortDate, xPos, padding.top + chartH + 20);
      }
    });

    // Market color palettes
    const colors = [
      { stroke: '#1E4D2B', netStroke: '#22C55E' }, // Mandi 1 (Green)
      { stroke: '#D97706', netStroke: '#F59E0B' }, // Mandi 2 (Marigold)
      { stroke: '#2563EB', netStroke: '#60A5FA' }  // Mandi 3 (Blue)
    ];

    // Plot lines
    series.forEach((s, sIdx) => {
      const color = colors[sIdx % colors.length];

      // 1. Draw Headline Market Price (Solid line)
      ctx.beginPath();
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2.5;
      s.dataPoints.forEach((pt, ptIdx) => {
        const x = padding.left + ptIdx * xStep;
        const y = padding.top + chartH - ((pt.headlinePrice - yMin) / (yMax - yMin)) * chartH;
        if (ptIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 2. Draw Net Return Price (Dashed line)
      ctx.beginPath();
      ctx.strokeStyle = color.netStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      s.dataPoints.forEach((pt, ptIdx) => {
        const x = padding.left + ptIdx * xStep;
        const y = padding.top + chartH - ((pt.netPricePerQtl - yMin) / (yMax - yMin)) * chartH;
        if (ptIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Data points
      s.dataPoints.forEach((pt, ptIdx) => {
        const x = padding.left + ptIdx * xStep;
        const yNet = padding.top + chartH - ((pt.netPricePerQtl - yMin) / (yMax - yMin)) * chartH;
        ctx.beginPath();
        ctx.fillStyle = color.netStroke;
        ctx.arc(x, yNet, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Update legend
    const legendEl = document.getElementById('chart-legend');
    if (legendEl) {
      legendEl.innerHTML = series.map((s, sIdx) => {
        const color = colors[sIdx % colors.length];
        return `
          <div class="legend-item">
            <span class="legend-color-dot" style="background: ${color.stroke};"></span>
            <span>${s.marketName} (Headline)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color-dot" style="background: ${color.netStroke};"></span>
            <span>${s.marketName} (Realized Net)</span>
          </div>
        `;
      }).join('');
    }
  }
};
