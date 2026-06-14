import React, { useRef, useEffect } from 'react';

const AGENT_METRICS = {
  aegis: {
    icon: 'Ω',
    name: 'Aegis — Technical',
    desc: 'SMA/EMA overlays, Bollinger Bands, RSI divergences, MACD crossovers',
    subTitle: 'Calc/sec',
    subVal: '12.4k',
    sigLabel: 'Signals',
    colorClass: 'cyan'
  },
  sentinel: {
    icon: '⛓',
    name: 'ChainSentinel — On-Chain',
    desc: 'DEX pool depth, whale flows, LP mints/burns, block liquidity monitoring',
    subTitle: 'Gas/blk',
    subVal: '4.2G',
    sigLabel: 'Signals',
    colorClass: 'emerald'
  },
  vox: {
    icon: '🎤',
    name: 'VoxPopulist — Sentiment',
    desc: 'Social NLP, X/Reddit/News scraping, fear & greed sentiment mapping',
    subTitle: 'Posts/min',
    subVal: '18.5k',
    sigLabel: 'Signals',
    colorClass: 'magenta'
  },
  predictor: {
    icon: '🔮',
    name: 'PredictorX — Forecast',
    desc: 'Synthesises signals across all agents to construct multi-timeframe forecasts',
    subTitle: 'Projections',
    subVal: '512',
    sigLabel: 'Signals',
    colorClass: 'amber'
  }
};

export default function AgentsPanel({
  activeAgent,
  onChangeAgent,
  agentsRunning,
  onToggleRunning,
  agentConfidences,
  agentSignalCounts,
  veritasMetrics,
  agentLogs,
  onClearTerminal
}) {
  const terminalBottomRef = useRef(null);

  // Auto-scroll terminal console to the bottom on new log additions
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs]);

  return (
    <div className="card accent-magenta card-glow-magenta" style={{ overflow: 'hidden' }}>
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--magenta-dim)', color: 'var(--magenta)' }}>🤖</div>
          AI Analytical Agents
        </div>
        <div className="card-actions">
          <button className="pill-btn active" onClick={onToggleRunning}>
            {agentsRunning ? 'Pause All' : 'Resume All'}
          </button>
        </div>
      </div>

      <div className="agents-list" id="agents-list">
        {/* Render Aegis, Sentinel, Vox, Predictor */}
        {Object.entries(AGENT_METRICS).map(([key, m]) => {
          const confidence = agentConfidences[key] || 75;
          const signals = agentSignalCounts[key] || 0;
          const isActive = activeAgent === key;

          return (
            <div
              key={key}
              className={`agent-card ${isActive ? 'active' : ''}`}
              onClick={() => onChangeAgent(key)}
            >
              <div className="ac-header">
                <div className="ac-meta">
                  <div className="ac-icon" style={{ background: `var(--${m.colorClass}-dim)`, color: `var(--${m.colorClass})` }}>
                    {m.icon}
                  </div>
                  <span className="ac-name">{m.name}</span>
                </div>
                <span className={`ac-status ${agentsRunning ? 'on' : 'off'}`}>
                  {agentsRunning ? '● Active' : '⏸ Paused'}
                </span>
              </div>
              <div className="ac-desc">{m.desc}</div>
              <div className="ac-metrics">
                <div className="ac-metric">
                  <span className="ac-metric-label">Confidence</span>
                  <span className={`ac-metric-value text-${m.colorClass}`}>{confidence}%</span>
                </div>
                <div className="ac-metric">
                  <span className="ac-metric-label">{m.subTitle}</span>
                  <span className="ac-metric-value">{m.subVal}</span>
                </div>
                <div className="ac-metric">
                  <span className="ac-metric-label">{m.sigLabel}</span>
                  <span className="ac-metric-value">{signals}</span>
                </div>
              </div>
              <div className="confidence-bar-wrap">
                <div className="confidence-bar-track">
                  <div
                    className="confidence-bar-fill"
                    style={{
                      width: `${confidence}%`,
                      background: `linear-gradient(90deg, var(--${m.colorClass}), var(--violet))`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Render Veritas Card (spans full width/grid columns) */}
        <div
          className={`agent-card ${activeAgent === 'veritas' ? 'active' : ''}`}
          onClick={() => onChangeAgent('veritas')}
          style={{ gridColumn: 'span 2' }}
        >
          <div className="ac-header">
            <div className="ac-meta">
              <div className="ac-icon" style={{ background: 'var(--violet-dim)', color: 'var(--violet)' }}>🛡️</div>
              <span className="ac-name">Veritas — Evaluator</span>
            </div>
            <span className={`ac-status ${agentsRunning ? 'on' : 'off'}`}>
              {agentsRunning ? '● Active' : '⏸ Paused'}
            </span>
          </div>
          <div className="ac-desc">
            Validates live signals, backtests Sharpe ratio, and evaluates trading strategy profit factors
          </div>
          <div className="ac-metrics">
            <div className="ac-metric">
              <span className="ac-metric-label">Win Rate</span>
              <span className="ac-metric-value" style={{ color: 'var(--violet)' }}>
                {veritasMetrics.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-label">Trades</span>
              <span className="ac-metric-value">{veritasMetrics.count}</span>
            </div>
            <div className="ac-metric">
              <span className="ac-metric-label">Sharpe</span>
              <span className="ac-metric-value">{veritasMetrics.sharpeRatio.toFixed(2)}</span>
            </div>
          </div>
          <div className="confidence-bar-wrap">
            <div className="confidence-bar-track">
              <div
                className="confidence-bar-fill"
                style={{
                  width: `${veritasMetrics.winRate}%`,
                  background: 'linear-gradient(90deg, var(--violet), var(--magenta))'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Wrap */}
      <div className="terminal-wrap">
        <div className="terminal-toolbar">
          <span className="terminal-name">
            Console · <span id="active-agent-label">{activeAgent}</span>
          </span>
          <div className="terminal-actions">
            <div className="terminal-dot td-red" onClick={onClearTerminal} title="Clear terminal screen" />
            <div className="terminal-dot td-amber" />
            <div className="terminal-dot td-green" onClick={onClearTerminal} title="Clear terminal screen" />
          </div>
        </div>
        <div className="terminal-screen" id="terminal-screen">
          {agentLogs.length === 0 ? (
            <div className="t-line">
              <span className="t-time">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <span className={`t-agent ${activeAgent}`}>{activeAgent.toUpperCase()}</span>
              <span className="t-msg">Screen cleared. Ready for log inputs...</span>
            </div>
          ) : (
            agentLogs.map((log, idx) => (
              <div className="t-line" key={idx}>
                <span className="t-time">[{log.time}]</span>
                <span className={`t-agent ${log.agent}`}>{log.agent.toUpperCase()}</span>
                <span className="t-msg">{log.msg}</span>
              </div>
            ))
          )}
          <div ref={terminalBottomRef} />
        </div>
      </div>
    </div>
  );
}
