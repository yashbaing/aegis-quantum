import React, { useRef, useEffect, useState } from 'react';

// ============================================================
// TECHNICAL INDICATORS MATH UTILITIES
// ============================================================
function calcSMA(data, p) {
  return data.map((_, i) => {
    if (i < p - 1) return null;
    return data.slice(i - p + 1, i + 1).reduce((s, d) => s + d.close, 0) / p;
  });
}

function calcEMA(data, p) {
  if (!data || !data.length) return [];
  const k = 2 / (p + 1);
  const ema = [data[0].close];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i].close * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(data, p = 14) {
  const rsi = Array(data.length).fill(null);
  if (data.length <= p) return rsi;
  let gains = 0, losses = 0;
  for (let i = 1; i <= p; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d >= 0) gains += d; else losses -= d;
  }
  let ag = gains / p, al = losses / p;
  rsi[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = p + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p;
    al = (al * (p - 1) + (d < 0 ? -d : 0)) / p;
    rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return rsi;
}

function calcBB(data, p = 20, mult = 2) {
  const mid = calcSMA(data, p);
  const upper = [], lower = [];
  for (let i = 0; i < data.length; i++) {
    if (mid[i] === null) { upper.push(null); lower.push(null); continue; }
    const sq = data.slice(i - p + 1, i + 1).reduce((s, d) => s + (d.close - mid[i]) ** 2, 0);
    const sd = Math.sqrt(sq / p);
    upper.push(mid[i] + mult * sd);
    lower.push(mid[i] - mult * sd);
  }
  return { upper, mid, lower };
}

function calcMACD(data, s = 12, l = 26, sig = 9) {
  if (data.length < l + sig) {
    return {
      line: data.map(() => 0),
      signal: data.map(() => 0),
      hist: data.map(() => 0)
    };
  }
  const emaS = calcEMA(data, s);
  const emaL = calcEMA(data, l);
  const line = emaS.map((v, i) => v - emaL[i]);
  const signalArr = [line[0]];
  const k = 2 / (sig + 1);
  for (let i = 1; i < line.length; i++) {
    signalArr.push(line[i] * k + signalArr[i - 1] * (1 - k));
  }
  const hist = line.map((v, i) => v - signalArr[i]);
  return { line, signal: signalArr, hist };
}

const RIGHT_PAD = 68;

export default function ChartSection({
  activeAsset,
  history,
  decimalPlaces,
  activeTimeframe,
  onChangeTimeframe,
  indicators,
  onToggleIndicator
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Handle canvas sizing and resizing
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !wrapRef.current) return;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      setDimensions({ w, h });
    };

    window.addEventListener('resize', handleResize);
    // Initial size setting
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recalculate indicators and draw canvas chart on state changes
  useEffect(() => {
    if (!canvasRef.current || !history || history.length === 0 || dimensions.w === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = dimensions.w;
    const H = dimensions.h;
    const n = history.length;
    const dec = decimalPlaces;

    ctx.clearRect(0, 0, W, H);

    const showRSI = indicators.rsi;
    const showMACD = indicators.macd;
    const showVol = indicators.vol;
    const subCount = [showRSI, showMACD, showVol].filter(Boolean).length;
    const mainPct = subCount === 0 ? 0.96 : subCount === 1 ? 0.72 : subCount === 2 ? 0.58 : 0.50;
    
    const mainH = H * mainPct;
    const subH = subCount > 0 ? (H * (1 - mainPct)) / subCount : 0;
    const chartW = W - RIGHT_PAD;
    const step = chartW / n;
    const candleW = Math.max(1, step * 0.7);

    const sma20 = calcSMA(history, 20);
    const ema9 = calcEMA(history, 9);
    const bb = calcBB(history, 20, 2);
    const rsiArr = calcRSI(history, 14);
    const macd = calcMACD(history);

    // Calculate Y scale range
    let maxP = -Infinity, minP = Infinity;
    history.forEach(b => {
      if (b.high > maxP) maxP = b.high;
      if (b.low < minP) minP = b.low;
    });

    if (indicators.bb && bb.upper.length) {
      bb.upper.forEach(v => { if (v && v > maxP) maxP = v; });
      bb.lower.forEach(v => { if (v && v < minP) minP = v; });
    }
    const rng = maxP - minP || 1;
    maxP += rng * 0.04;
    minP -= rng * 0.04;

    const scaleY = v => mainH - 30 - ((v - minP) / (maxP - minP)) * (mainH - 50);
    const xOf = i => i * step + step / 2;

    // Draw grid
    ctx.lineWidth = 0.5;
    for (let g = 0; g <= 6; g++) {
      const gy = 25 + ((mainH - 55) / 6) * g;
      const pv = maxP - ((maxP - minP) / 6) * g;
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(chartW, gy);
      ctx.stroke();

      ctx.fillStyle = '#2d4466';
      ctx.font = '9px Fira Code,monospace';
      ctx.textAlign = 'left';
      ctx.fillText('$' + pv.toLocaleString(undefined, { maximumFractionDigits: dec, minimumFractionDigits: dec }), chartW + 4, gy + 3);
    }

    // Time axis labels
    for (let i = 0; i < n; i += Math.ceil(n / 6)) {
      const t = history[i].time;
      const label = t instanceof Date ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      ctx.fillStyle = '#2d4466';
      ctx.font = '8px Fira Code,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, xOf(i), mainH - 8);
    }

    // Draw Bollinger Bands (BB)
    if (indicators.bb && bb.upper.length) {
      ctx.setLineDash([4, 4]);
      ['upper', 'lower'].forEach(k => {
        ctx.strokeStyle = 'rgba(6,182,212,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let s = false;
        for (let i = 0; i < n; i++) {
          if (bb[k][i] == null) continue;
          const p = [xOf(i), scaleY(bb[k][i])];
          if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // BB Shaded area
      ctx.beginPath();
      let s = false;
      for (let i = 0; i < n; i++) {
        if (bb.upper[i] == null) continue;
        const p = [xOf(i), scaleY(bb.upper[i])];
        if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
      }
      for (let i = n - 1; i >= 0; i--) {
        if (bb.lower[i] == null) continue;
        ctx.lineTo(xOf(i), scaleY(bb.lower[i]));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(6,182,212,0.018)';
      ctx.fill();
    }

    // Draw EMA 9 & SMA 20
    if (indicators.ma) {
      [[ema9, 'rgba(139,92,246,0.6)'], [sma20, 'rgba(217,70,239,0.6)']].forEach(([arr, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let s = false;
        for (let i = 0; i < n; i++) {
          if (arr[i] == null) continue;
          const p = [xOf(i), scaleY(arr[i])];
          if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
        }
        ctx.stroke();
      });
    }

    // Draw Candlesticks
    for (let i = 0; i < n; i++) {
      const b = history[i];
      const isUp = b.close >= b.open;
      const cx = xOf(i);
      ctx.strokeStyle = isUp ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, scaleY(b.high));
      ctx.lineTo(cx, scaleY(b.low));
      ctx.stroke();

      const top = scaleY(Math.max(b.open, b.close));
      const bh = Math.max(scaleY(Math.min(b.open, b.close)) - top, 1.5);
      ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
      ctx.fillRect(i * step + step * 0.15, top, candleW, bh);
    }

    // Draw Hover crosshair
    if (hoverIdx >= 0 && hoverIdx < n) {
      ctx.fillStyle = 'rgba(6,182,212,0.04)';
      ctx.fillRect(hoverIdx * step, 0, step, mainH);
      ctx.strokeStyle = 'rgba(6,182,212,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(xOf(hoverIdx), 0);
      ctx.lineTo(xOf(hoverIdx), H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Sub-charts
    let subY = mainH;

    const drawSubSep = (y, label) => {
      ctx.fillStyle = 'rgba(5,7,15,0.4)';
      ctx.fillRect(0, y, W, subH);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      
      ctx.fillStyle = '#2d4466';
      ctx.font = '9px Fira Code,monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, 6, y + 11);
    };

    if (showRSI) {
      drawSubSep(subY, 'RSI (14)');
      const rsiScale = v => subY + subH * (1 - v / 100);
      [70, 30, 50].forEach(v => {
        const ry = rsiScale(v);
        ctx.strokeStyle = v === 50 ? 'rgba(255,255,255,0.04)' : v === 70 ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash(v === 50 ? [2, 4] : []);
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(chartW, ry);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#2d4466';
        ctx.textAlign = 'left';
        ctx.fillText(v.toString(), chartW + 4, ry + 3);
      });

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let s = false;
      for (let i = 0; i < n; i++) {
        if (rsiArr[i] == null) continue;
        const p = [xOf(i), rsiScale(rsiArr[i])];
        if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
      }
      ctx.stroke();
      subY += subH;
    }

    if (showMACD) {
      drawSubSep(subY, 'MACD (12,26,9)');
      const allM = [...macd.line, ...macd.signal, ...macd.hist].map(Math.abs);
      const maxM = (Math.max(...allM) || 0.01) * 1.15;
      const midY = subY + subH / 2;
      const macdScale = v => midY - (v / maxM) * (subH / 2 - 8);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(chartW, midY);
      ctx.stroke();

      for (let i = 0; i < n; i++) {
        const v = macd.hist[i] || 0;
        ctx.fillStyle = v >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)';
        const y0 = midY;
        const y1 = macdScale(v);
        ctx.fillRect(i * step + step * 0.15, Math.min(y0, y1), candleW, Math.abs(y0 - y1));
      }

      [[macd.line, 'rgba(6,182,212,0.8)'], [macd.signal, 'rgba(245,158,11,0.7)']].forEach(([arr, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        let s = false;
        for (let i = 0; i < n; i++) {
          const p = [xOf(i), macdScale(arr[i] || 0)];
          if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
        }
        ctx.stroke();
      });
      subY += subH;
    }

    if (showVol) {
      drawSubSep(subY, 'Volume');
      const maxVol = Math.max(...history.map(b => b.vol)) || 1;
      for (let i = 0; i < n; i++) {
        const b = history[i];
        const barH = (b.vol / maxVol) * (subH - 18);
        ctx.fillStyle = b.close >= b.open ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)';
        ctx.fillRect(i * step + step * 0.15, subY + subH - barH - 8, candleW, barH);
      }
    }
  }, [dimensions, history, indicators, hoverIdx, decimalPlaces]);

  // Compute details for the Info Bar and Tooltip
  const hasHistory = history && history.length > 0;
  const currentBar = hoverIdx >= 0 && hasHistory ? history[hoverIdx] : (hasHistory ? history[history.length - 1] : null);

  // Compute indicator values
  const rsiArr = hasHistory ? calcRSI(history, 14) : [];
  const currentRsi = hasHistory && rsiArr.length ? rsiArr[hoverIdx >= 0 ? hoverIdx : rsiArr.length - 1] : null;

  const sma20 = hasHistory ? calcSMA(history, 20) : [];
  const currentSma20 = hasHistory && sma20.length ? sma20[hoverIdx >= 0 ? hoverIdx : sma20.length - 1] : null;

  const macd = hasHistory ? calcMACD(history) : null;
  const currentMacd = macd && macd.line.length ? macd.line[hoverIdx >= 0 ? hoverIdx : macd.line.length - 1] : null;

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !hasHistory) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinate space matching client bounding box
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const chartW = rect.width - RIGHT_PAD;
    const step = chartW / history.length;
    const idx = Math.min(history.length - 1, Math.max(0, Math.floor(mx / step)));
    
    setHoverIdx(idx);

    // Coordinate settings for absolute tooltip box
    const ttX = mx > chartW * 0.65 ? mx - 165 : mx + 12;
    const ttY = Math.max(4, my - 60);
    setTooltipPos({ x: ttX, y: ttY });
  };

  const handleMouseLeave = () => {
    setHoverIdx(-1);
  };

  return (
    <div className="card accent-cyan card-glow-cyan" ref={wrapRef}>
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--cyan-dim)', color: 'var(--cyan)' }}>📊</div>
          <span>{activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset} — Price Action</span>
        </div>
        <div className="card-actions">
          {['15m', '1h', '4h', '1d'].map(tf => (
            <button
              key={tf}
              className={`pill-btn timeframe-btn ${activeTimeframe === tf ? 'active' : ''}`}
              onClick={() => onChangeTimeframe(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
          <div className="vr"></div>
          <button
            className={`pill-btn ind-btn ${indicators.ma ? 'active' : ''}`}
            onClick={() => onToggleIndicator('ma')}
            title="Moving Averages"
          >
            MA
          </button>
          <button
            className={`pill-btn ind-btn ${indicators.bb ? 'active' : ''}`}
            onClick={() => onToggleIndicator('bb')}
            title="Bollinger Bands"
          >
            BB
          </button>
          <button
            className={`pill-btn ind-btn ${indicators.rsi ? 'active' : ''}`}
            onClick={() => onToggleIndicator('rsi')}
            title="RSI (14)"
          >
            RSI
          </button>
          <button
            className={`pill-btn ind-btn ${indicators.macd ? 'active' : ''}`}
            onClick={() => onToggleIndicator('macd')}
            title="MACD"
          >
            MACD
          </button>
          <button
            className={`pill-btn ind-btn ${indicators.vol ? 'active' : ''}`}
            onClick={() => onToggleIndicator('vol')}
            title="Volume Bars"
          >
            VOL
          </button>
        </div>
      </div>

      <div className="chart-info-bar">
        <div className="cib-item">
          <span className="cib-label">Open</span>
          <span className="cib-value">${currentBar ? currentBar.open.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces }) : '—'}</span>
        </div>
        <div className="cib-item">
          <span className="cib-label">High</span>
          <span className="cib-value price-up">${currentBar ? currentBar.high.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces }) : '—'}</span>
        </div>
        <div className="cib-item">
          <span className="cib-label">Low</span>
          <span className="cib-value price-down">${currentBar ? currentBar.low.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces }) : '—'}</span>
        </div>
        <div className="cib-item">
          <span className="cib-label">Close</span>
          <span className="cib-value">${currentBar ? currentBar.close.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces }) : '—'}</span>
        </div>
        <div className="cib-item">
          <span className="cib-label">Volume</span>
          <span className="cib-value text-muted">{currentBar ? currentBar.vol.toLocaleString() : '—'}</span>
        </div>
        <div className="vr"></div>
        <div className="cib-item">
          <span className="cib-label">SMA 20</span>
          <span className="cib-value" style={{ color: 'var(--magenta)' }}>
            {currentSma20 ? '$' + currentSma20.toFixed(decimalPlaces) : '—'}
          </span>
        </div>
        <div className="cib-item">
          <span className="cib-label">RSI 14</span>
          <span
            className="cib-value"
            style={{
              color: currentRsi === null ? 'var(--text-primary)' :
                     currentRsi > 70 ? 'var(--red)' :
                     currentRsi < 30 ? 'var(--emerald)' : 'var(--amber)'
            }}
          >
            {currentRsi ? currentRsi.toFixed(1) : '—'}
          </span>
        </div>
        <div className="cib-item">
          <span className="cib-label">MACD</span>
          <span
            className="cib-value"
            style={{ color: currentMacd >= 0 ? 'var(--emerald)' : 'var(--red)' }}
          >
            {currentMacd ? (currentMacd >= 0 ? '+' : '') + currentMacd.toFixed(3) : '—'}
          </span>
        </div>
      </div>

      <div className="chart-canvas-wrap" id="chart-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Dynamic Tooltip on Hover */}
        {hoverIdx >= 0 && currentBar && (
          <div
            id="chart-tooltip"
            style={{
              display: 'block',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div
              className="tt-price"
              style={{ color: currentBar.close >= currentBar.open ? 'var(--emerald)' : 'var(--red)' }}
            >
              ${currentBar.close.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}
            </div>
            <div className="tt-row">
              <span>O</span>
              <span>${currentBar.open.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}</span>
            </div>
            <div className="tt-row">
              <span>H</span>
              <span>${currentBar.high.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}</span>
            </div>
            <div className="tt-row">
              <span>L</span>
              <span>${currentBar.low.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}</span>
            </div>
            <div className="tt-row">
              <span>C</span>
              <span>${currentBar.close.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
