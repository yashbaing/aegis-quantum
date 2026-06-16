import React, { useState } from 'react';

const ASSET_METADATA = {
  'BTC-PERP': { icon: '₿', sub: 'Perpetual · dYdX', bg: 'rgba(247,147,26,0.15)', color: '#f7931a' },
  'ETH-PERP': { icon: 'Ξ', sub: 'Perpetual · Hyperliquid', bg: 'rgba(98,126,234,0.15)', color: '#627eea' },
  'SOL-PERP': { icon: '◎', sub: 'Perpetual · Drift', bg: 'rgba(0,255,163,0.12)', color: '#00ffa3' },
  'USDC/WETH': { icon: '🦄', sub: 'WETH/USDC · Uniswap v3', bg: 'rgba(255,0,122,0.12)', color: '#ff007a' },
  'SOL/USDC': { icon: '⚡', sub: 'SOL/USDC · Raydium CLMM', bg: 'rgba(0,255,163,0.12)', color: '#00ffa3' },
  'BTC/USD': { icon: '₿', sub: 'BTC/USD · Coinbase Spot', bg: 'rgba(0,82,255,0.12)', color: '#0052ff' },
  'ETH/USDT': { icon: 'Ξ', sub: 'ETH/USDT · Binance Spot', bg: 'rgba(243,186,47,0.12)', color: '#f3ba2f' },
  'AAPL': { icon: '🍎', sub: 'Apple · Nasdaq', bg: 'rgba(134,134,134,0.15)', color: '#aaa' },
  'MSFT': { icon: 'M', sub: 'Microsoft · Nasdaq', bg: 'rgba(0,164,239,0.12)', color: '#00a4ef' },
  'NVDA': { icon: 'N', sub: 'Nvidia · Nasdaq', bg: 'rgba(118,185,0,0.12)', color: '#76b900' },
  'TSLA': { icon: 'T', sub: 'Tesla · Nasdaq', bg: 'rgba(227,25,55,0.12)', color: '#e31937' },
  'META': { icon: 'f', sub: 'Meta · Nasdaq', bg: 'rgba(0,130,251,0.12)', color: '#0082fb' },
  'GOOGL': { icon: 'G', sub: 'Alphabet · Nasdaq', bg: 'rgba(66,133,244,0.12)', color: '#4285f4' },
  'AMZN': { icon: 'A', sub: 'Amazon · Nasdaq', bg: 'rgba(255,153,0,0.12)', color: '#ff9900' },
  'AMD': { icon: 'A', sub: 'AMD · Nasdaq', bg: 'rgba(237,28,36,0.12)', color: '#ed1c24' },
  'COIN': { icon: 'C', sub: 'Coinbase · Nasdaq', bg: 'rgba(0,82,255,0.12)', color: '#0052ff' },
};

const GROUPS = [
  { label: 'Perpetual Markets', type: 'perp', symbols: ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'] },
  { label: 'DEX Pools', type: 'dex', symbols: ['USDC/WETH', 'SOL/USDC'] },
  { label: 'CEX Spot', type: 'cex', symbols: ['BTC/USD', 'ETH/USDT'] },
  { label: 'US Equities', type: 'stock', symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN', 'AMD', 'COIN'] }
];

export default function Sidebar({
  activeAsset,
  onSelectAsset,
  assets,
  telegramEnabled,
  onOpenTelegramModal,
  activeView,
  onChangeView
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-orb">Ω</div>
        <div className="logo-copy">
          <span className="logo-name">Aegis Quantum</span>
          <span className="logo-tagline">AI Market Intelligence · v3.0</span>
        </div>
      </div>

      <div className="sidebar-menu">
        <div
          className={`menu-item ${activeView === 'desk' ? 'active' : ''}`}
          onClick={() => onChangeView('desk')}
        >
          <span>🖥️</span> Trade Desk
        </div>
        <div
          className={`menu-item ${activeView === 'portfolio' ? 'active' : ''}`}
          onClick={() => onChangeView('portfolio')}
        >
          <span>📊</span> Portfolio Analytics
        </div>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search assets…"
          autoComplete="off"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <nav className="sidebar-nav">
        {GROUPS.map((group) => {
          // Filter symbols in this group based on search query
          const filteredSymbols = group.symbols.filter(sym =>
            sym.toLowerCase().includes(searchQuery)
          );

          if (filteredSymbols.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              <ul className="asset-list">
                {filteredSymbols.map((sym) => {
                  const asset = assets[sym];
                  const meta = ASSET_METADATA[sym] || { icon: '?', sub: '', bg: 'rgba(255,255,255,0.1)', color: '#fff' };
                  if (!asset) return null;

                  const isUp = asset.change >= 0;
                  const priceFormatted = asset.currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: asset.dec,
                    maximumFractionDigits: asset.dec
                  });
                  const changeFormatted = (isUp ? '+' : '') + asset.change.toFixed(2) + '%';

                  return (
                    <li
                      key={sym}
                      className={`asset-item ${activeAsset === sym ? 'active' : ''}`}
                      onClick={() => onSelectAsset(sym, group.type)}
                    >
                      <div className="asset-left">
                        <div
                          className="asset-icon"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.icon}
                        </div>
                        <div className="asset-details">
                          <span className="asset-symbol">
                            {sym === 'USDC/WETH' ? 'WETH/USDC' : sym}
                          </span>
                          <span className="asset-sub">{meta.sub}</span>
                        </div>
                      </div>
                      <div className="asset-right">
                        <span className={`asset-price-val ${isUp ? 'price-up' : 'price-down'}`}>
                          ${priceFormatted}
                        </span>
                        <span className={`asset-change ${isUp ? 'price-up' : 'price-down'}`}>
                          {changeFormatted}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div
          className={`tg-status-pill ${telegramEnabled ? 'on' : 'off'}`}
          onClick={onOpenTelegramModal}
        >
          <span>✈️</span>
          <span>{telegramEnabled ? '✅ Telegram On' : 'Telegram Off'}</span>
        </div>
        <div className="icon-btn" title="Settings" onClick={onOpenTelegramModal}>
          ⚙
        </div>
      </div>
    </aside>
  );
}
