import { useRef, useEffect, useState, useMemo } from 'react';

export default function PortfolioDashboard({
  veritasMetrics,
  assets = {},
  onClosePosition,
  onResetDatabase,
  onRunBacktest,
  backtestRunning = false,
  backtestResults = null
}) {
  const chartCanvasRef = useRef(null);
  const btEquityCanvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'backtest'
  const [chartMode, setChartMode] = useState('usd');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');

  // Backtest config state
  const [btAsset, setBtAsset] = useState('BTC-PERP');
  const [btDays, setBtDays] = useState(30);
  const [btStrategy, setBtStrategy] = useState('standard');

  const closedTrades = useMemo(() => veritasMetrics.closedTrades || [], [veritasMetrics.closedTrades]);
  const activeTrades = veritasMetrics.activeTrades || [];

  const filteredTableTrades = closedTrades.filter(t => {
    const matchesSearch = t.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = tableStatusFilter === 'all' ||
                          (tableStatusFilter === 'win' && t.status === 'WIN') ||
                          (tableStatusFilter === 'loss' && t.status === 'LOSS');
    const matchesType = filterAssetType === 'all' || t.assetType === filterAssetType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ── Live Stats ──────────────────────────────────────────────
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter(t => t.status === 'WIN');
  const losses = closedTrades.filter(t => t.status === 'LOSS');
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const totalPnLUSD = closedTrades.reduce((sum, t) => sum + (t.pnl * 10000), 0);
  const currentCapital = 10000 + totalPnLUSD;
  const totalPnLPct = (totalPnLUSD / 10000) * 100;

  const avgWinUSD  = winCount  > 0 ? wins.reduce((s, t) => s + (t.pnl * 10000), 0) / winCount  : 0;
  const avgLossUSD = lossCount > 0 ? losses.reduce((s, t) => s + (t.pnl * 10000), 0) / lossCount : 0;

  let largestWin = 0, largestWinAsset = '—';
  let largestLoss = 0, largestLossAsset = '—';
  closedTrades.forEach(t => {
    const amount = t.pnl * 10000;
    if (t.status === 'WIN' && amount > largestWin)  { largestWin = amount; largestWinAsset = t.asset; }
    if (t.status === 'LOSS' && amount < largestLoss) { largestLoss = amount; largestLossAsset = t.asset; }
  });

  const rrRatio = Math.abs(avgLossUSD) > 0 ? Math.abs(avgWinUSD) / Math.abs(avgLossUSD) : 0;

  // Expectancy per trade (% basis)
  const expectancyUSD = totalTrades > 0
    ? (winRate / 100) * avgWinUSD + ((100 - winRate) / 100) * avgLossUSD
    : 0;

  // Sortino ratio (downside deviation)
  const returns = closedTrades.map(t => t.pnl);
  const meanRet = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const downsideRets = returns.filter(r => r < 0);
  const downsideVariance = downsideRets.reduce((a, b) => a + b * b, 0) / (downsideRets.length || 1);
  const sortinoRatio = Math.sqrt(downsideVariance) === 0 ? 0 : (meanRet / Math.sqrt(downsideVariance)) * Math.sqrt(252);

  // Win/loss streak
  let maxConsecWins = 0, maxConsecLosses = 0;
  let curWins = 0, curLosses = 0;
  closedTrades.forEach(t => {
    if (t.status === 'WIN')  { curWins++; curLosses = 0; if (curWins > maxConsecWins) maxConsecWins = curWins; }
    else                      { curLosses++; curWins = 0; if (curLosses > maxConsecLosses) maxConsecLosses = curLosses; }
  });

  // Recovery factor
  const recoveryFactor = veritasMetrics.maxDrawdown > 0
    ? Math.abs(totalPnLPct / veritasMetrics.maxDrawdown)
    : 0;

  // Asset contributions
  const assetPnL = {};
  closedTrades.forEach(t => { assetPnL[t.asset] = (assetPnL[t.asset] || 0) + (t.pnl * 10000); });
  const assetContributions = Object.entries(assetPnL)
    .map(([asset, pnl]) => ({ asset, pnl }))
    .sort((a, b) => b.pnl - a.pnl);
  const maxContribution = Math.max(...assetContributions.map(c => Math.abs(c.pnl)), 1);

  // ── Live P&L Chart ───────────────────────────────────────────
  const drawLiveChart = (canvas, data, mode) => {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight || 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No closed trades yet — execute simulations to build the curve.', w / 2, h / 2);
      return;
    }

    const pnlHistory = [0];
    let cumulative = 0;
    data.forEach(t => { cumulative += mode === 'usd' ? (t.pnl * 10000) : (t.pnl * 100); pnlHistory.push(cumulative); });

    const n = pnlHistory.length;
    const maxVal = Math.max(...pnlHistory, 1);
    const minVal = Math.min(...pnlHistory, -1);
    const pad = (maxVal - minVal) * 0.15 || 1;
    const top = maxVal + pad, bot = minVal - pad;

    const sx = i => 45 + (i / (n - 1)) * (w - 75);
    const sy = v => 20 + (1 - (v - bot) / (top - bot)) * (h - 45);

    // Grid
    ctx.font = '8px monospace'; ctx.textAlign = 'right';
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const val = bot + (i / 4) * (top - bot);
      const y = sy(val);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      const label = mode === 'usd' ? (val >= 0 ? '+$' : '-$') + Math.abs(val).toFixed(0) : (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
      ctx.fillText(label, 38, y + 3);
      ctx.beginPath(); ctx.moveTo(45, y); ctx.lineTo(w - 15, y); ctx.stroke();
    }

    // Zero line
    if (bot < 0 && top > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(45, sy(0)); ctx.lineTo(w - 15, sy(0)); ctx.stroke();
      ctx.setLineDash([]);
    }

    const isProfitable = pnlHistory[n - 1] >= 0;
    const lineColor = isProfitable ? '#10b981' : '#f43f5e';

    // Fill
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, isProfitable ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)');
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(sx(0), h - 25); ctx.lineTo(sx(0), sy(pnlHistory[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(sx(i), sy(pnlHistory[i]));
    ctx.lineTo(sx(n - 1), h - 25); ctx.closePath();
    ctx.fillStyle = fillGrad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.moveTo(sx(0), sy(pnlHistory[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(sx(i), sy(pnlHistory[i]));
    ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.stroke();

    // Dots
    ctx.fillStyle = lineColor;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(sx(i), sy(pnlHistory[i]), i === n - 1 ? 4 : 2, 0, Math.PI * 2); ctx.fill();
    }
  };

  useEffect(() => { drawLiveChart(chartCanvasRef.current, closedTrades, chartMode); }, [closedTrades, chartMode]);

  // ── Backtest equity chart ────────────────────────────────────
  const drawBtChart = (canvas, data) => {
    if (!canvas || !data || data.length < 2) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth || 600;
    const h = 160;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const n = data.length;
    const maxVal = Math.max(...data, 1), minVal = Math.min(...data, -1);
    const pad = (maxVal - minVal) * 0.15 || 1;
    const top = maxVal + pad, bot = minVal - pad;
    const sx = i => 10 + (i / (n - 1)) * (w - 20);
    const sy = v => 10 + (1 - (v - bot) / (top - bot)) * (h - 20);
    const isProfitable = data[n - 1] >= 0;
    const lineColor = isProfitable ? '#10b981' : '#f43f5e';

    if (bot < 0 && top > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(10, sy(0)); ctx.lineTo(w - 10, sy(0)); ctx.stroke();
      ctx.setLineDash([]);
    }

    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, isProfitable ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)');
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(sx(0), h); ctx.lineTo(sx(0), sy(data[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(sx(i), sy(data[i]));
    ctx.lineTo(sx(n - 1), h); ctx.closePath();
    ctx.fillStyle = fillGrad; ctx.fill();

    ctx.beginPath(); ctx.moveTo(sx(0), sy(data[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(sx(i), sy(data[i]));
    ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.stroke();
  };

  useEffect(() => {
    if (backtestResults && !backtestResults.error) {
      drawBtChart(btEquityCanvasRef.current, backtestResults.equityHistory);
    }
  }, [backtestResults]);

  // ── Metric helpers ────────────────────────────────────────────
  const colorByVal = (v, pos = 'emerald', neg = 'red') => v >= 0 ? `var(--${pos})` : `var(--${neg})`;

  return (
    <div className="portfolio-dashboard" id="portfolio-dashboard-panel">

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="portfolio-header">
        <div className="portfolio-title-section">
          <h1 className="portfolio-title-main">
            <span style={{ color: 'var(--cyan)' }}>📊</span> Portfolio Analytics
          </h1>
          <span className="portfolio-subtitle">
            Live performance tracked via IndexedDB · Simulated capital: $10,000
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button className={`pill-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={`pill-btn ${activeTab === 'backtest' ? 'active' : ''}`} onClick={() => setActiveTab('backtest')}>
              Backtest
            </button>
          </div>
          <div className="vr" />
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button className={`pill-btn ${chartMode === 'usd' ? 'active' : ''}`} onClick={() => setChartMode('usd')}>$ USD</button>
              <button className={`pill-btn ${chartMode === 'pct' ? 'active' : ''}`} onClick={() => setChartMode('pct')}>% ROI</button>
            </div>
          )}
          <div className="vr" />
          <button className="pill-btn danger" onClick={onResetDatabase}>↺ Reset</button>
        </div>
      </div>

      {/* ── DISCLAIMER STRIP ─────────────────────────────────── */}
      <div className="bt-disclaimer" style={{ marginBottom: 0 }}>
        <span>⚠️</span>
        <span>Past performance does not guarantee future results. All figures are simulated based on a $10,000 virtual account. This platform is for educational purposes only — always apply proper position sizing and stop-losses in real trading.</span>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  OVERVIEW TAB                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Summary stat cards */}
          <div className="portfolio-summary-grid">
            <div className="portfolio-summary-card accent-cyan">
              <div className="portfolio-summary-left">
                <span className="portfolio-summary-label">Portfolio Value</span>
                <span className="portfolio-summary-val text-cyan">
                  ${currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="portfolio-summary-subtext">Base capital: $10,000.00</span>
              </div>
              <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--cyan)' }}>🏦</div>
            </div>

            <div className={`portfolio-summary-card ${totalPnLUSD >= 0 ? 'accent-emerald' : 'accent-red'}`}>
              <div className="portfolio-summary-left">
                <span className="portfolio-summary-label">Realized P&L</span>
                <span className={`portfolio-summary-val ${totalPnLUSD >= 0 ? 'price-up' : 'price-down'}`}>
                  {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`portfolio-summary-subtext ${totalPnLUSD >= 0 ? 'price-up' : 'price-down'}`} style={{ fontWeight: 700 }}>
                  {totalPnLUSD >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}% ROI
                </span>
              </div>
              <div className="portfolio-summary-icon-badge"
                style={{ background: totalPnLUSD >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: totalPnLUSD >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                {totalPnLUSD >= 0 ? '📈' : '📉'}
              </div>
            </div>

            <div className="portfolio-summary-card accent-violet">
              <div className="portfolio-summary-left">
                <span className="portfolio-summary-label">Win Rate</span>
                <span className="portfolio-summary-val" style={{ color: 'var(--violet)' }}>{winRate.toFixed(1)}%</span>
                <span className="portfolio-summary-subtext">{winCount}W · {lossCount}L · {totalTrades} total</span>
              </div>
              <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet)' }}>🎯</div>
            </div>

            <div className="portfolio-summary-card accent-amber">
              <div className="portfolio-summary-left">
                <span className="portfolio-summary-label">Max Drawdown</span>
                <span className="portfolio-summary-val price-down">{veritasMetrics.maxDrawdown.toFixed(2)}%</span>
                <span className="portfolio-summary-subtext">Recovery factor: {recoveryFactor.toFixed(2)}×</span>
              </div>
              <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)' }}>📉</div>
            </div>
          </div>

          {/* P&L Chart + KPI grid */}
          <div className="portfolio-main-grid">
            <div className="card accent-cyan card-glow-cyan">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--cyan)' }}>📈</div>
                  Cumulative P&L Curve
                </div>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                  {activeTrades.length} positions active
                </span>
              </div>
              <div className="card-body" style={{ minHeight: '220px', padding: '0.875rem', position: 'relative' }}>
                <div style={{ flex: 1, position: 'relative', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', overflow: 'hidden', height: '200px' }}>
                  <canvas ref={chartCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>

            {/* Extended KPI panel */}
            <div className="card accent-violet card-glow-violet">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet)' }}>🛡️</div>
                  Risk Analytics
                </div>
              </div>
              <div className="card-body card-body-padded">
                <div className="portfolio-kpi-grid">
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Avg Win</span>
                    <span className="portfolio-kpi-value price-up">+${avgWinUSD.toFixed(1)}</span>
                    <span className="portfolio-kpi-desc">Profit per win</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Avg Loss</span>
                    <span className="portfolio-kpi-value price-down">-${Math.abs(avgLossUSD).toFixed(1)}</span>
                    <span className="portfolio-kpi-desc">Loss per stop hit</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Sharpe Ratio</span>
                    <span className="portfolio-kpi-value text-cyan">{veritasMetrics.sharpeRatio.toFixed(2)}</span>
                    <span className="portfolio-kpi-desc">{veritasMetrics.sharpeRatio >= 1.5 ? 'Strong' : veritasMetrics.sharpeRatio >= 1 ? 'Moderate' : 'Weak'} edge</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Sortino Ratio</span>
                    <span className="portfolio-kpi-value" style={{ color: sortinoRatio >= 1.5 ? 'var(--emerald)' : sortinoRatio >= 0.8 ? 'var(--amber)' : 'var(--red)' }}>
                      {sortinoRatio.toFixed(2)}
                    </span>
                    <span className="portfolio-kpi-desc">Downside risk only</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Profit Factor</span>
                    <span className="portfolio-kpi-value" style={{ color: 'var(--amber)' }}>{veritasMetrics.profitFactor.toFixed(2)}</span>
                    <span className="portfolio-kpi-desc">Gross P / Gross L</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Expectancy</span>
                    <span className="portfolio-kpi-value" style={{ color: colorByVal(expectancyUSD) }}>
                      {expectancyUSD >= 0 ? '+' : ''}${expectancyUSD.toFixed(1)}
                    </span>
                    <span className="portfolio-kpi-desc">Per simulated trade</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Best Streak</span>
                    <span className="portfolio-kpi-value price-up">{maxConsecWins}W</span>
                    <span className="portfolio-kpi-desc">Max consecutive wins</span>
                  </div>
                  <div className="portfolio-kpi-card">
                    <span className="portfolio-kpi-label">Worst Streak</span>
                    <span className="portfolio-kpi-value price-down">{maxConsecLosses}L</span>
                    <span className="portfolio-kpi-desc">Max consecutive losses</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Positions */}
          <div className="card accent-amber card-glow-amber">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)' }}>⚡</div>
                Active Positions
              </div>
              <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                Open: <strong style={{ color: 'var(--amber)' }}>{activeTrades.length}</strong>
              </span>
            </div>
            <div className="card-body" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table className="opp-table" style={{ fontSize: '0.7rem' }}>
                <thead>
                  <tr>
                    <th>Opened</th><th>Asset</th><th>Direction</th><th>Entry</th>
                    <th>Live Price</th><th>Target</th><th>Stop</th>
                    <th>Unrealized P&L ($)</th><th>Unrealized P&L (%)</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrades.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No active positions. Simulate a signal from the Signal Queue to track it here.
                    </td></tr>
                  ) : (
                    [...activeTrades].reverse().map((t, idx) => {
                      const currentPrice = assets[t.asset] ? assets[t.asset].currentPrice : t.entry;
                      const isBuy = t.action === 'BUY';
                      const pnlPct = isBuy ? (currentPrice - t.entry) / t.entry : (t.entry - currentPrice) / t.entry;
                      const pnlUSD = pnlPct * 10000;
                      return (
                        <tr key={t.id || idx}>
                          <td className="text-muted text-mono">{t.openTime}</td>
                          <td><span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{t.asset === 'USDC/WETH' ? 'WETH/USDC' : t.asset}</span></td>
                          <td><span className={`action-badge ${isBuy ? 'ab-buy' : 'ab-sell'}`}>{t.action}</span></td>
                          <td className="text-mono">${t.entry.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                          <td className="text-mono" style={{ color: 'var(--amber)' }}>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                          <td className="text-mono price-up">${t.target.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                          <td className="text-mono price-down">${t.stop.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                          <td style={{ fontWeight: 700 }} className={`text-mono ${pnlUSD >= 0 ? 'price-up' : 'price-down'}`}>
                            {pnlUSD >= 0 ? '+' : ''}${pnlUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontWeight: 700 }} className={`text-mono ${pnlPct >= 0 ? 'price-up' : 'price-down'}`}>
                            {(pnlPct >= 0 ? '+' : '') + (pnlPct * 100).toFixed(2)}%
                          </td>
                          <td>
                            <button className="pill-btn danger" style={{ padding: '0.1rem 0.45rem', fontSize: '0.62rem' }} onClick={() => onClosePosition(t.id)}>
                              ✕ Exit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail breakdown grid */}
          <div className="portfolio-details-grid">
            {/* Asset Contribution */}
            <div className="card accent-cyan card-glow-cyan">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--cyan)' }}>⚡</div>
                  P&L by Asset
                </div>
              </div>
              <div className="card-body">
                <div className="portfolio-asset-list">
                  {assetContributions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      Close trades to see asset contribution rankings.
                    </div>
                  ) : (
                    assetContributions.map((c, idx) => {
                      const pct = Math.min((Math.abs(c.pnl) / maxContribution) * 100, 100);
                      const isPos = c.pnl >= 0;
                      return (
                        <div className="asset-contribution-row" key={idx}>
                          <div className="asset-contribution-header">
                            <span className="asset-contribution-name">{c.asset === 'USDC/WETH' ? 'WETH/USDC' : c.asset}</span>
                            <span className={`asset-contribution-pnl ${isPos ? 'price-up' : 'price-down'}`}>
                              {isPos ? '+' : ''}${c.pnl.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </span>
                          </div>
                          <div className="contribution-bar-track">
                            <div className={`contribution-bar-fill ${isPos ? 'positive' : 'negative'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Trade History Log */}
            <div className="card accent-emerald card-glow-emerald">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)' }}>📋</div>
                  Trade History
                </div>
                <div className="card-actions" style={{ gap: '0.4rem' }}>
                  <input type="text" placeholder="Search..." className="chat-input"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', width: '100px', height: '24px', borderRadius: '4px' }}
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <select className="pill-btn" style={{ padding: '0.2rem 0.5rem', height: '24px', fontSize: '0.68rem', background: 'var(--bg-elevated)', outline: 'none' }}
                    value={tableStatusFilter} onChange={e => setTableStatusFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="win">Wins</option>
                    <option value="loss">Losses</option>
                  </select>
                  <select className="pill-btn" style={{ padding: '0.2rem 0.5rem', height: '24px', fontSize: '0.68rem', background: 'var(--bg-elevated)', outline: 'none' }}
                    value={filterAssetType} onChange={e => setFilterAssetType(e.target.value)}>
                    <option value="all">All</option>
                    <option value="perp">Perps</option>
                    <option value="cex">CEX</option>
                    <option value="dex">DEX</option>
                    <option value="stock">Stocks</option>
                  </select>
                </div>
              </div>
              <div className="card-body" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="opp-table" style={{ fontSize: '0.7rem' }}>
                  <thead>
                    <tr>
                      <th>Closed</th><th>Asset</th><th>Type</th><th>Entry</th>
                      <th>Exit</th><th>Outcome</th><th>P&L ($)</th><th>ROI (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableTrades.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No records match the filter.</td></tr>
                    ) : (
                      [...filteredTableTrades].reverse().map((t, idx) => {
                        const isWin = t.status === 'WIN';
                        const pnlUSD = t.pnl * 10000;
                        const typeLabel = t.assetType === 'perp' ? 'Perp' : t.assetType === 'dex' ? 'DEX' : t.assetType === 'cex' ? 'CEX' : t.assetType === 'stock' ? 'Stock' : 'Idx';
                        const typeColor = ['stock', 'index'].includes(t.assetType) ? 'var(--amber)' : 'var(--cyan)';
                        return (
                          <tr key={t.id || idx}>
                            <td className="text-muted text-mono">{t.closeTime}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{t.asset === 'USDC/WETH' ? 'WETH/USDC' : t.asset}</span>
                              <span style={{ display: 'inline-block', marginLeft: '4px', fontSize: '0.55rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40`, fontWeight: 700 }}>{typeLabel}</span>
                            </td>
                            <td><span className={`action-badge ${t.action === 'BUY' ? 'ab-buy' : 'ab-sell'}`}>{t.action}</span></td>
                            <td className="text-mono">${t.entry.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                            <td className="text-mono">${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: t.dec })}</td>
                            <td style={{ fontWeight: 700 }} className={isWin ? 'price-up' : 'price-down'}>{isWin ? '✓ Win' : '✗ Stop'}</td>
                            <td style={{ fontWeight: 700 }} className={`text-mono ${pnlUSD >= 0 ? 'price-up' : 'price-down'}`}>
                              {pnlUSD >= 0 ? '+' : '-'}${Math.abs(pnlUSD).toFixed(2)}
                            </td>
                            <td style={{ fontWeight: 700 }} className={`text-mono ${t.pnl >= 0 ? 'price-up' : 'price-down'}`}>
                              {(t.pnl >= 0 ? '+' : '') + (t.pnl * 100).toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  BACKTEST TAB                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'backtest' && (
        <>
          {/* Config panel */}
          <div className="backtest-config">
            <div className="bt-config-title">⚙️ Backtest Configuration — Historical Signal Replay</div>
            <div className="bt-form-row">
              <div className="bt-form-group">
                <label className="bt-label">Asset</label>
                <select className="bt-select" value={btAsset} onChange={e => setBtAsset(e.target.value)}>
                  <option value="BTC-PERP">BTC-PERP (Bitcoin)</option>
                  <option value="ETH-PERP">ETH-PERP (Ethereum)</option>
                  <option value="SOL-PERP">SOL-PERP (Solana)</option>
                </select>
              </div>
              <div className="bt-form-group">
                <label className="bt-label">Lookback Period</label>
                <select className="bt-select" value={btDays} onChange={e => setBtDays(Number(e.target.value))}>
                  <option value={7}>Last 7 days (1h bars)</option>
                  <option value={30}>Last 30 days (4h bars)</option>
                  <option value={90}>Last 90 days (4h bars)</option>
                </select>
              </div>
              <div className="bt-form-group">
                <label className="bt-label">Signal Strategy</label>
                <select className="bt-select" value={btStrategy} onChange={e => setBtStrategy(e.target.value)}>
                  <option value="conservative">Conservative (1% risk, tight stops)</option>
                  <option value="standard">Standard (2% risk, balanced)</option>
                  <option value="aggressive">Aggressive (3% risk, wider targets)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="bt-run-btn"
                disabled={backtestRunning}
                onClick={() => onRunBacktest(btAsset, btDays, btStrategy)}
              >
                {backtestRunning ? '⏳ Running...' : '▶ Run Backtest'}
              </button>
            </div>
          </div>

          {/* Results placeholder when idle */}
          {!backtestResults && !backtestRunning && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.78rem', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔬</div>
              Configure your parameters above and click <strong>Run Backtest</strong> to replay historical signals against real Binance market data.
            </div>
          )}

          {backtestRunning && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              Fetching historical klines from Binance and replaying signal logic...
            </div>
          )}

          {/* Error state */}
          {backtestResults?.error && (
            <div className="bt-disclaimer" style={{ borderColor: 'rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.04)' }}>
              <span>❌</span><span>{backtestResults.error}</span>
            </div>
          )}

          {/* Full results */}
          {backtestResults && !backtestResults.error && (
            <div className="backtest-results">
              {/* Header banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--glass-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{backtestResults.asset}</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>
                    {backtestResults.days}d lookback · {backtestResults.strategy} strategy · {backtestResults.totalTrades} trades
                  </span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: backtestResults.totalReturn >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                  {backtestResults.totalReturn >= 0 ? '+' : ''}{backtestResults.totalReturn.toFixed(2)}% Total Return
                </span>
              </div>

              {/* Metrics grid */}
              <div className="bt-metrics-grid">
                {[
                  { label: 'Win Rate', val: `${backtestResults.winRate.toFixed(1)}%`, sub: `${Math.round(backtestResults.winRate / 100 * backtestResults.totalTrades)}W · ${backtestResults.totalTrades - Math.round(backtestResults.winRate / 100 * backtestResults.totalTrades)}L`, color: 'var(--violet)' },
                  { label: 'Max Drawdown', val: `${backtestResults.maxDrawdown.toFixed(2)}%`, sub: 'Peak-to-trough loss', color: 'var(--red)' },
                  { label: 'Sharpe Ratio', val: backtestResults.sharpeRatio.toFixed(2), sub: backtestResults.sharpeRatio >= 1.5 ? 'Strong edge' : backtestResults.sharpeRatio >= 1 ? 'Moderate' : 'Weak', color: 'var(--cyan)' },
                  { label: 'Sortino Ratio', val: backtestResults.sortino.toFixed(2), sub: 'Downside-risk adjusted', color: backtestResults.sortino >= 1.5 ? 'var(--emerald)' : 'var(--amber)' },
                  { label: 'Profit Factor', val: backtestResults.profitFactor.toFixed(2), sub: 'Gross profit / loss', color: 'var(--amber)' },
                  { label: 'Expectancy', val: `${backtestResults.expectancy >= 0 ? '+' : ''}${backtestResults.expectancy.toFixed(2)}%`, sub: 'Per trade expected return', color: backtestResults.expectancy >= 0 ? 'var(--emerald)' : 'var(--red)' },
                  { label: 'Best Streak', val: `${backtestResults.maxConsecWins}W`, sub: 'Max consecutive wins', color: 'var(--emerald)' },
                  { label: 'Recovery Factor', val: backtestResults.recoveryFactor.toFixed(2), sub: 'Total return / max DD', color: 'var(--cyan)' },
                ].map((m, i) => (
                  <div className="bt-metric-card" key={i}>
                    <span className="bt-metric-label">{m.label}</span>
                    <span className="bt-metric-value" style={{ color: m.color }}>{m.val}</span>
                    <span className="bt-metric-sub">{m.sub}</span>
                  </div>
                ))}
              </div>

              {/* Equity curve */}
              <div className="bt-equity-wrap">
                <div className="bt-equity-header">
                  <span>Equity Curve — {backtestResults.asset} ({backtestResults.days}d)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: backtestResults.totalReturn >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>
                    ${(10000 * (1 + backtestResults.totalReturn / 100)).toFixed(0)} final
                  </span>
                </div>
                <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                  <canvas ref={btEquityCanvasRef} className="bt-equity-canvas" />
                </div>
              </div>

              {/* Trade log */}
              <div className="bt-equity-wrap">
                <div className="bt-equity-header">
                  <span>Simulated Trade Log</span>
                  <span className="text-muted" style={{ fontSize: '0.68rem' }}>{backtestResults.trades.length} entries</span>
                </div>
                <div className="bt-trades-list">
                  <div className="bt-trade-row header">
                    <span>#</span><span>Dir</span><span>Entry</span><span>Exit</span><span>P&L</span>
                  </div>
                  {backtestResults.trades.slice(-30).map((t, i) => (
                    <div className="bt-trade-row" key={i}>
                      <span className="text-muted">{i + 1}</span>
                      <span className={t.action === 'BUY' ? 'price-up' : 'price-down'} style={{ fontWeight: 700 }}>{t.action}</span>
                      <span>${t.entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span>${t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span style={{ fontWeight: 700, color: t.pnlPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                        {t.pnlPct >= 0 ? '+' : ''}{(t.pnlPct * 100).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
