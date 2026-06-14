import React from 'react';

// ============================================================
// DUP UTILITY MATH FOR STOCK SCREENER SIGNALS
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

function getStockSignal(asset) {
  if (!asset.history || asset.history.length < 20) {
    const c = asset.change;
    if (c > 2.5) return { signal: 'STRONG BUY', cls: 'ab-buy', conf: 85 };
    if (c > 0.5) return { signal: 'BUY', cls: 'ab-buy', conf: 72 };
    if (c < -2.5) return { signal: 'STRONG SELL', cls: 'ab-sell', conf: 82 };
    if (c < -0.5) return { signal: 'SELL', cls: 'ab-sell', conf: 68 };
    return { signal: 'HOLD', cls: 'ab-hold', conf: 60 };
  }
  const rsi = calcRSI(asset.history, 14).filter(v => v != null);
  const macd = calcMACD(asset.history);
  const n = asset.history.length;
  const r = rsi[rsi.length - 1] || 50;
  const mLine = macd.line[n - 1] || 0;
  const mSig = macd.signal[n - 1] || 0;
  const bullish = mLine > mSig && r < 70;
  const oversold = r < 30;
  const overbought = r > 70;
  
  if (oversold && mLine > mSig) return { signal: 'STRONG BUY', cls: 'ab-buy', conf: 88 };
  if (bullish) return { signal: 'BUY', cls: 'ab-buy', conf: 76 };
  if (overbought) return { signal: 'SELL', cls: 'ab-sell', conf: 74 };
  if (mLine < mSig && asset.change < 0) return { signal: 'SELL', cls: 'ab-sell', conf: 71 };
  return { signal: 'HOLD', cls: 'ab-hold', conf: 62 };
}

const INDEX_LIST = [
  { symbol: 'SPY', name: 'S&P 500', icon: '📊', color: 'var(--cyan)' },
  { symbol: 'QQQ', name: 'NASDAQ 100', icon: '💻', color: 'var(--violet)' },
  { symbol: '^DJI', name: 'Dow Jones', icon: '🏦', color: 'var(--emerald)' },
  { symbol: '^VIX', name: 'VIX / Fear', icon: '😨', color: 'var(--amber)' },
];

const STOCK_SCREENER_LIST = [
  { symbol: 'AAPL', company: 'Apple Inc.', color: '#888888', sector: 'Technology' },
  { symbol: 'MSFT', company: 'Microsoft Corp.', color: '#00a4ef', sector: 'Technology' },
  { symbol: 'NVDA', company: 'NVIDIA Corp.', color: '#76b900', sector: 'Semiconductors' },
  { symbol: 'TSLA', company: 'Tesla Inc.', color: '#e31937', sector: 'Automotive' },
  { symbol: 'META', company: 'Meta Platforms Inc.', color: '#0082fb', sector: 'Social Media' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.', color: '#4285f4', sector: 'Technology' },
  { symbol: 'AMZN', company: 'Amazon.com Inc.', color: '#ff9900', sector: 'E-Commerce' },
  { symbol: 'NFLX', company: 'Netflix Inc.', color: '#e50914', sector: 'Streaming' },
  { symbol: 'AMD', company: 'AMD Inc.', color: '#ed1c24', sector: 'Semiconductors' },
  { symbol: 'COIN', company: 'Coinbase Global Inc.', color: '#0052ff', sector: 'Fintech' },
];

export default function StockScreener({
  marketStatusInfo,
  stockLoading,
  stockLoadingFailed,
  onRetryStockFetch,
  assets,
  onSelectAsset,
  etClock
}) {
  const isClosed = marketStatusInfo.status === 'closed';

  return (
    <div className="card accent-emerald" id="stocks-section-card" style={{ position: 'relative' }}>
      
      {/* Stock Market Closed Overlay */}
      {isClosed && (
        <div id="stocks-closed-overlay" className="stocks-closed-overlay" style={{ display: 'flex' }}>
          <div className="sco-inner">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔴</div>
            <div className="sco-title">US Stock Market Closed</div>
            <div className="sco-sub" id="sco-sub-text">Prices shown are from the last closing session.</div>
            <div className="sco-times">
              <div className="sco-time-item"><span>Pre-Market</span><strong>4:00 AM ET</strong></div>
              <div className="sco-time-item"><span>Market Open</span><strong>9:30 AM ET</strong></div>
              <div className="sco-time-item"><span>Market Close</span><strong>4:00 PM ET</strong></div>
              <div className="sco-time-item"><span>After-Hours</span><strong>8:00 PM ET</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Live Data Loading/Error Overlays */}
      {stockLoading && (
        <div id="stock-loading-overlay" style={{ display: 'flex', position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(5,7,12,0.75)', backdropFilter: 'blur(4px)', borderRadius: 'var(--r-xl)', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>⏳</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 600 }}>Fetching live stock prices…</div>
          </div>
        </div>
      )}

      {stockLoadingFailed && (
        <div id="stock-loading-overlay" style={{ display: 'flex', position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(5,7,12,0.75)', backdropFilter: 'blur(4px)', borderRadius: 'var(--r-xl)', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>⚠️</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--amber)', fontWeight: 600 }}>Live proxy unavailable. Prices may be delayed.</div>
            <button
              onClick={onRetryStockFetch}
              style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--amber)', background: 'transparent', color: 'var(--amber)', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--emerald-dim)', color: 'var(--emerald)' }}>📈</div>
          US Equity Markets &amp; Stock Screener
        </div>
        <div
          className="market-status-pill"
          id="mkt-status-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.28rem 0.75rem',
            borderRadius: 'var(--r-pill)',
            border: `1px solid ${marketStatusInfo.color}40`,
            color: marketStatusInfo.color,
            fontSize: '0.7rem',
            fontWeight: 700
          }}
        >
          <div
            className="mkt-dot"
            id="mkt-dot"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: marketStatusInfo.color,
              boxShadow: `0 0 6px ${marketStatusInfo.color}`,
              animation: marketStatusInfo.status === 'open' ? 'pulse 1.5s infinite alternate' : 'none',
              flexShrink: 0
            }}
          />
          <span id="mkt-status-label">{marketStatusInfo.label}</span>
          <span id="mkt-eta" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.2rem' }}>
            {marketStatusInfo.detail}
          </span>
        </div>
        <div className="card-actions">
          <span className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} id="mkt-et-clock">
            {etClock}
          </span>
          <div className="vr" />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Yahoo Finance</span>
        </div>
      </div>

      {/* Indices Strip */}
      <div className="indices-strip" id="indices-strip">
        {INDEX_LIST.map((idx) => {
          const asset = assets[idx.symbol];
          if (!asset) return null;
          const isUp = asset.change >= 0;
          const isLive = asset.dataSource === 'live';

          return (
            <div className="index-card" key={idx.symbol} onClick={() => onSelectAsset(idx.symbol, 'index')} style={{ cursor: 'pointer' }}>
              <div className="index-card-header">
                <span className="idx-icon">{idx.icon}</span>
                <span className="idx-name">{idx.name}</span>
                {isLive && <span className="idx-live-dot" />}
              </div>
              <div className="idx-price" style={{ color: isUp ? 'var(--emerald)' : 'var(--red)' }}>
                {idx.symbol === '^VIX' ? '' : '$'}
                {asset.currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: asset.dec,
                  maximumFractionDigits: asset.dec
                })}
              </div>
              <div className="idx-change" style={{ color: isUp ? 'var(--emerald)' : 'var(--red)' }}>
                {isUp ? '▲' : '▼'} {Math.abs(asset.change).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Screener Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="stock-table" id="stock-screener-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Volume</th>
              <th>Mkt Cap</th>
              <th>AI Signal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="stock-screener-tbody">
            {STOCK_SCREENER_LIST.map((s) => {
              const asset = assets[s.symbol];
              if (!asset) return null;
              const isUp = asset.change >= 0;
              const sig = getStockSignal(asset);
              const isLive = asset.dataSource === 'live';
              
              const statusTxt = marketStatusInfo.status === 'open' ? '🟢 Open' :
                                marketStatusInfo.status === 'pre-market' ? '🟡 Pre-Mkt' :
                                marketStatusInfo.status === 'after-hours' ? '🟠 After-Hrs' : '🔴 Closed';

              return (
                <tr
                  className="stock-row"
                  key={s.symbol}
                  onClick={() => onSelectAsset(s.symbol, 'stock')}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          background: `${s.color}22`,
                          color: s.color,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{s.symbol}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{s.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.company}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      ${asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {isLive && <span style={{ fontSize: '0.55rem', color: 'var(--emerald)', marginLeft: '3px' }}>LIVE</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: isUp ? 'var(--emerald)' : 'var(--red)', fontWeight: 700, fontSize: '0.78rem' }}>
                      {isUp ? '▲' : '▼'} {Math.abs(asset.change).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {asset.vol24h ? `${asset.vol24h.toFixed(1)}M` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {asset.marketCap ? `$${asset.marketCap.toFixed(0)}B` : '—'}
                  </td>
                  <td>
                    <span className={`action-badge ${sig.cls}`}>{sig.signal}</span>{' '}
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{sig.conf}%</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.68rem' }}>{statusTxt}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
