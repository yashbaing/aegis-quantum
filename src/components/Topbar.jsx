import React from 'react';

const BADGE_CONFIGS = {
  perp: { label: 'Perp', bg: 'rgba(217,70,239,0.12)', color: '#d946ef', border: 'rgba(217,70,239,0.25)' },
  dex: { label: 'DEX', bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: 'rgba(6,182,212,0.25)' },
  cex: { label: 'CEX', bg: 'rgba(0,82,255,0.12)', color: '#0052ff', border: 'rgba(0,82,255,0.25)' },
  stock: { label: 'Stock', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  index: { label: 'Index', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
};

const TYPE_LABELS = {
  perp: 'Perpetual Contract · dYdX',
  dex: 'DEX Liquidity Pool',
  cex: 'CEX Spot Market',
  stock: 'Equity · US Market',
  index: 'Market Index'
};

const ASSET_ICON_MAP = {
  'BTC-PERP': '₿', 'BTC/USD': '₿',
  'ETH-PERP': 'Ξ', 'ETH/USDT': 'Ξ', 'USDC/WETH': '🦄',
  'SOL-PERP': '◎', 'SOL/USDC': '⚡',
  'AAPL': '🍎', 'MSFT': 'M', 'NVDA': 'N', 'TSLA': 'T', 'META': 'f', 'GOOGL': 'G', 'AMZN': 'A', 'AMD': 'A', 'COIN': 'C',
  'SPY': '📊', 'QQQ': '💻', '^DJI': '🏦', '^VIX': '😨'
};

export default function Topbar({
  activeAsset,
  activeAssetType,
  asset,
  opportunitiesCount,
  agentsRunning,
  sentimentIndex,
  fearGreed,
  stockDataLive,
  cryptoDataLive,
  assetMood,
  onToggleAgents,
  onOpenTelegramModal,
  telegramEnabled
}) {
  if (!asset) return null;

  const isUp = asset.change >= 0;
  const badge = BADGE_CONFIGS[activeAssetType] || { label: activeAssetType, bg: 'rgba(255,255,255,0.1)', color: '#fff', border: 'rgba(255,255,255,0.2)' };
  
  // Format price
  const priceFormatted = asset.currentPrice.toLocaleString(undefined, {
    minimumFractionDigits: asset.dec,
    maximumFractionDigits: asset.dec
  });
  
  const changeFormatted = (isUp ? '+' : '') + asset.change.toFixed(2) + '%';

  // Compute overall market mood text
  const getOverallMood = (pct) => {
    if (pct > 60) return { label: `Bullish ${pct}%`, color: 'var(--emerald)' };
    if (pct < 40) return { label: `Bearish ${pct}%`, color: 'var(--red)' };
    return { label: `Neutral ${pct}%`, color: 'var(--amber)' };
  };

  const overallMood = getOverallMood(sentimentIndex);

  // Compute fear & greed label
  const getFearGreedLabel = (val) => {
    if (val > 75) return { label: `Extreme Greed ${val}`, color: 'var(--amber)' };
    if (val > 55) return { label: `Greed ${val}`, color: 'var(--amber)' };
    if (val > 45) return { label: `Neutral ${val}`, color: 'var(--text-primary)' };
    if (val > 25) return { label: `Fear ${val}`, color: 'var(--red)' };
    return { label: `Extreme Fear ${val}`, color: 'var(--red)' };
  };

  const fgLabel = getFearGreedLabel(fearGreed);

  // Determine volume label
  let volDisplay = '$14.28B';
  if (asset.type === 'perp' || asset.type === 'cex') {
    volDisplay = asset.vol24h ? `$${asset.vol24h.toFixed(1)}M` : '$14.28B';
  } else if (asset.type === 'stock') {
    volDisplay = asset.vol24h ? `${asset.vol24h.toFixed(1)}M` : '—';
  } else if (asset.type === 'dex') {
    volDisplay = asset.vol24h ? `$${asset.vol24h.toFixed(1)}M` : '—';
  }

  // Get data source badge text and color
  const getDataSourceInfo = () => {
    if (cryptoDataLive && stockDataLive) {
      return { text: '⚡ Live Binance + Yahoo Finance', color: 'var(--emerald)' };
    } else if (cryptoDataLive) {
      return { text: '⚡ Live Crypto · Stocks Delayed', color: 'var(--cyan)' };
    } else if (stockDataLive) {
      return { text: '📈 Live Stocks · Crypto Simulated', color: 'var(--cyan)' };
    } else {
      return { text: '⚙ Simulated — No Live Feed', color: 'var(--amber)' };
    }
  };

  const dsInfo = getDataSourceInfo();
  const heroIcon = ASSET_ICON_MAP[activeAsset] || activeAsset[0];

  return (
    <header className="topbar">
      <div className="asset-hero">
        <div className="asset-hero-icon" style={{ background: badge.bg, color: badge.color, fontSize: '1rem', fontWeight: 800 }}>
          {heroIcon}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="asset-hero-name">{activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset}</span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              textTransform: 'uppercase'
            }}>
              {badge.label}
            </span>
          </div>
          <div className="asset-hero-type">{TYPE_LABELS[activeAssetType] || activeAssetType}</div>
        </div>
        <div style={{ marginLeft: '0.75rem' }}>
          <div className="asset-hero-price">${priceFormatted}</div>
          <div className={`asset-hero-change ${isUp ? 'price-up' : 'price-down'}`}>{changeFormatted}</div>
        </div>
      </div>

      <div className="topbar-stats">
        <div className="topbar-stat">
          <span className="ts-label">{asset.type === 'stock' ? '24h Volume (Shares)' : '24h Volume'}</span>
          <span className="ts-value">{volDisplay}</span>
        </div>
        <div className="topbar-stat">
          <span className="ts-label">Alpha Signals</span>
          <span className="ts-value text-cyan">{opportunitiesCount} Active</span>
        </div>
        <div className="topbar-stat">
          <span className="ts-label">Agents Online</span>
          <span className="ts-value">{agentsRunning ? '4 / 4' : '0 / 4'}</span>
        </div>
        <div className="topbar-stat">
          <span className="ts-label">Market Mood</span>
          <span className="ts-value" style={{ color: overallMood.color }}>{overallMood.label}</span>
        </div>
        <div className="topbar-stat">
          <span className="ts-label">{activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset} Mood</span>
          <span className="ts-value" style={{ color: assetMood.color }}>
            {assetMood.emoji} {assetMood.label} {Math.round(assetMood.score)}%
          </span>
        </div>
        <div className="topbar-stat">
          <span className="ts-label">Fear &amp; Greed</span>
          <span className="ts-value" style={{ color: fgLabel.color }}>{fgLabel.label}</span>
        </div>
      </div>

      <div className="topbar-right">
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: dsInfo.color }}>
          {dsInfo.text}
        </span>
        <div className="vr"></div>
        <div className="live-badge">
          <div style={{
            width: '6px',
            height: '6px',
            background: 'var(--emerald)',
            borderRadius: '50%',
            boxShadow: '0 0 6px var(--emerald)',
            animation: 'pulse 1.5s infinite alternate'
          }}></div>
          LIVE
        </div>
        <div className="icon-btn" onClick={onToggleAgents} title="Pause / Resume agents">
          {agentsRunning ? '⏸' : '▶'}
        </div>
        <div className="icon-btn" title="Telegram Alerts" onClick={onOpenTelegramModal}>
          ✈️
          {telegramEnabled && <div className="badge-dot" style={{ display: 'block' }}></div>}
        </div>
      </div>
    </header>
  );
}
