import { useRef, useEffect, useState, useMemo } from 'react';

export default function PortfolioDashboard({ veritasMetrics }) {
  const chartCanvasRef = useRef(null);
  const [chartMode, setChartMode] = useState('usd'); // 'usd' or 'pct'
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');

  const closedTrades = useMemo(() => veritasMetrics.closedTrades || [], [veritasMetrics.closedTrades]);
  const activeTrades = veritasMetrics.activeTrades || [];

  // Filtered closed trades for history table
  const filteredTableTrades = closedTrades.filter(t => {
    const matchesSearch = t.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = tableStatusFilter === 'all' ||
                          (tableStatusFilter === 'win' && t.status === 'WIN') ||
                          (tableStatusFilter === 'loss' && t.status === 'LOSS');
    const matchesType = filterAssetType === 'all' || t.assetType === filterAssetType;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate statistics
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter(t => t.status === 'WIN');
  const losses = closedTrades.filter(t => t.status === 'LOSS');
  
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const totalPnLUSD = closedTrades.reduce((sum, t) => sum + (t.pnl * 10000), 0);
  const currentCapital = 10000 + totalPnLUSD;
  const totalPnLPct = (totalPnLUSD / 10000) * 100;

  // Average wins / losses
  const avgWinUSD = winCount > 0 ? wins.reduce((sum, t) => sum + (t.pnl * 10000), 0) / winCount : 0;
  const avgLossUSD = lossCount > 0 ? losses.reduce((sum, t) => sum + (t.pnl * 10000), 0) / lossCount : 0;

  // Largest win / loss
  let largestWin = 0;
  let largestWinAsset = '—';
  let largestLoss = 0;
  let largestLossAsset = '—';

  closedTrades.forEach(t => {
    const amount = t.pnl * 10000;
    if (t.status === 'WIN' && amount > largestWin) {
      largestWin = amount;
      largestWinAsset = t.asset;
    } else if (t.status === 'LOSS' && amount < largestLoss) {
      largestLoss = amount;
      largestLossAsset = t.asset;
    }
  });

  // Risk reward ratio (avg win vs avg loss magnitude)
  const rrRatio = Math.abs(avgLossUSD) > 0 ? Math.abs(avgWinUSD) / Math.abs(avgLossUSD) : 0;

  // Group performance by asset (Profit Contribution)
  const assetPnL = {};
  closedTrades.forEach(t => {
    const pnlVal = t.pnl * 10000;
    assetPnL[t.asset] = (assetPnL[t.asset] || 0) + pnlVal;
  });

  const assetContributions = Object.entries(assetPnL)
    .map(([asset, pnl]) => ({ asset, pnl }))
    .sort((a, b) => b.pnl - a.pnl);

  const maxContribution = Math.max(...assetContributions.map(c => Math.abs(c.pnl)), 1);

  // Render P&L chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const canvas = chartCanvasRef.current;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight || 220;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (closedTrades.length === 0) {
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No closed trades in history to generate P&L graph.', w / 2, h / 2);
      return;
    }

    // Prepare chart points
    const pnlHistory = [0];
    let cumulative = 0;
    closedTrades.forEach(t => {
      const val = chartMode === 'usd' ? (t.pnl * 10000) : (t.pnl * 100);
      cumulative += val;
      pnlHistory.push(cumulative);
    });

    const n = pnlHistory.length;
    const maxVal = Math.max(...pnlHistory, 1);
    const minVal = Math.min(...pnlHistory, -1);
    const padding = (maxVal - minVal) * 0.15 || 1;

    const topBound = maxVal + padding;
    const bottomBound = minVal - padding;

    const scaleX = i => 45 + (i / (n - 1)) * (w - 75);
    const scaleY = v => 20 + (1 - (v - bottomBound) / (topBound - bottomBound)) * (h - 45);

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.font = '8px var(--font-mono)';
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.textAlign = 'right';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const val = bottomBound + (i / gridLines) * (topBound - bottomBound);
      const y = scaleY(val);

      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(w - 15, y);
      ctx.stroke();

      const label = chartMode === 'usd' 
        ? (val >= 0 ? '+$' : '-$') + Math.abs(val).toFixed(0)
        : (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
      ctx.fillText(label, 38, y + 3);
    }

    // Draw zero P&L baseline
    if (bottomBound < 0 && topBound > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(45, scaleY(0));
      ctx.lineTo(w - 15, scaleY(0));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw line path
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(pnlHistory[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(scaleX(i), scaleY(pnlHistory[i]));
    }

    // Glow effects
    ctx.save();
    const isProfitable = pnlHistory[n - 1] >= 0;
    const lineColor = isProfitable ? '#10b981' : '#f43f5e';
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // Gradient filling underneath line
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, isProfitable ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)');
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(scaleX(0), h - 25);
    ctx.lineTo(scaleX(0), scaleY(pnlHistory[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(scaleX(i), scaleY(pnlHistory[i]));
    }
    ctx.lineTo(scaleX(n - 1), h - 25);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Node dots
    ctx.fillStyle = isProfitable ? '#34d399' : '#fb7185';
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(scaleX(i), scaleY(pnlHistory[i]), i === n - 1 ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [closedTrades, chartMode]);

  return (
    <div className="portfolio-dashboard" id="portfolio-dashboard-panel">
      {/* HEADER SECTION */}
      <div className="portfolio-header">
        <div className="portfolio-title-section">
          <h1 className="portfolio-title-main">
            <span style={{ color: 'var(--cyan)' }}>📊</span> Portfolio Performance Analytics
          </h1>
          <span className="portfolio-subtitle">
            Persistent log metrics synchronized with live IndexedDB engine.
          </span>
        </div>
        
        {/* Toggles for charts */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className={`pill-btn ${chartMode === 'usd' ? 'active' : ''}`}
            onClick={() => setChartMode('usd')}
          >
            PnL ($ USD)
          </button>
          <button
            className={`pill-btn ${chartMode === 'pct' ? 'active' : ''}`}
            onClick={() => setChartMode('pct')}
          >
            PnL (% ROI)
          </button>
        </div>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="portfolio-summary-grid">
        {/* Metric 1: Value */}
        <div className="portfolio-summary-card accent-cyan">
          <div className="portfolio-summary-left">
            <span className="portfolio-summary-label">Current Value</span>
            <span className="portfolio-summary-val text-cyan">
              ${currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="portfolio-summary-subtext">Original Capital: $10,000.00</span>
          </div>
          <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>
            🏦
          </div>
        </div>

        {/* Metric 2: Net PnL */}
        <div className={`portfolio-summary-card ${totalPnLUSD >= 0 ? 'accent-emerald' : 'accent-red'}`}>
          <div className="portfolio-summary-left">
            <span className="portfolio-summary-label">Total Net P&L</span>
            <span className={`portfolio-summary-val ${totalPnLUSD >= 0 ? 'price-up' : 'price-down'}`}>
              {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`portfolio-summary-subtext ${totalPnLUSD >= 0 ? 'price-up' : 'price-down'}`} style={{ fontWeight: 700 }}>
              {totalPnLUSD >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}% ROI
            </span>
          </div>
          <div 
            className="portfolio-summary-icon-badge" 
            style={{ 
              background: totalPnLUSD >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)', 
              color: totalPnLUSD >= 0 ? 'var(--emerald)' : 'var(--red)' 
            }}
          >
            {totalPnLUSD >= 0 ? '📈' : '📉'}
          </div>
        </div>

        {/* Metric 3: Win Rate */}
        <div className="portfolio-summary-card accent-violet">
          <div className="portfolio-summary-left">
            <span className="portfolio-summary-label">Win Rate</span>
            <span className="portfolio-summary-val" style={{ color: 'var(--violet)' }}>
              {winRate.toFixed(1)}%
            </span>
            <span className="portfolio-summary-subtext">Consensus Edge ratio</span>
          </div>
          <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--violet)' }}>
            🎯
          </div>
        </div>

        {/* Metric 4: Open / Total Trades */}
        <div className="portfolio-summary-card accent-amber">
          <div className="portfolio-summary-left">
            <span className="portfolio-summary-label">Trades Count</span>
            <span className="portfolio-summary-val text-cyan">
              {totalTrades}
            </span>
            <span className="portfolio-summary-subtext">
              <span className="price-up" style={{ fontWeight: 700 }}>{winCount} Wins</span> · <span className="price-down" style={{ fontWeight: 700 }}>{lossCount} Losses</span>
            </span>
          </div>
          <div className="portfolio-summary-icon-badge" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}>
            ⚡
          </div>
        </div>
      </div>

      {/* CHART & KPI HIGHLIGHTS */}
      <div className="portfolio-main-grid">
        {/* Canvas Cumulative P&L line graph */}
        <div className="card accent-cyan card-glow-cyan">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>📈</div>
              Cumulative P&L Curve
            </div>
            <div className="card-actions">
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                Open positions active: <strong>{activeTrades.length}</strong>
              </span>
            </div>
          </div>
          <div className="card-body" style={{ minHeight: '220px', padding: '0.875rem', position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <canvas ref={chartCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Analytics KPIs List */}
        <div className="card accent-violet card-glow-violet">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--violet)' }}>🛡️</div>
              Performance Analytics
            </div>
          </div>
          <div className="card-body card-body-padded" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="portfolio-kpi-grid">
              {/* average profit per win */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Avg Win Trade</span>
                <span className="portfolio-kpi-value price-up">
                  +${avgWinUSD.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="portfolio-kpi-desc">Profit of win entries</span>
              </div>

              {/* average loss per loss */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Avg Loss Trade</span>
                <span className="portfolio-kpi-value price-down">
                  -${Math.abs(avgLossUSD).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="portfolio-kpi-desc">Risk on stop hits</span>
              </div>

              {/* risk reward ratio */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Risk-Reward Ratio</span>
                <span className="portfolio-kpi-value text-cyan">
                  {rrRatio.toFixed(2)} : 1
                </span>
                <span className="portfolio-kpi-desc">Avg Win / Avg Loss</span>
              </div>

              {/* profit factor */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Profit Factor</span>
                <span className="portfolio-kpi-value" style={{ color: 'var(--amber)' }}>
                  {veritasMetrics.profitFactor.toFixed(2)}
                </span>
                <span className="portfolio-kpi-desc">Gross Profit / Loss</span>
              </div>

              {/* largest win */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Largest Win</span>
                <span className="portfolio-kpi-value price-up" style={{ fontSize: '0.95rem' }}>
                  +${largestWin.toFixed(0)} <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>({largestWinAsset})</span>
                </span>
                <span className="portfolio-kpi-desc">Highest trade return</span>
              </div>

              {/* largest loss */}
              <div className="portfolio-kpi-card">
                <span className="portfolio-kpi-label">Largest Loss</span>
                <span className="portfolio-kpi-value price-down" style={{ fontSize: '0.95rem' }}>
                  -${Math.abs(largestLoss).toFixed(0)} <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>({largestLossAsset})</span>
                </span>
                <span className="portfolio-kpi-desc">Highest stop drawdown</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL BREAKDOWN GRID */}
      <div className="portfolio-details-grid">
        {/* Asset profit contribution column */}
        <div className="card accent-cyan card-glow-cyan">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>⚡</div>
              Asset Profit Contribution
            </div>
          </div>
          <div className="card-body">
            <div className="portfolio-asset-list">
              {assetContributions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  No trade details available to calculate contribution rankings.
                </div>
              ) : (
                assetContributions.map((contrib, idx) => {
                  const pct = Math.min((Math.abs(contrib.pnl) / maxContribution) * 100, 100);
                  const isPos = contrib.pnl >= 0;

                  return (
                    <div className="asset-contribution-row" key={idx}>
                      <div className="asset-contribution-header">
                        <span className="asset-contribution-name">{contrib.asset === 'USDC/WETH' ? 'WETH/USDC' : contrib.asset}</span>
                        <span className={`asset-contribution-pnl ${isPos ? 'price-up' : 'price-down'}`}>
                          {isPos ? '+' : ''}${contrib.pnl.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      <div className="contribution-bar-track">
                        <div 
                          className={`contribution-bar-fill ${isPos ? 'positive' : 'negative'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Closed Trades History Table */}
        <div className="card accent-emerald card-glow-emerald">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'var(--emerald-dim)', color: 'var(--emerald)' }}>🎯</div>
              Trade History Log
            </div>
            
            {/* Filter controls */}
            <div className="card-actions" style={{ gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search symbol..."
                className="chat-input"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', width: '120px', height: '24px', borderRadius: '4px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="pill-btn"
                style={{ padding: '0.2rem 0.5rem', height: '24px', fontSize: '0.68rem', background: 'var(--bg-elevated)', outline: 'none' }}
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value)}
              >
                <option value="all">All Outcomes</option>
                <option value="win">Wins only</option>
                <option value="loss">Losses only</option>
              </select>
              <select
                className="pill-btn"
                style={{ padding: '0.2rem 0.5rem', height: '24px', fontSize: '0.68rem', background: 'var(--bg-elevated)', outline: 'none' }}
                value={filterAssetType}
                onChange={(e) => setFilterAssetType(e.target.value)}
              >
                <option value="all">All Sectors</option>
                <option value="perp">Perps</option>
                <option value="cex">CEX Spot</option>
                <option value="dex">DEX Pools</option>
                <option value="stock">Stocks</option>
              </select>
            </div>
          </div>

          <div className="card-body" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table className="opp-table" style={{ fontSize: '0.7rem' }}>
              <thead>
                <tr>
                  <th>Closed</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Outcome</th>
                  <th>Return ($)</th>
                  <th>Return (%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No trades matched the filters or search query.
                    </td>
                  </tr>
                ) : (
                  [...filteredTableTrades].reverse().map((t, idx) => {
                    const isWin = t.status === 'WIN';
                    const pnlUSD = t.pnl * 10000;
                    const typeLabel = t.assetType === 'perp' ? 'Perp' : t.assetType === 'dex' ? 'DEX' : t.assetType === 'cex' ? 'CEX' : t.assetType === 'stock' ? 'Stock' : 'Index';
                    const typeColor = ['stock', 'index'].includes(t.assetType) ? 'var(--amber)' : 'var(--cyan)';

                    return (
                      <tr key={t.id || idx}>
                        <td className="text-muted text-mono">{t.closeTime}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                            {t.asset === 'USDC/WETH' ? 'WETH/USDC' : t.asset}
                          </span>
                          <span style={{
                            display: 'inline-block',
                            marginLeft: '4px',
                            fontSize: '0.55rem',
                            padding: '0.05rem 0.3rem',
                            borderRadius: '3px',
                            background: `${typeColor}18`,
                            color: typeColor,
                            border: `1px solid ${typeColor}40`,
                            fontWeight: 700
                          }}>
                            {typeLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`action-badge ${t.action === 'BUY' ? 'ab-buy' : 'ab-sell'}`}>
                            {t.action}
                          </span>
                        </td>
                        <td className="text-mono">
                          ${t.entry.toLocaleString(undefined, { minimumFractionDigits: t.dec })}
                        </td>
                        <td className="text-mono">
                          ${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: t.dec })}
                        </td>
                        <td style={{ fontWeight: 700 }} className={isWin ? 'price-up' : 'price-down'}>
                          {isWin ? '🎯 Target Hit' : '🛑 Stopped Out'}
                        </td>
                        <td style={{ fontWeight: 700 }} className={`text-mono ${pnlUSD >= 0 ? 'price-up' : 'price-down'}`}>
                          {(pnlUSD >= 0 ? '+' : '-')}${Math.abs(pnlUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </div>
  );
}
