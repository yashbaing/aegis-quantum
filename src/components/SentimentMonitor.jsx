import React from 'react';

export default function SentimentMonitor({
  sentimentIndex,
  activeAsset,
  assetMood,
  sentimentScores,
  newsFeed,
  syncTime
}) {
  const getOverallMood = (pct) => {
    if (pct > 60) return { label: `${pct}% Bullish`, color: 'var(--emerald)' };
    if (pct < 40) return { label: `${pct}% Bearish`, color: 'var(--red)' };
    return { label: `${pct}% Neutral`, color: 'var(--amber)' };
  };

  const overall = getOverallMood(sentimentIndex);

  return (
    <div className="card accent-magenta card-glow-magenta">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--magenta-dim)', color: 'var(--magenta)' }}>🗣️</div>
          Vox Sentiment Monitor
        </div>
        <div className="card-actions">
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Synced {syncTime || 'just now'}
          </span>
        </div>
      </div>
      
      <div className="sentiment-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '0.875rem', flex: 1, minHeight: 0 }}>
        <div className="s-gauges-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Overall Market Sentiment Gauge */}
          <div className="s-gauge-wrap">
            <div className="s-gauge-header">
              <span className="s-gauge-title">Overall Market Sentiment</span>
              <span className="s-gauge-value" style={{ color: overall.color }}>{overall.label}</span>
            </div>
            <div className="s-gauge-bar">
              <div className="s-gauge-needle" style={{ left: `${sentimentIndex}%` }} />
            </div>
            <div className="s-gauge-labels">
              <span style={{ color: 'var(--red)' }}>Extreme Fear</span>
              <span>Neutral</span>
              <span style={{ color: 'var(--emerald)' }}>Extreme Greed</span>
            </div>
          </div>

          {/* Active Asset Mood Gauge */}
          <div className="s-gauge-wrap">
            <div className="s-gauge-header">
              <span className="s-gauge-title">
                {activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset} Sentiment
              </span>
              <span className="s-gauge-value" style={{ color: assetMood.color }}>
                {assetMood.emoji} {assetMood.label} {Math.round(assetMood.score)}%
              </span>
            </div>
            <div className="s-gauge-bar">
              <div className="s-gauge-needle" style={{ left: `${assetMood.score}%` }} />
            </div>
            <div className="s-gauge-labels">
              <span style={{ color: 'var(--red)' }}>Extreme Fear</span>
              <span>Neutral</span>
              <span style={{ color: 'var(--emerald)' }}>Extreme Greed</span>
            </div>
          </div>
        </div>

        {/* Sources Grid */}
        <div className="s-sources-grid">
          <div className="s-source-card">
            <span className="s-source-name">X / Twitter</span>
            <span className={`s-source-score ${sentimentScores.twitter >= 0 ? 'price-up' : 'price-down'}`}>
              {(sentimentScores.twitter >= 0 ? '+' : '') + sentimentScores.twitter}
            </span>
            <span className={`s-source-change ${sentimentScores.twitter >= 0 ? 'price-up' : 'price-down'}`}>
              ▲ 3.2%
            </span>
          </div>
          
          <div className="s-source-card">
            <span className="s-source-name">Reddit</span>
            <span className={`s-source-score ${sentimentScores.reddit >= 0 ? 'price-up' : 'price-down'}`}>
              {(sentimentScores.reddit >= 0 ? '+' : '') + sentimentScores.reddit}
            </span>
            <span className={`s-source-change ${sentimentScores.reddit >= 0 ? 'price-up' : 'price-down'}`}>
              ▲ 1.5%
            </span>
          </div>

          <div className="s-source-card">
            <span className="s-source-name">News NLP</span>
            <span className={`s-source-score ${sentimentScores.news >= 0 ? 'price-up' : 'price-down'}`}>
              {(sentimentScores.news >= 0 ? '+' : '') + sentimentScores.news}
            </span>
            <span className={`s-source-change ${sentimentScores.news >= 0 ? 'price-up' : 'price-down'}`}>
              ▼ 5.8%
            </span>
          </div>

          <div className="s-source-card">
            <span className="s-source-name">On-Chain Flow</span>
            <span className={`s-source-score ${sentimentScores.chain >= 0 ? 'price-up' : 'price-down'}`}>
              {(sentimentScores.chain >= 0 ? '+' : '') + sentimentScores.chain}
            </span>
            <span className={`s-source-change ${sentimentScores.chain >= 0 ? 'price-up' : 'price-down'}`}>
              ▲ 2.1%
            </span>
          </div>
        </div>

        {/* Hot Keywords */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            Hot Keywords
          </div>
          <div className="s-keywords">
            <span className="s-kw pos">▲ #BTCETFFlows +8.4%</span>
            <span className="s-kw neg">▼ #LiquidationCrash -12.5%</span>
            <span className="s-kw pos">▲ #SOLPump +14.2%</span>
            <span className="s-kw pos">▲ #AIStocks +5.8%</span>
            <span className="s-kw neg">▼ #FundingSpike -5.8%</span>
          </div>
        </div>

        {/* Live News Signal Feed */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
            Live Signal Feed
          </div>
          <div className="news-feed" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {newsFeed.map((item, idx) => {
              const isBull = item.impact >= 0;
              return (
                <div className="news-item" key={idx}>
                  <div className="ni-header">
                    <span className="ni-source">{item.source}</span>
                    <span className="ni-time">{item.time}</span>
                  </div>
                  <div className="ni-text">{item.text}</div>
                  <div className="ni-impact" style={{ color: isBull ? 'var(--emerald)' : 'var(--red)' }}>
                    Sentiment: {isBull ? '+' : ''}{item.impact}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
