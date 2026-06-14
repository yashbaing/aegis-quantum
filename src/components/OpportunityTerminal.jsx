import React, { useRef, useEffect, useState } from 'react';

export default function OpportunityTerminal({
  opportunities,
  oppFilter,
  onChangeOppFilter,
  activeAlphaTab,
  onChangeAlphaTab,
  activeVeritasSubTab,
  onChangeVeritasSubTab,
  veritasMetrics,
  marketStatus,
  onOpenTelegramModal
}) {
  const equityCanvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 180 });
  const isSignals = activeAlphaTab === 'signals';

  // Resize handler for Equity Chart Canvas
  useEffect(() => {
    if (activeAlphaTab === 'veritas' && activeVeritasSubTab === 'chart') {
      const resizeCanvas = () => {
        if (!equityCanvasRef.current) return;
        const canvas = equityCanvasRef.current;
        const parent = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = parent.clientWidth;
        const h = parent.clientHeight || 180;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        setDimensions({ w, h });
      };

      // Delay slightly to allow display transitions to complete
      const timer = setTimeout(resizeCanvas, 60);
      window.addEventListener('resize', resizeCanvas);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [activeAlphaTab, activeVeritasSubTab]);

  // Equity Chart Drawing Effect
  useEffect(() => {
    if (
      activeAlphaTab === 'veritas' &&
      activeVeritasSubTab === 'chart' &&
      equityCanvasRef.current &&
      dimensions.w > 0
    ) {
      const canvas = equityCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const w = dimensions.w;
      const h = dimensions.h;

      ctx.clearRect(0, 0, w, h);

      const data = veritasMetrics.equityHistory || [0];
      const n = data.length;
      if (n < 2) {
        ctx.fillStyle = 'var(--text-secondary)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Accumulating trade signals for equity curve...', w / 2, h / 2);
        return;
      }

      let maxVal = Math.max(...data, 1);
      let minVal = Math.min(...data, -1);
      const padding = (maxVal - minVal) * 0.1 || 1;
      maxVal += padding;
      minVal -= padding;

      const scaleX = i => 42 + (i / (n - 1)) * (w - 75);
      const scaleY = v => 15 + (1 - (v - minVal) / (maxVal - minVal)) * (h - 30);

      // Draw horizontal grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.font = '8px var(--font-mono)';
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.textAlign = 'right';

      const gridCount = 4;
      for (let i = 0; i <= gridCount; i++) {
        const val = minVal + (i / gridCount) * (maxVal - minVal);
        const y = scaleY(val);

        ctx.beginPath();
        ctx.moveTo(42, y);
        ctx.lineTo(w - 15, y);
        ctx.stroke();

        ctx.fillText((val >= 0 ? '+' : '') + val.toFixed(1) + '%', 36, y + 3);
      }

      // Draw equity curve path
      ctx.beginPath();
      ctx.moveTo(scaleX(0), scaleY(data[0]));
      for (let i = 1; i < n; i++) {
        ctx.lineTo(scaleX(i), scaleY(data[i]));
      }

      // Stroke details with glow shadows
      ctx.save();
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // Draw gradient under equity path
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
      fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

      ctx.beginPath();
      ctx.moveTo(scaleX(0), h - 15);
      ctx.lineTo(scaleX(0), scaleY(data[0]));
      for (let i = 1; i < n; i++) {
        ctx.lineTo(scaleX(i), scaleY(data[i]));
      }
      ctx.lineTo(scaleX(n - 1), h - 15);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Draw node dots
      ctx.fillStyle = '#d946ef';
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(scaleX(i), scaleY(data[i]), i === n - 1 ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [activeAlphaTab, activeVeritasSubTab, dimensions, veritasMetrics.equityHistory]);

  const marketOpen = ['open', 'pre-market', 'after-hours'].includes(marketStatus);

  // Filter opportunities table
  const filteredOpps = oppFilter === 'buy' ? opportunities.filter(o => o.action === 'BUY') :
                       oppFilter === 'sell' ? opportunities.filter(o => o.action === 'SELL') :
                       opportunities;

  // Get verdict styling
  const getVerdictStyle = (v) => {
    switch (v) {
      case 'APPROVED':
        return {
          badgeClass: 'ab-buy',
          borderColor: 'rgba(16,185,129,0.3)',
          background: 'rgba(16,185,129,0.05)',
          desc: 'Strategy verified with high predictive edge. APPROVED for live execution.'
        };
      case 'REJECTED':
        return {
          badgeClass: 'ab-sell',
          borderColor: 'rgba(244,63,94,0.3)',
          background: 'rgba(244,63,94,0.05)',
          desc: 'Strategy rejected due to poor risk-adjusted returns or excessive drawdown.'
        };
      case 'MONITORING':
        return {
          badgeClass: 'ab-hold',
          borderColor: 'rgba(245,158,11,0.3)',
          background: 'rgba(245,158,11,0.05)',
          desc: 'Strategy shows mild performance. Retesting parameters under monitoring.'
        };
      default:
        return {
          badgeClass: 'ab-hold',
          borderColor: 'rgba(139,92,246,0.3)',
          background: 'rgba(139,92,246,0.05)',
          desc: 'Accumulating historical trade signals for strategy validation...'
        };
    }
  };

  const verdictStyle = getVerdictStyle(veritasMetrics.verdict);
  const wins = veritasMetrics.closedTrades.filter(t => t.status === 'WIN');
  const losses = veritasMetrics.closedTrades.filter(t => t.status === 'LOSS');
  const roiPct = ((veritasMetrics.capital - 10000) / 10000) * 100;

  // Sharpe tag details
  const getSharpeDetail = (s) => {
    if (s >= 2.0) return 'Excellent Edge';
    if (s >= 1.4) return 'Strong Edge';
    if (s >= 1.0) return 'Moderate Edge';
    return 'Weak Edge';
  };

  return (
    <div
      className={`card ${isSignals ? 'accent-emerald card-glow-emerald' : 'accent-violet card-glow-violet'}`}
      id="alpha-terminal-card"
    >
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="card-title"
            style={{
              cursor: 'pointer',
              color: isSignals ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: isSignals ? 1 : 0.65
            }}
            onClick={() => onChangeAlphaTab('signals')}
          >
            <div className="card-title-icon" style={{ background: 'var(--emerald-dim)', color: 'var(--emerald)' }}>🎯</div>
            Alpha Signals
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--r-pill)',
              background: 'var(--emerald-dim)',
              color: 'var(--emerald)',
              border: '1px solid rgba(16,185,129,0.25)',
              marginLeft: '0.25rem'
            }}>
              {opportunities.length}
            </span>
          </div>
          <div style={{ width: '1px', height: '14px', background: 'var(--border-2)' }} />
          <div
            className="card-title"
            style={{
              cursor: 'pointer',
              color: !isSignals ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: !isSignals ? 1 : 0.65
            }}
            onClick={() => onChangeAlphaTab('veritas')}
          >
            <div className="card-title-icon" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--violet)' }}>🛡️</div>
            Veritas Performance
          </div>
        </div>

        <div className="card-actions">
          {/* Signals tab controls */}
          {isSignals ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className={`pill-btn ${oppFilter === 'all' ? 'active' : ''}`}
                onClick={() => onChangeOppFilter('all')}
              >
                All
              </button>
              <button
                className={`pill-btn emerald ${oppFilter === 'buy' ? 'active' : ''}`}
                onClick={() => onChangeOppFilter('buy')}
              >
                Buy
              </button>
              <button
                className={`pill-btn ${oppFilter === 'sell' ? 'active' : ''}`}
                onClick={() => onChangeOppFilter('sell')}
              >
                Sell
              </button>
              <div className="vr" />
              <button
                className="pill-btn"
                style={{ borderColor: 'var(--magenta)', color: 'var(--magenta)' }}
                onClick={onOpenTelegramModal}
              >
                ✈️ Alerts
              </button>
            </div>
          ) : (
            /* Veritas tab controls */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className={`pill-btn ${activeVeritasSubTab === 'stats' ? 'active' : ''}`}
                onClick={() => onChangeVeritasSubTab('stats')}
              >
                Metrics
              </button>
              <button
                className={`pill-btn ${activeVeritasSubTab === 'chart' ? 'active' : ''}`}
                onClick={() => onChangeVeritasSubTab('chart')}
              >
                Equity Curve
              </button>
              <button
                className={`pill-btn ${activeVeritasSubTab === 'trades' ? 'active' : ''}`}
                onClick={() => onChangeVeritasSubTab('trades')}
              >
                Trade Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Market Closed Warning Notice Banner */}
      {isSignals && !marketOpen && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--r-md)',
          padding: '0.6rem 0.875rem',
          margin: '0 0.875rem 0.75rem',
          fontSize: '0.73rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.45'
        }}>
          <span style={{ fontSize: '1rem' }}>🔴</span>
          <span><strong>US Market Closed</strong> — Stock signals paused. Only Crypto (BTC, ETH, SOL) signals are active right now. US Equity Market opens at <strong>9:30 AM ET</strong>.</span>
        </div>
      )}

      {/* SIGNALS VIEW PANEL */}
      {isSignals && (
        <div className="opp-wrap">
          <table className="opp-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Asset</th>
                <th>Signal</th>
                <th>Target</th>
                <th>Stop</th>
                <th>Conf.</th>
                <th style={{ minWidth: '200px' }}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No signals found matching filter rules. Scanning markets...
                  </td>
                </tr>
              ) : (
                filteredOpps.map((o, idx) => {
                  const isBuy = o.action === 'BUY';
                  const typeLabel = o.assetType === 'perp' ? 'Perp' : o.assetType === 'dex' ? 'DEX' : o.assetType === 'cex' ? 'CEX' : o.assetType === 'stock' ? 'Stock' : 'Index';
                  const typeColor = ['stock', 'index'].includes(o.assetType) ? 'var(--amber)' : 'var(--cyan)';

                  return (
                    <tr key={idx} className={idx === 0 ? 'new-row' : ''}>
                      <td className="text-muted text-mono" style={{ fontSize: '0.7rem' }}>{o.time}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                          {o.asset === 'USDC/WETH' ? 'WETH/USDC' : o.asset}
                        </span>
                        {typeLabel && (
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
                        )}
                      </td>
                      <td>
                        <span className={`action-badge ${isBuy ? 'ab-buy' : 'ab-sell'}`}>{o.action}</span>
                      </td>
                      <td className="text-mono" style={{ fontWeight: 700 }}>
                        ${o.target.toLocaleString(undefined, { minimumFractionDigits: o.dec, maximumFractionDigits: o.dec })}
                      </td>
                      <td className="text-mono" style={{ color: 'var(--red)' }}>
                        ${o.stop.toLocaleString(undefined, { minimumFractionDigits: o.dec, maximumFractionDigits: o.dec })}
                      </td>
                      <td>
                        <div className="conf-bar-inline">
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            {o.conf}%
                          </span>
                          <div className="conf-bar-inline-track">
                            <div className="conf-bar-inline-fill" style={{ width: `${o.conf}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', maxWidth: '220px' }}>
                        {o.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VERITAS DASHBOARD PANEL */}
      {!isSignals && (
        <div className="veritas-wrap" style={{ display: 'flex', flex: 1, overflow: 'auto', padding: '0.875rem', flexDirection: 'column', gap: '1rem' }}>
          
          {/* STATS PANEL */}
          {activeVeritasSubTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--r-md)',
                  border: `1px solid ${verdictStyle.borderColor}`,
                  background: verdictStyle.background,
                  color: 'var(--text-primary)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🛡️</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Veritas Strategy Status</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{verdictStyle.desc}</div>
                  </div>
                </div>
                <span className={`action-badge ${verdictStyle.badgeClass}`}>{veritasMetrics.verdict}</span>
              </div>

              {/* STATS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                <div className="s-source-card" style={{ borderColor: 'var(--border-1)' }}>
                  <span className="s-source-name">Win Rate</span>
                  <span className="s-source-score" style={{ color: 'var(--cyan)' }}>
                    {veritasMetrics.winRate.toFixed(1)}%
                  </span>
                  <span className="s-source-change text-muted">
                    {wins.length} Wins / {losses.length} Losses
                  </span>
                </div>

                <div className="s-source-card" style={{ borderColor: 'var(--border-1)' }}>
                  <span className="s-source-name">Cumulative ROI</span>
                  <span className="s-source-score" style={{ color: roiPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                    {(roiPct >= 0 ? '+' : '') + roiPct.toFixed(2)}%
                  </span>
                  <span className="s-source-change text-muted">
                    Capital: ${veritasMetrics.capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="s-source-card" style={{ borderColor: 'var(--border-1)' }}>
                  <span className="s-source-name">Sharpe Ratio</span>
                  <span className="s-source-score" style={{ color: 'var(--violet)' }}>
                    {veritasMetrics.sharpeRatio.toFixed(2)}
                  </span>
                  <span className="s-source-change text-muted">{getSharpeDetail(veritasMetrics.sharpeRatio)}</span>
                </div>

                <div className="s-source-card" style={{ borderColor: 'var(--border-1)' }}>
                  <span className="s-source-name">Max Drawdown</span>
                  <span className="s-source-score" style={{ color: 'var(--red)' }}>
                    {veritasMetrics.maxDrawdown.toFixed(1)}%
                  </span>
                  <span className="s-source-change text-muted">Peak-to-Trough risk</span>
                </div>

                <div className="s-source-card" style={{ borderColor: 'var(--border-1)' }}>
                  <span className="s-source-name">Profit Factor</span>
                  <span className="s-source-score" style={{ color: 'var(--amber)' }}>
                    {veritasMetrics.profitFactor.toFixed(2)}
                  </span>
                  <span className="s-source-change text-muted">Gross Win / Loss</span>
                </div>
              </div>
            </div>
          )}

          {/* EQUITY CHART PANEL */}
          {activeVeritasSubTab === 'chart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '180px', position: 'relative' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Strategy Equity Curve (ROI %)
              </div>
              <div style={{ flex: 1, position: 'relative', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <canvas ref={equityCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
              </div>
            </div>
          )}

          {/* HISTORICAL TRADES LOG */}
          {activeVeritasSubTab === 'trades' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table className="opp-table" style={{ fontSize: '0.7rem' }}>
                <thead>
                  <tr>
                    <th>Closed</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Outcome</th>
                    <th>Return</th>
                  </tr>
                </thead>
                <tbody>
                  {veritasMetrics.closedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        No closed trades yet. Waiting for signals to resolve.
                      </td>
                    </tr>
                  ) : (
                    [...veritasMetrics.closedTrades].reverse().map((t, idx) => {
                      const isWin = t.status === 'WIN';
                      const typeLabel = t.assetType === 'perp' ? 'Perp' : t.assetType === 'dex' ? 'DEX' : t.assetType === 'cex' ? 'CEX' : t.assetType === 'stock' ? 'Stock' : 'Index';
                      const typeColor = ['stock', 'index'].includes(t.assetType) ? 'var(--amber)' : 'var(--cyan)';

                      return (
                        <tr key={idx}>
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
                            {isWin ? '🎯 Target Hit' : '⚠️ Stop Loss'}
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
          )}
        </div>
      )}
    </div>
  );
}
