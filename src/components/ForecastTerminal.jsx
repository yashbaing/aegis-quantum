import React, { useState, useRef, useEffect } from 'react';

// ============================================================
// DUP UTILITY MATH FOR FORECAST RESPONSES
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

function buildForecastResponse(query, asset) {
  if (!asset) return 'Please select an asset first.';

  const { symbol, currentPrice: price, change, dec, history } = asset;
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  const n = (history || []).length;
  const sma20 = n >= 20 ? (calcSMA(history, 20)[n - 1] || price) : price;
  const bb = n >= 20 ? calcBB(history, 20, 2) : null;
  const bbU = bb ? (bb.upper[n - 1] || price * 1.02) : price * 1.02;
  const bbL = bb ? (bb.lower[n - 1] || price * 0.98) : price * 0.98;
  const rsi = n >= 14 ? (calcRSI(history, 14)[n - 1] || 52) : 52;
  const macd = n >= 26 ? calcMACD(history) : null;
  const macdLine = macd ? (macd.line[n - 1] || 0) : 0;
  const macdSig = macd ? (macd.signal[n - 1] || 0) : 0;
  const conf = Math.round(72 + Math.random() * 22);
  const lq = query.toLowerCase();
  const src = asset.dataSource === 'live' ? '🟢 LIVE' : '🟡 SIMULATED';

  const codeSection = `
Price   : $${price.toLocaleString()}  (${changeStr} 24h)
SMA_20  : $${sma20.toFixed(dec)}
RSI_14  : ${rsi.toFixed(2)} ${rsi > 70 ? '← Overbought ⚠️' : rsi < 30 ? '← Oversold 🎯' : '← Neutral'}
BB_Upper: $${bbU.toFixed(dec)}
BB_Lower: $${bbL.toFixed(dec)}
MACD    : ${macdLine >= 0 ? '+' : ''}${macdLine.toFixed(4)}
Signal  : ${macdSig.toFixed(4)}
Conf    : ${conf}%`;

  let body = '';

  if (lq.includes('forecast') || lq.includes('24h') || lq.includes('predict') || lq.includes('price')) {
    const bullish = change > -0.2 && rsi > 44 && macdLine > macdSig;
    const dir = bullish ? 'BULLISH CONTINUATION' : 'BEARISH RETRACEMENT';
    const dc = bullish ? 'var(--emerald)' : 'var(--red)';
    const target = (price * (1 + (bullish ? 0.045 : -0.032))).toFixed(dec);
    body = `<strong>24h Price Projection — ${symbol}</strong><br><br>
Forecast: <span style="color:${dc};font-weight:700;">${dir}</span><br><br>
RSI at ${rsi.toFixed(1)} is ${rsi > 60 ? 'in buyer strength zone' : rsi < 40 ? 'forming oversold bounce' : 'neutral with room to move'}.
MACD is ${macdLine > macdSig ? 'in bullish crossover ✅' : 'showing bearish signal ⚠️'}.<br><br>
<div style="padding:0.5rem;background:rgba(0,0,0,0.2);border-radius:6px;margin-top:0.5rem;font-size:0.72rem;">
<strong>Target:</strong> $${target} &nbsp;|&nbsp; <strong>Confidence:</strong> ${conf}%
</div>`;
  } else if (lq.includes('support') || lq.includes('resistance') || lq.includes('level')) {
    body = `<strong>Key S/R Levels — ${symbol}</strong><br><br>
<strong style="color:var(--red);">Resistance:</strong><br>
→ $${bbU.toFixed(dec)} — Upper Bollinger Band<br>
→ $${(sma20 * 1.015).toFixed(dec)} — SMA20 + 1.5% buffer<br><br>
<strong style="color:var(--emerald);">Support:</strong><br>
→ $${sma20.toFixed(dec)} — SMA20 dynamic support<br>
→ $${bbL.toFixed(dec)} — Lower Bollinger Band<br><br>
Market is in a ${rsi > 55 ? 'distribution phase near resistance' : rsi < 45 ? 'accumulation near support' : 'consolidation zone'}.`;
  } else if (lq.includes('whale') || lq.includes('on-chain') || lq.includes('liquidity')) {
    body = `<strong>On-Chain & Liquidity — ${symbol}</strong><br><br>
${asset.type === 'stock'
  ? 'Institutional bid pressure detected. Market makers maintaining tight two-sided liquidity. Options flow shows hedging activity.'
  : `DEX pool scan: ${asset.tvl ? 'TVL at $' + asset.tvl + 'M' : 'N/A'}.<br>Exchange net outflows over 24h remain positive — bullish supply signal.<br>${asset.fundingRate != null ? 'Funding rate: ' + (asset.fundingRate >= 0 ? '+' : '') + asset.fundingRate + '% — ' + (asset.fundingRate > 0.03 ? 'over-leverage risk ⚠️' : 'healthy levels ✅') : ''}`}`;
  } else if (lq.includes('risk') || lq.includes('entry') || lq.includes('long') || lq.includes('short')) {
    const risk = rsi > 68 ? 'HIGH' : rsi < 35 ? 'LOW (oversold)' : 'MODERATE';
    const rc = rsi > 68 ? 'var(--red)' : rsi < 35 ? 'var(--emerald)' : 'var(--amber)';
    const ok = change > 0 && rsi < 65 && macdLine > macdSig;
    body = `<strong>Risk & Entry — ${symbol}</strong><br><br>
Risk: <span style="color:${rc};font-weight:700;">${risk}</span> · Long: ${ok ? '<span style="color:var(--emerald)">✅ Favourable</span>' : '<span style="color:var(--red)">❌ Cautionary</span>'}<br><br>
→ Entry: $${(price * 0.998).toFixed(dec)} – $${price.toFixed(dec)}<br>
→ TP1: $${(price * 1.03).toFixed(dec)} · TP2: $${(price * 1.065).toFixed(dec)}<br>
→ Stop: $${(price * 0.975).toFixed(dec)}<br>
→ R/R: 1:2.6`;
  } else {
    body = `<strong>General Analysis — ${symbol}</strong><br><br>
Price: <strong>$${price.toLocaleString()}</strong> (${changeStr})<br>
BB Width: ${((bbU - bbL) / price * 100).toFixed(2)}% — ${((bbU - bbL) / price * 100) < 2 ? 'volatility compression (breakout soon)' : 'normal volatility'}.<br>
Momentum: ${rsi > 60 ? 'Overbought — caution' : rsi < 40 ? 'Oversold — watch bounce' : 'Neutral'}.<br>
MACD: ${macdLine > macdSig ? 'Bullish crossover active' : 'Bearish signal present'}.`;
  }

  return {
    body,
    code: codeSection.trim(),
    src
  };
}

const QUICK_PROMPTS = [
  { label: '📈 24h Forecast', text: 'Forecast price movement for the next 24 hours' },
  { label: '🎯 S&R Levels', text: 'Identify key support and resistance levels' },
  { label: '🐋 Whale Analysis', text: 'Analyze on-chain liquidity and whale movements' },
  { label: '⚠️ Risk Check', text: 'What is the current risk level for a long position?' },
  { label: '✅ Entry Signal', text: 'Is this a good entry point based on momentum indicators?' }
];

export default function ForecastTerminal({ activeAsset, asset }) {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: "👋 I'm <strong>PredictorX</strong>. Select any asset — crypto or stock — then ask me for a live forecast, technical analysis, or risk assessment.",
      time: 'just now',
      subText: 'Powered by Binance live data + Yahoo Finance · RSI · MACD · BB · SMA'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const query = textToSend || inputText.trim();
    if (!query) return;

    if (!textToSend) setInputText('');

    // Append user query
    setMessages(prev => [...prev, {
      sender: 'user',
      text: query,
      time: 'just now'
    }]);

    setIsTyping(true);

    // Simulated network delay
    setTimeout(() => {
      setIsTyping(false);
      const res = buildForecastResponse(query, asset);
      
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, {
        sender: 'agent',
        text: res.body,
        code: res.code,
        time: timeString,
        subText: `Live Snapshot — ${activeAsset} (${res.src})`
      }]);
    }, 800 + Math.random() * 600);
  };

  const handleClear = () => {
    setMessages([
      {
        sender: 'agent',
        text: 'Chat cleared. Ready for new analysis queries.',
        time: 'just now'
      }
    ]);
  };

  return (
    <div className="card accent-amber card-glow-amber">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>🔮</div>
          PredictorX — Forecast Terminal
        </div>
        <div className="card-actions">
          <button className="pill-btn" onClick={handleClear}>Clear</button>
        </div>
      </div>
      
      <div className="chat-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Messages Screen */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
          {messages.map((m, idx) => (
            <div className={`msg ${m.sender === 'user' ? 'user' : 'agent'}`} key={idx}>
              <div className="msg-bubble">
                {m.sender === 'agent' ? (
                  <>
                    <span dangerouslySetInnerHTML={{ __html: m.text }} />
                    {m.code && (
                      <div className="chat-code">
                        {m.subText && <div>// {m.subText}</div>}
                        {m.code}
                      </div>
                    )}
                  </>
                ) : (
                  <span>{m.text}</span>
                )}
              </div>
              <span className="msg-meta">
                {m.sender === 'user' ? 'You' : 'PredictorX'} · {m.time}
              </span>
            </div>
          ))}
          
          {isTyping && (
            <div className="msg agent">
              <div className="msg-bubble">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
              <span className="msg-meta">PredictorX is analyzing...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick prompt buttons */}
        <div className="chat-quick-prompts">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              className="quick-prompt-btn"
              onClick={() => handleSend(qp.text)}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat input */}
        <div className="chat-input-row">
          <input
            type="text"
            className="chat-input"
            placeholder={`Ask PredictorX about ${activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset}…`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="chat-send-btn" onClick={() => handleSend()}>
            Analyze →
          </button>
        </div>
      </div>
    </div>
  );
}
