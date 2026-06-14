import React from 'react';

export default function Orderbook({
  activeAsset,
  activeAssetPrice,
  decimalPlaces,
  spreadValue,
  marketView,
  onChangeMarketView,
  dexTrades
}) {
  const isCex = marketView === 'cex';

  // Calculate simulated CEX Order Book depths based on current price
  const generateCexDepth = () => {
    if (!activeAssetPrice) return { asks: [], bids: [], spread: 0 };
    const spread = spreadValue || activeAssetPrice * 0.00008;
    const half = spread / 2;

    const asks = [];
    for (let i = 6; i >= 1; i--) {
      const price = activeAssetPrice + half + i * activeAssetPrice * 0.00012;
      const size = Math.random() * (12.5 / Math.sqrt(i)); // adjust scale
      asks.push({
        price,
        size,
        total: price * size
      });
    }

    const bids = [];
    for (let i = 1; i <= 6; i++) {
      const price = activeAssetPrice - half - i * activeAssetPrice * 0.00012;
      const size = Math.random() * (12.5 / Math.sqrt(i));
      bids.push({
        price,
        size,
        total: price * size
      });
    }

    return { asks, bids, spread };
  };

  const { asks, bids, spread } = generateCexDepth();

  // Find max size to calculate progress bars for CEX book
  const maxSize = Math.max(
    ...asks.map(a => a.size),
    ...bids.map(b => b.size),
    1
  );

  return (
    <div className="card accent-cyan">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--cyan-dim)', color: 'var(--cyan)' }}>⚡</div>
          <span>{isCex ? 'Order Book (CEX Depth)' : 'DEX Swap Feed'}</span>
        </div>
        <div className="card-actions">
          <button
            className={`pill-btn ${isCex ? 'active' : ''}`}
            onClick={() => onChangeMarketView('cex')}
          >
            CEX Depth
          </button>
          <button
            className={`pill-btn ${!isCex ? 'active' : ''}`}
            onClick={() => onChangeMarketView('dex')}
          >
            DEX Trades
          </button>
        </div>
      </div>

      {/* CEX PANEL */}
      {isCex && (
        <div id="cex-ob-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="orderbook-wrap">
            <div className="ob-header">
              <span>Price (USD)</span>
              <span>Size</span>
              <span>Total</span>
            </div>

            {/* Asks (Sell Orders) - rendered bottom up */}
            <div className="ob-asks" style={{ flex: 1, overflow: 'hidden' }}>
              {asks.map((ask, idx) => {
                const pct = Math.min((ask.size / maxSize) * 100, 100);
                return (
                  <div className="ob-row" key={`ask-${idx}`}>
                    <div className="ob-bar ask" style={{ width: `${pct}%` }} />
                    <span className="ob-cell ob-ask-price">
                      {ask.price.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                    </span>
                    <span className="ob-cell text-mono text-muted">{ask.size.toFixed(3)}</span>
                    <span className="ob-cell text-mono text-muted">
                      {ask.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mid Market Spread */}
            <div className="ob-spread">
              <span className="ob-mid-price">
                ${activeAssetPrice.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
              </span>
              Spread: ${spread.toFixed(decimalPlaces)} · {((spread / activeAssetPrice) * 100).toFixed(3)}%
            </div>

            {/* Bids (Buy Orders) */}
            <div className="ob-bids" style={{ flex: 1, overflow: 'hidden' }}>
              {bids.map((bid, idx) => {
                const pct = Math.min((bid.size / maxSize) * 100, 100);
                return (
                  <div className="ob-row" key={`bid-${idx}`}>
                    <div className="ob-bar bid" style={{ width: `${pct}%` }} />
                    <span className="ob-cell ob-bid-price">
                      {bid.price.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                    </span>
                    <span className="ob-cell text-mono text-muted">{bid.size.toFixed(3)}</span>
                    <span className="ob-cell text-mono text-muted">
                      {bid.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DEX PANEL */}
      {!isCex && (
        <div id="dex-ob-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="ob-header" style={{ padding: '0.5rem 0.875rem' }}>
            <span>Time</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Price</span>
          </div>
          <div className="dex-stream" style={{ flex: 1, overflowY: 'auto' }}>
            {dexTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Waiting for swap transactions on DEX pools...
              </div>
            ) : (
              dexTrades.map((trade, idx) => {
                const isBuy = trade.type === 'BUY';
                return (
                  <div className="dex-row" key={`dex-${idx}`}>
                    <span className="text-muted">{trade.time}</span>
                    <span style={{ color: isBuy ? 'var(--emerald)' : 'var(--red)', fontWeight: 600 }}>
                      {trade.type}
                    </span>
                    <span className="text-mono">{trade.amount.toFixed(3)}</span>
                    <span className="text-mono text-cyan">
                      ${trade.price.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
