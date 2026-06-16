import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ChartSection from './components/ChartSection';
import AgentsPanel from './components/AgentsPanel';
import Orderbook from './components/Orderbook';
import OpportunityTerminal from './components/OpportunityTerminal';
import SentimentMonitor from './components/SentimentMonitor';
import ForecastTerminal from './components/ForecastTerminal';
import StockScreener from './components/StockScreener';
import TelegramModal from './components/TelegramModal';
import {
  initDB,
  getSignals,
  saveSignal,
  getActiveTrades,
  addActiveTrade,
  deleteActiveTrade,
  getClosedTrades,
  addClosedTrade,
  getSetting,
  saveSetting
} from './utils/db';

// ============================================================
// CONSTANTS & MAPS
// ============================================================
const BINANCE_SYMBOL_MAP = {
  BTCUSDT: ['BTC-PERP', 'BTC/USD'],
  ETHUSDT: ['ETH-PERP', 'ETH/USDT', 'USDC/WETH'],
  SOLUSDT: ['SOL-PERP', 'SOL/USDC'],
};

const ASSET_TO_BINANCE = {
  'BTC-PERP': 'BTCUSDT', 'BTC/USD': 'BTCUSDT',
  'ETH-PERP': 'ETHUSDT', 'ETH/USDT': 'ETHUSDT', 'USDC/WETH': 'ETHUSDT',
  'SOL-PERP': 'SOLUSDT', 'SOL/USDC': 'SOLUSDT',
};

const YAHOO_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN', 'NFLX', 'AMD', 'COIN',
  'SPY', 'QQQ', '^VIX', '^DJI', '^IXIC'
];

const YAHOO_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

const INITIAL_ASSETS = {
  // Perpetuals
  'BTC-PERP': { symbol: 'BTC-PERP', display: '₿', type: 'perp', basePrice: 68000, currentPrice: 68245, change: 1.25, fundingRate: 0.0150, oi: 482.4, liq: 12.4, lsRatio: [58, 42], dec: 2, history: [], dataSource: 'simulated' },
  'ETH-PERP': { symbol: 'ETH-PERP', display: 'Ξ', type: 'perp', basePrice: 3800, currentPrice: 3782, change: -0.85, fundingRate: 0.0085, oi: 215.1, liq: 4.8, lsRatio: [52, 48], dec: 2, history: [], dataSource: 'simulated' },
  'SOL-PERP': { symbol: 'SOL-PERP', display: '◎', type: 'perp', basePrice: 175, currentPrice: 178, change: 3.42, fundingRate: 0.0450, oi: 84.15, liq: 1.9, lsRatio: [64, 36], dec: 2, history: [], dataSource: 'simulated' },
  // DEX
  'USDC/WETH': { symbol: 'USDC/WETH', display: '🦄', type: 'dex', basePrice: 3800, currentPrice: 3785, change: -0.78, tvl: 45.2, vol24h: 18.4, dex: 'Uniswap v3', dec: 2, history: [], dataSource: 'simulated' },
  'SOL/USDC': { symbol: 'SOL/USDC', display: '⚡', type: 'dex', basePrice: 175, currentPrice: 178, change: 3.45, tvl: 12.8, vol24h: 5.1, dex: 'Raydium', dec: 2, history: [], dataSource: 'simulated' },
  // CEX
  'BTC/USD': { symbol: 'BTC/USD', display: '₿', type: 'cex', basePrice: 68000, currentPrice: 68235, change: 1.22, exchange: 'Coinbase', spread: 0.50, vol24h: 124.5, dec: 2, history: [], dataSource: 'simulated' },
  'ETH/USDT': { symbol: 'ETH/USDT', display: 'Ξ', type: 'cex', basePrice: 3800, currentPrice: 3781, change: -0.88, exchange: 'Binance', spread: 0.10, vol24h: 215.8, dec: 2, history: [], dataSource: 'simulated' },
  // Stocks
  'AAPL': { symbol: 'AAPL', display: '🍎', type: 'stock', basePrice: 196, currentPrice: 196.75, change: -0.63, marketCap: 3010, vol24h: 52.8, dec: 2, history: [], dataSource: 'simulated' },
  'MSFT': { symbol: 'MSFT', display: 'M', type: 'stock', basePrice: 420, currentPrice: 420.50, change: 0.48, marketCap: 3120, vol24h: 18.2, dec: 2, history: [], dataSource: 'simulated' },
  'NVDA': { symbol: 'NVDA', display: 'N', type: 'stock', basePrice: 1100, currentPrice: 1120.50, change: 4.12, marketCap: 2750, vol24h: 142.4, dec: 2, history: [], dataSource: 'simulated' },
  'TSLA': { symbol: 'TSLA', display: 'T', type: 'stock', basePrice: 182, currentPrice: 184.20, change: 1.48, marketCap: 588, vol24h: 88.5, dec: 2, history: [], dataSource: 'simulated' },
  'META': { symbol: 'META', display: 'f', type: 'stock', basePrice: 508, currentPrice: 510.30, change: 1.18, marketCap: 1300, vol24h: 12.4, dec: 2, history: [], dataSource: 'simulated' },
  'GOOGL': { symbol: 'GOOGL', display: 'G', type: 'stock', basePrice: 177, currentPrice: 178.40, change: 0.82, marketCap: 2200, vol24h: 22.1, dec: 2, history: [], dataSource: 'simulated' },
  'AMZN': { symbol: 'AMZN', display: 'A', type: 'stock', basePrice: 181, currentPrice: 182.80, change: 1.55, marketCap: 1900, vol24h: 28.4, dec: 2, history: [], dataSource: 'simulated' },
  'NFLX': { symbol: 'NFLX', display: 'N', type: 'stock', basePrice: 678, currentPrice: 680.40, change: -0.42, marketCap: 290, vol24h: 4.2, dec: 2, history: [], dataSource: 'simulated' },
  'AMD': { symbol: 'AMD', display: 'A', type: 'stock', basePrice: 153, currentPrice: 155.20, change: 2.05, marketCap: 250, vol24h: 32.8, dec: 2, history: [], dataSource: 'simulated' },
  'COIN': { symbol: 'COIN', display: 'C', type: 'stock', basePrice: 238, currentPrice: 240.80, change: 3.52, marketCap: 62, vol24h: 8.4, dec: 2, history: [], dataSource: 'simulated' },
  // Indices
  'SPY': { symbol: 'SPY', display: 'S', type: 'index', basePrice: 534, currentPrice: 535.40, change: 0.42, name: 'S&P 500 ETF', dec: 2, history: [], dataSource: 'simulated' },
  'QQQ': { symbol: 'QQQ', display: 'Q', type: 'index', basePrice: 459, currentPrice: 460.80, change: 0.58, name: 'NASDAQ-100 ETF', dec: 2, history: [], dataSource: 'simulated' },
  '^DJI': { symbol: '^DJI', display: 'D', type: 'index', basePrice: 40000, currentPrice: 40250, change: 0.28, name: 'Dow Jones', dec: 0, history: [], dataSource: 'simulated' },
  '^VIX': { symbol: '^VIX', display: 'V', type: 'index', basePrice: 14, currentPrice: 14.5, change: -2.1, name: 'CBOE VIX', dec: 2, history: [], dataSource: 'simulated' },
};

const NEWS_TEMPLATES = [
  { text: 'Whale wallet moved 450 BTC to Coinbase. Potential distribution signal.', impact: -4, source: 'ChainSentinel' },
  { text: 'Fed signals rate cuts ahead of FOMC. Macro turns risk-on for risk assets.', impact: 7, source: 'VoxMedia' },
  { text: 'VC fund commits $2.5B to Web3 infrastructure across Solana and Ethereum.', impact: 5, source: 'VoxMedia' },
  { text: 'Funding rates spike — highest over-leverage since Q1 2024. Long squeeze risk.', impact: -4, source: 'ChainSentinel' },
  { text: 'RSI divergence on SOL-PERP 15m suggests local top near $185. Take-profit zone.', impact: -2, source: 'Aegis' },
  { text: 'Uniswap DAO votes to activate protocol fee switch. Heavy accumulation.', impact: 6, source: 'ChainSentinel' },
  { text: 'NVIDIA chip revenue forecast beats estimates by 28%. Tech rally incoming.', impact: 4, source: 'VoxMedia' },
  { text: 'MEV sandwich vulnerability drains $1.2M from DEX arbitrage pool.', impact: -5, source: 'ChainSentinel' },
  { text: 'MACD gold crossover confirmed on BTC daily. Historically bullish pattern.', impact: 5, source: 'Aegis' },
  { text: 'Liquidation cascade wipes $120M OI. Market de-leveraging in progress.', impact: -3, source: 'Aegis' },
  { text: 'SEC Commissioner comments positively on spot ETF framework. Market surges.', impact: 8, source: 'VoxMedia' },
  { text: 'Stablecoin supply grows $4.2B week-over-week — dry powder accumulating.', impact: 5, source: 'ChainSentinel' },
  { text: 'Twitter mentions of BTC up 22% in past hour. Retail FOMO signals emerging.', impact: 3, source: 'VoxPopulist' },
  { text: 'Open interest on BTC-PERP reaches ATH. Elevated risk of volatile liquidation.', impact: -3, source: 'Aegis' },
];

const REASONS_BUY = [
  'RSI (14) printed oversold reversal bounce at 15m support cluster.',
  'Bullish MACD crossover on 1H — buyer delta surging vs ask volume.',
  'Bollinger Band compression breakout to the upside. Momentum building.',
  'BB lower-band touch + RSI divergence → mean reversion signal.',
  'Order book shows deep bid stacking; spread compression detected.',
  'EMA 9 crossed above SMA 20. Golden cross pattern confirmed.',
];

const REASONS_SELL = [
  'RSI (14) overbought divergence near upper BB band. Distribution zone.',
  'MACD histogram flipped negative; declining buyer volume on orderbook.',
  'Massive whale sell wall appearing at resistance.',
  'Over-leveraged longs: funding spike creates liquidation cascade risk.',
  'BB upper-band rejection after three failed breakout candles.',
  'Open Interest at local ATH with declining price — bearish divergence.',
];

const AGENT_LOG_TEMPLATES = {
  aegis: [
    'EMA 9/21 crossover bullish signal detected on SOL-PERP 15m chart.',
    'RSI readings: BTC (61.2), ETH (48.4), SOL (68.5). No extremes.',
    'Bollinger Band squeeze on BTC-PERP — volatility breakout imminent.',
    'SMA20 acting as dynamic support for current uptrend. Trend intact.',
    'RSI bearish divergence spotted on ETH-PERP 1H — warning issued.',
    'MACD signal crossover confirmed on BTC daily chart. Bullish bias.',
    'Volume spike detected on recent green candle — strong accumulation.',
  ],
  sentinel: [
    'Whale swap: 0x8a92 converted 45 WETH → 170,120 USDC on Uniswap.',
    'USDC/WETH pool TVL expanded by $2.1M in last 30 minutes.',
    'Average Ethereum gas: 11 Gwei. Arbitrage windows highly efficient.',
    'MEV bot extracted 1.4 ETH in sandwich profit in block #19521002.',
    'LP added $450k to SOL/USDC concentrated liquidity pool on Raydium.',
    'Stablecoin bridge: $15M USDC transferred from Ethereum to Solana.',
    'Exchange net outflow BTC: +$82M today. Bullish supply signal.',
  ],
  vox: [
    'Twitter volume #Bitcoin +14.5% in 60 minutes. Retail FOMO detected.',
    'Scanned 14 major news articles: 10 bullish, 3 neutral, 1 bearish.',
    'Reddit r/CryptoCurrency: 8.2k comments on funding rates topic.',
    'Extreme positive posts surge post-NVDA earnings. Spillover to crypto.',
    'FUD analysis: exchange outage rumors disproven. Market calming.',
    'SEC ETF commentary: neutral-positive. Institutional confidence high.',
    'Fear & Greed index moved from 62 → 65 in past 30 minutes.',
  ],
  predictor: [
    'Aggregating all 3 agent signals. Building consensus forecast matrix.',
    'SOL 24h probability range: [$172.50, $186.20] — 78% confidence.',
    'Consensus: 3/4 agent signals bullish. Combined conviction: 82.5%.',
    'BTC 4h directional forecast: UP — probability 74%. Monitoring.',
    'Triggering BUY alpha for NVDA: BB squeeze + positive sentiment.',
    'Multi-asset correlation: BTC leading ETH by ~15min lag currently.',
    'Recalibrating Monte Carlo simulation with latest on-chain data.',
  ],
  veritas: [
    'Evaluating historical signal accuracy for BTC-PERP strategy overlays.',
    'Calculating rolling Sharpe Ratio. Current confidence score: 84.6%.',
    'Running volatility-adjusted drawdown stress tests on Perp markets.',
    'Analyzing win-rate decay curve across equity and crypto sectors.',
    'Verifying risk-adjusted returns matrix. No variance deviation detected.',
    'Monte Carlo simulation running for 10,000 runs on local indicators.',
    'Validating predictive value of social sentiment features vs RSI rebounds.',
    'Calculating profit factor covariance on active asset signals.'
  ]
};

// ============================================================
// SIMULATED HISTORY BUILDER
// ============================================================
function buildSimulatedHistory(asset) {
  const n = 150;
  let price = asset.basePrice;
  const now = Date.now();
  const history = [];
  for (let i = n; i >= 0; i--) {
    const drift = (Math.random() - 0.488) * 0.018;
    const open = price;
    const close = price * (1 + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.006);
    const low = Math.min(open, close) * (1 - Math.random() * 0.006);
    history.push({
      time: new Date(now - i * 15 * 60 * 1000),
      open: +open.toFixed(asset.dec),
      high: +high.toFixed(asset.dec),
      low: +low.toFixed(asset.dec),
      close: +close.toFixed(asset.dec),
      vol: Math.round(40000 + Math.random() * 800000)
    });
    price = close;
  }
  return history;
}

// Indicator math for asset mood checks
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
    return { line: data.map(() => 0), signal: data.map(() => 0), hist: data.map(() => 0) };
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

const computeAssetMood = (asset) => {
  if (!asset || !asset.history || asset.history.length === 0) {
    return { score: 50, label: 'Neutral', emoji: '🟡', color: 'var(--amber)' };
  }
  
  const history = asset.history;
  const n = history.length;
  let score = 50; 
  
  if (n >= 14) {
    try {
      const rsiArr = calcRSI(history, 14);
      const lastRsi = rsiArr[rsiArr.length - 1];
      if (lastRsi != null) {
        score += (lastRsi - 50) * 0.4;
      }
    } catch(e) {}
  }
  
  if (n >= 26) {
    try {
      const macd = calcMACD(history);
      if (macd && macd.line && macd.signal) {
        const macdLine = macd.line[macd.line.length - 1] || 0;
        const signalLine = macd.signal[macd.signal.length - 1] || 0;
        const diff = macdLine - signalLine;
        const normDiff = (diff / asset.currentPrice) * 10000;
        score += Math.max(-10, Math.min(10, normDiff * 1.5));
      }
    } catch(e) {}
  }
  
  score += asset.change * 2.5;
  
  if (n >= 20) {
    try {
      const bb = calcBB(history);
      if (bb && bb.upper && bb.lower) {
        const upper = bb.upper[bb.upper.length - 1];
        const lower = bb.lower[bb.lower.length - 1];
        const lastClose = history[n - 1].close;
        if (upper != null && lower != null && upper !== lower) {
          const percent = (lastClose - lower) / (upper - lower);
          score += (percent - 0.5) * 20;
        }
      }
    } catch(e) {}
  }
  
  score = Math.max(10, Math.min(95, score));
  
  let label = 'Neutral';
  let emoji = '🟡';
  let color = 'var(--amber)';
  
  if (score >= 75) {
    label = 'Extreme Greed'; emoji = '🚀'; color = 'var(--emerald)';
  } else if (score >= 58) {
    label = 'Greed'; emoji = '🟢'; color = 'var(--emerald)';
  } else if (score >= 43) {
    label = 'Neutral'; emoji = '🟡'; color = 'var(--amber)';
  } else if (score >= 25) {
    label = 'Fear'; emoji = '🔴'; color = 'var(--red)';
  } else {
    label = 'Extreme Fear'; emoji = '⚠️'; color = 'var(--red)';
  }
  
  return { score, label, emoji, color };
};

export default function App() {
  // Global states
  const [activeAsset, setActiveAsset] = useState('BTC-PERP');
  const [activeAssetType, setActiveAssetType] = useState('perp');
  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [activeAgent, setActiveAgent] = useState('aegis');
  const [agentsRunning, setAgentsRunning] = useState(true);
  const [marketView, setMarketView] = useState('cex');
  const [oppFilter, setOppFilter] = useState('all');
  const [activeAlphaTab, setActiveAlphaTab] = useState('signals');
  const [activeVeritasSubTab, setActiveVeritasSubTab] = useState('stats');
  
  // Indicators overlay states
  const [indicators, setIndicators] = useState({ ma: true, bb: true, rsi: true, macd: true, vol: false });
  
  // live connection stats
  const [cryptoDataLive, setCryptoDataLive] = useState(false);
  const [stockDataLive, setStockDataLive] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockLoadingFailed, setStockLoadingFailed] = useState(false);

  // platform data logs
  const [opportunities, setOpportunities] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [dexTrades, setDexTrades] = useState([]);
  const [sentimentIndex, setSentimentIndex] = useState(78);
  const [fearGreed, setFearGreed] = useState(65);
  const [syncTime, setSyncTime] = useState('just now');
  const [etClock, setEtClock] = useState('🕐 00:00:00 ET');
  
  // Toasts
  const [toasts, setToasts] = useState([]);

  // Telegram Alert Modal State
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');

  // Individual Sentiment card scores
  const [sentimentScores, setSentimentScores] = useState({
    twitter: 74,
    reddit: 61,
    news: -12,
    chain: 43
  });

  // Assets State
  const [assets, setAssets] = useState({});

  // Agent State log arrays
  const [agentLogs, setAgentLogs] = useState({ aegis: [], sentinel: [], vox: [], predictor: [], veritas: [] });
  const [agentSignalCounts, setAgentSignalCounts] = useState({ aegis: 0, sentinel: 0, vox: 0, predictor: 0, veritas: 0 });
  const [agentConfidences, setAgentConfidences] = useState({ aegis: 84, sentinel: 79, vox: 72, predictor: 89 });

  // Veritas Evaluation State
  const [veritasMetrics, setVeritasMetrics] = useState({
    activeTrades: [],
    closedTrades: [],
    capital: 10000,
    equityHistory: [0],
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    verdict: 'ACCUMULATING'
  });

  const [dbLoaded, setDbLoaded] = useState(false);

  const wsRef = useRef(null);
  const binanceRetries = useRef(0);
  // Refs for real-time trade evaluation (avoids stale closures in WS/timer callbacks)
  const activeTradesRef = useRef([]);
  const latestPricesRef = useRef({});

  const showToast = ({ type = 'info', icon = 'ℹ️', title, msg }) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, icon, title, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Helper: check market status
  const getMarketStatusInfo = () => {
    const now = new Date();
    const etParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short'
    }).formatToParts(now);

    const getVal = t => etParts.find(p => p.type === t)?.value;
    const weekday = getVal('weekday');
    const hour = parseInt(getVal('hour'));
    const minute = parseInt(getVal('minute'));
    const totalMins = (hour === 24 ? 0 : hour) * 60 + minute;

    if (weekday === 'Sat' || weekday === 'Sun') {
      return { status: 'closed', label: 'Weekend', color: 'var(--red)', detail: `Opens Mon 9:30 AM ET` };
    }

    const etStr = `${String(hour === 24 ? 0 : hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ET`;

    // Pre-market 4:00 AM – 9:30 AM (240 – 570)
    if (totalMins >= 240 && totalMins < 570) {
      return { status: 'pre-market', label: 'Pre-Market', color: 'var(--amber)', detail: `Regular opens in ${570 - totalMins}m` };
    }
    // Regular 9:30 AM – 4:00 PM (570 – 960)
    if (totalMins >= 570 && totalMins < 960) {
      return { status: 'open', label: 'Market Open', color: 'var(--emerald)', detail: `Closes in ${960 - totalMins}m` };
    }
    // After-hours 4:00 PM – 8:00 PM (960 – 1200)
    if (totalMins >= 960 && totalMins < 1200) {
      return { status: 'after-hours', label: 'After Hours', color: 'var(--violet)', detail: `Ends in ${1200 - totalMins}m` };
    }
    // Overnight closed
    return { status: 'closed', label: 'Market Closed', color: 'var(--red)', detail: 'Pre-market opens 4:00 AM ET' };
  };

  const marketStatusInfo = getMarketStatusInfo();

  // Send Telegram Alerts
  const sendTelegramAlert = (opp) => {
    if (localStorage.getItem('tg-enable') !== 'true') return;
    const token = localStorage.getItem('tg-bot-token');
    const chatId = localStorage.getItem('tg-chat-id');
    if (!token || !chatId) return;

    const emoji = opp.action === 'BUY' ? '🟢' : '🔴';
    const text = `${emoji} <b>Aegis Quantum Alpha Signal</b>\n\n`
      + `<b>Asset:</b> ${opp.asset}\n`
      + `<b>Signal:</b> ${opp.action}\n`
      + `<b>Target:</b> $${opp.target.toFixed(opp.dec)}\n`
      + `<b>Stop:</b> $${opp.stop.toFixed(opp.dec)}\n`
      + `<b>R/R:</b> 1:${opp.rr}\n`
      + `<b>Confidence:</b> ${opp.conf}%\n`
      + `<b>Reason:</b> ${opp.reason}\n\n`
      + `Cc: @yashbaing\n`
      + `<i>${new Date().toLocaleString()}</i>`;

    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    }).catch(e => console.error('Telegram send failed:', e));
  };

  // Seed initial logs on mount
  useEffect(() => {
    // 1. Initialize all assets with simulated history
    const initial = {};
    Object.entries(INITIAL_ASSETS).forEach(([k, asset]) => {
      initial[k] = {
        ...asset,
        history: buildSimulatedHistory(asset)
      };
    });
    setAssets(initial);

    // 2. Pre-fill agent console logs
    const seedLogs = {};
    Object.keys(AGENT_LOG_TEMPLATES).forEach(k => {
      const arr = [];
      for (let i = 0; i < 6; i++) {
        const ts = new Date(Date.now() - (6 - i) * 12000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        arr.push({
          time: ts,
          agent: k,
          msg: AGENT_LOG_TEMPLATES[k][Math.floor(Math.random() * AGENT_LOG_TEMPLATES[k].length)]
        });
      }
      seedLogs[k] = arr;
    });
    setAgentLogs(seedLogs);

    // 3. Pre-fill news feed
    const initialNews = [];
    for (let i = NEWS_TEMPLATES.length - 1; i >= 0; i--) {
      const t = NEWS_TEMPLATES[i];
      const ts = new Date(Date.now() - i * 90000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      initialNews.push({
        time: ts,
        source: t.source,
        text: t.text,
        impact: t.impact
      });
    }
    setNewsFeed(initialNews);

    // 4. Pre-fill DEX trades
    const initialDexTrades = [];
    const baseTime = Date.now();
    for (let i = 0; i < 18; i++) {
      const isBuy = Math.random() > 0.48;
      const ts = new Date(baseTime - (18 - i) * 3200).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const amount = Math.random() * 8.5;
      initialDexTrades.unshift({
        time: ts,
        type: isBuy ? 'BUY' : 'SELL',
        amount,
        price: 3782
      });
    }
    setDexTrades(initialDexTrades);

    // 5. NO historical seed — Veritas starts fresh with ZERO trades (pure live mode)
    const ts0 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAgentLogs(l => ({
      ...l,
      veritas: [{ time: ts0, agent: 'veritas', msg: '🟢 LIVE MODE: Veritas engine initialised. Monitoring real-time price ticks for signal resolution.' }]
    }));

    // 6. Check Telegram setup from localstorage
    setTelegramEnabled(localStorage.getItem('tg-enable') === 'true');
    setTgBotToken(localStorage.getItem('tg-bot-token') || '');
    setTgChatId(localStorage.getItem('tg-chat-id') || '');

    // 7. Initialize IndexedDB database and load persistent data
    initDB().then(() => {
      // Load Settings (capital)
      return getSetting('capital').then(cap => {
        if (cap !== null) {
          setVeritasMetrics(v => ({ ...v, capital: cap }));
        } else {
          saveSetting('capital', 10000);
        }
      }).then(() => {
        // Load Signals
        return getSignals().then(dbSignals => {
          if (dbSignals.length > 0) {
            setOpportunities(dbSignals.reverse());
          }
        });
      }).then(() => {
        // Load Active Trades
        return getActiveTrades().then(dbActive => {
          if (dbActive.length > 0) {
            setVeritasMetrics(v => ({ ...v, activeTrades: dbActive }));
            activeTradesRef.current = dbActive;
          }
        });
      }).then(() => {
        // Load Closed Trades
        return getClosedTrades().then(dbClosed => {
          if (dbClosed.length > 0) {
            setVeritasMetrics(v => {
              const wins = dbClosed.filter(t => t.status === 'WIN');
              const losses = dbClosed.filter(t => t.status === 'LOSS');
              const winRate = (wins.length / dbClosed.length) * 100;
              const grossProfit = wins.reduce((sum, t) => sum + t.pnl * 10000, 0);
              const grossLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnl) * 10000, 0);
              const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 9.99 : 0) : grossProfit / grossLoss;

              let balance = 10000;
              let peak = 10000;
              let maxDD = 0;
              const equityHistory = [0];
              dbClosed.forEach(t => {
                balance += 10000 * t.pnl;
                if (balance > peak) peak = balance;
                const dd = ((peak - balance) / peak) * 100;
                if (dd > maxDD) maxDD = dd;
                equityHistory.push(((balance - 10000) / 10000) * 100);
              });

              const returns = dbClosed.map(t => t.pnl);
              const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
              const variance = returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns.length;
              const stdDev = Math.sqrt(variance);
              const sharpeRatio = stdDev === 0 ? 0 : (meanRet / stdDev) * Math.sqrt(252 / 6);

              let verdict = 'ACCUMULATING';
              if (dbClosed.length >= 5) {
                if (winRate >= 54 && sharpeRatio >= 1.2 && profitFactor >= 1.4) verdict = 'APPROVED';
                else if (winRate < 46 || sharpeRatio < 0.7 || profitFactor < 1.05) verdict = 'REJECTED';
                else verdict = 'MONITORING';
              }

              return {
                ...v,
                closedTrades: dbClosed,
                capital: balance,
                equityHistory,
                winRate,
                profitFactor,
                maxDrawdown: maxDD,
                sharpeRatio,
                verdict
              };
            });
          }
        });
      }).then(() => {
        setDbLoaded(true);
      });
    }).catch(err => {
      console.error('Failed to load DB settings:', err);
      setDbLoaded(true);
    });
  }, []);

  // ============================================================
  // VERITAS REAL-TIME BACKTESTING ENGINE
  // ============================================================

  // Keep activeTradesRef always in sync with state
  useEffect(() => {
    activeTradesRef.current = veritasMetrics.activeTrades;
  }, [veritasMetrics.activeTrades]);

  // REMOVED: seedVeritasHistoricalTrades — engine is now 100% live

  // Veritas historical seed trades generator — KEPT FOR REFERENCE BUT NOT CALLED
  const seedVeritasHistoricalTrades = (currentAssets) => {
    const assetKeys = Object.keys(currentAssets).filter(k => ['perp', 'stock'].includes(currentAssets[k].type));
    const now = Date.now();
    let currentEquity = 10000;
    const equityPctHistory = [0];
    const historicalTrades = [];

    for (let i = 16; i > 0; i--) {
      const key = assetKeys[Math.floor(Math.random() * assetKeys.length)];
      const asset = currentAssets[key];
      if (!asset) continue;

      const isWin = Math.random() < 0.62; // 62% win rate
      const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const entry = asset.basePrice * (0.94 + Math.random() * 0.12);

      let target, stop, exitPrice, pnl;

      if (action === 'BUY') {
        target = entry * 1.06;
        stop = entry * 0.975;
        if (isWin) {
          exitPrice = target;
          pnl = (target - entry) / entry;
        } else {
          exitPrice = stop;
          pnl = (stop - entry) / entry;
        }
      } else {
        target = entry * 0.94;
        stop = entry * 1.025;
        if (isWin) {
          exitPrice = target;
          pnl = (entry - target) / entry;
        } else {
          exitPrice = stop;
          pnl = (entry - stop) / entry;
        }
      }

      const profitDollar = currentEquity * pnl;
      currentEquity += profitDollar;
      equityPctHistory.push(((currentEquity - 10000) / 10000) * 100);

      const tradeTime = new Date(now - i * 4 * 3600 * 1000);

      historicalTrades.push({
        id: `t_hist_${i}`,
        asset: asset.symbol,
        assetType: asset.type,
        action,
        entry: +entry.toFixed(asset.dec),
        target: +target.toFixed(asset.dec),
        stop: +stop.toFixed(asset.dec),
        exitPrice: +exitPrice.toFixed(asset.dec),
        status: isWin ? 'WIN' : 'LOSS',
        openTime: new Date(tradeTime - 2 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        closeTime: tradeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pnl,
        dec: asset.dec
      });
    }

    setVeritasMetrics(prev => {
      const nextClosed = [...historicalTrades];
      // Calculate initial metrics
      const wins = nextClosed.filter(t => t.status === 'WIN');
      const losses = nextClosed.filter(t => t.status === 'LOSS');
      
      const winRate = (wins.length / nextClosed.length) * 100;
      
      let grossProfit = wins.reduce((sum, t) => sum + t.pnl * 10000, 0);
      let grossLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnl) * 10000, 0);
      const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 9.99 : 0) : grossProfit / grossLoss;

      let balance = 10000;
      let peak = 10000;
      let maxDD = 0;

      nextClosed.forEach(t => {
        balance += 10000 * t.pnl;
        if (balance > peak) peak = balance;
        const dd = ((peak - balance) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      });

      const returns = nextClosed.map(t => t.pnl);
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev === 0 ? 0 : (meanReturn / stdDev) * Math.sqrt(252 / 6);

      let verdict = 'ACCUMULATING';
      if (nextClosed.length >= 10) {
        if (winRate >= 54 && sharpeRatio >= 1.2 && profitFactor >= 1.4) {
          verdict = 'APPROVED';
        } else if (winRate < 46 || sharpeRatio < 0.7 || profitFactor < 1.05) {
          verdict = 'REJECTED';
        } else {
          verdict = 'MONITORING';
        }
      }

      return {
        ...prev,
        closedTrades: nextClosed,
        capital: currentEquity,
        equityHistory: equityPctHistory,
        winRate,
        profitFactor,
        maxDrawdown: maxDD,
        sharpeRatio,
        verdict
      };
    });
  };

  // -------------------------------------------------------
  // VERITAS REAL-TIME EVALUATION — ref-based, stale-closure-safe
  // -------------------------------------------------------

  // Recalculate all Veritas performance metrics after a trade closes
  const runVeritasCalculations = (newClosedTrade) => {
    setVeritasMetrics(prev => {
      const nextClosed = [...prev.closedTrades, newClosedTrade];
      if (nextClosed.length > 100) nextClosed.shift();

      const wins = nextClosed.filter(t => t.status === 'WIN');
      const losses = nextClosed.filter(t => t.status === 'LOSS');
      const winRate = (wins.length / nextClosed.length) * 100;

      const grossProfit = wins.reduce((sum, t) => sum + t.pnl * 10000, 0);
      const grossLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnl) * 10000, 0);
      const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 9.99 : 0) : grossProfit / grossLoss;

      let balance = 10000;
      let peak = 10000;
      let maxDD = 0;
      const equityHistory = [0];
      nextClosed.forEach(t => {
        balance += 10000 * t.pnl;
        if (balance > peak) peak = balance;
        const dd = ((peak - balance) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
        equityHistory.push(((balance - 10000) / 10000) * 100);
      });

      const returns = nextClosed.map(t => t.pnl);
      const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev === 0 ? 0 : (meanRet / stdDev) * Math.sqrt(252 / 6);

      let verdict = 'ACCUMULATING';
      if (nextClosed.length >= 5) {
        if (winRate >= 54 && sharpeRatio >= 1.2 && profitFactor >= 1.4) verdict = 'APPROVED';
        else if (winRate < 46 || sharpeRatio < 0.7 || profitFactor < 1.05) verdict = 'REJECTED';
        else verdict = 'MONITORING';
      }

      saveSetting('capital', balance);

      return {
        ...prev,
        closedTrades: nextClosed,
        capital: balance,
        equityHistory,
        winRate,
        profitFactor,
        maxDrawdown: maxDD,
        sharpeRatio,
        verdict
      };
    });
  };

  // Core real-time evaluator — SAFE: reads from ref, writes via setState
  const evalActiveTrades = (symbol, currentPrice) => {
    // Update the latest price in ref
    latestPricesRef.current[symbol] = currentPrice;

    const trades = activeTradesRef.current;
    if (!trades || trades.length === 0) return;

    const toClose = [];
    const toKeep = [];

    trades.forEach(trade => {
      if (trade.asset !== symbol) {
        toKeep.push(trade);
        return;
      }

      let resolved = false;
      let outcome = '';
      let pnl = 0;

      if (trade.action === 'BUY') {
        if (currentPrice >= trade.target) {
          resolved = true; outcome = 'WIN';
          pnl = (trade.target - trade.entry) / trade.entry;
        } else if (currentPrice <= trade.stop) {
          resolved = true; outcome = 'LOSS';
          pnl = (trade.stop - trade.entry) / trade.entry;
        }
      } else {
        if (currentPrice <= trade.target) {
          resolved = true; outcome = 'WIN';
          pnl = (trade.entry - trade.target) / trade.entry;
        } else if (currentPrice >= trade.stop) {
          resolved = true; outcome = 'LOSS';
          pnl = (trade.entry - trade.stop) / trade.entry;
        }
      }

      if (resolved) {
        const closeTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        toClose.push({
          ...trade,
          status: outcome,
          exitPrice: outcome === 'WIN' ? trade.target : trade.stop,
          closeTime: closeTs,
          pnl
        });
      } else {
        toKeep.push(trade);
      }
    });

    if (toClose.length === 0) return;

    // Update the ref immediately so next tick doesn't re-evaluate same trades
    activeTradesRef.current = toKeep;

    // Flush closed trades into state
    toClose.forEach(closed => {
      deleteActiveTrade(closed.id);
      addClosedTrade(closed);

      const logMsg = `🎯 LIVE RESULT: ${closed.asset} (${closed.action}) ${closed.status === 'WIN' ? '✅ HIT TARGET' : '❌ STOPPED OUT'} @ $${closed.exitPrice.toLocaleString(undefined, { minimumFractionDigits: closed.dec })} | Entry: $${closed.entry.toLocaleString(undefined, { minimumFractionDigits: closed.dec })} | PnL: ${closed.pnl >= 0 ? '+' : ''}${(closed.pnl * 100).toFixed(2)}%`;
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setAgentLogs(l => {
        const next = [...l.veritas, { time: ts, agent: 'veritas', msg: logMsg }];
        if (next.length > 60) next.shift();
        return { ...l, veritas: next };
      });

      setAgentSignalCounts(c => ({ ...c, veritas: c.veritas + 1 }));

      showToast({
        type: closed.status === 'WIN' ? 'info' : 'warning',
        icon: closed.status === 'WIN' ? '✅' : '❌',
        title: `Veritas Live Result`,
        msg: `${closed.asset} ${closed.status === 'WIN' ? '🎯 Target hit' : '🛑 Stop hit'} · ${closed.pnl >= 0 ? '+' : ''}${(closed.pnl * 100).toFixed(2)}% ROI`
      });

      runVeritasCalculations(closed);
    });

    // Update activeTrades in state
    setVeritasMetrics(prev => ({ ...prev, activeTrades: toKeep }));
  };

  // ------------------------------------------------------------
  // LIVE DATA SYNC: BINANCE WEBSOCKET
  // ------------------------------------------------------------
  const connectBinanceWS = () => {
    const streams = Object.keys(BINANCE_SYMBOL_MAP)
      .map(s => s.toLowerCase() + '@ticker')
      .join('/');

    try {
      wsRef.current = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

      wsRef.current.onopen = () => {
        setCryptoDataLive(true);
        binanceRetries.current = 0;
        showToast({
          type: 'info',
          icon: '⚡',
          title: 'Binance Connected',
          msg: 'Real-time crypto prices active via WebSocket.'
        });
      };

      wsRef.current.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (!d.s) return;
          const binSym = d.s;
          const price = parseFloat(d.c);
          const changePct = parseFloat(d.P);

          const keys = BINANCE_SYMBOL_MAP[binSym] || [];
          // Evaluate trades BEFORE updating state (uses ref, no stale closure)
          keys.forEach(key => evalActiveTrades(key, price));

          setAssets(prev => {
            const updated = { ...prev };
            keys.forEach(key => {
              const asset = updated[key];
              if (!asset) return;

              const nextPrice = +price.toFixed(asset.dec);
              asset.currentPrice = nextPrice;
              asset.change = +changePct.toFixed(2);
              asset.dataSource = 'live';

              // Update candle history
              if (asset.history && asset.history.length) {
                const nextHistory = [...asset.history];
                const last = { ...nextHistory[nextHistory.length - 1] };
                last.close = nextPrice;
                if (nextPrice > last.high) last.high = nextPrice;
                if (nextPrice < last.low) last.low = nextPrice;
                nextHistory[nextHistory.length - 1] = last;
                asset.history = nextHistory;
              }
            });
            return updated;
          });
        } catch (err) { /* ignore parse errors */ }
      };

      wsRef.current.onerror = () => {
        setCryptoDataLive(false);
      };

      wsRef.current.onclose = () => {
        setCryptoDataLive(false);
        // Retry connection with exponential backoff
        if (binanceRetries.current < 8) {
          const delay = Math.min(30000, 2000 * Math.pow(2, binanceRetries.current));
          binanceRetries.current++;
          setTimeout(connectBinanceWS, delay);
        }
      };
    } catch (e) {
      console.warn('Binance WS init failed:', e.message);
    }
  };

  useEffect(() => {
    connectBinanceWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Fetch Binance Candlestick Klines data
  const fetchBinanceKlines = async (assetKey, tf = '15m') => {
    const binSym = ASSET_TO_BINANCE[assetKey];
    if (!binSym) return false;
    const intervalMap = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
    const interval = intervalMap[tf] || '15m';

    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=150`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Binance API error');
      const raw = await res.json();

      setAssets(prev => {
        const next = { ...prev };
        const asset = next[assetKey];
        if (!asset) return prev;

        asset.history = raw.map(k => ({
          time: new Date(k[0]),
          open: +parseFloat(k[1]).toFixed(asset.dec),
          high: +parseFloat(k[2]).toFixed(asset.dec),
          low: +parseFloat(k[3]).toFixed(asset.dec),
          close: +parseFloat(k[4]).toFixed(asset.dec),
          vol: +parseFloat(k[5]).toFixed(0),
        }));

        if (asset.history.length) {
          asset.currentPrice = asset.history[asset.history.length - 1].close;
          asset.dataSource = 'live';
        }
        return next;
      });
      return true;
    } catch (e) {
      console.warn('Binance klines failed for', assetKey, e.message);
      return false;
    }
  };

  // ------------------------------------------------------------
  // LIVE DATA SYNC: YAHOO FINANCE
  // ------------------------------------------------------------
  const fetchYahooURL = async (url) => {
    // 1) Direct fetch
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.quoteResponse?.result?.length || data?.chart?.result?.length) return data;
      }
    } catch (_) {}

    // 2) CORS Proxy fallbacks
    for (const proxy of YAHOO_PROXIES) {
      try {
        const proxyUrl = proxy + encodeURIComponent(url);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          if (data?.quoteResponse?.result?.length || data?.chart?.result?.length) return data;
        }
      } catch (_) {}
    }
    return null;
  };

  const fetchAllStockData = async () => {
    setStockLoading(true);
    setStockLoadingFailed(false);
    const symbols = YAHOO_SYMBOLS.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,preMarketPrice,postMarketPrice,preMarketChangePercent,postMarketChangePercent,marketState&formatted=false&lang=en-US&region=US`;

    const data = await fetchYahooURL(url);
    const quotes = data?.quoteResponse?.result || [];

    if (quotes.length) {
      setAssets(prev => {
        const next = { ...prev };
        quotes.forEach(q => {
          const sym = q.symbol;
          const asset = next[sym];
          if (asset) {
            // premkt/afterhours updates
            const status = marketStatusInfo.status;
            let price = q.regularMarketPrice;
            if (status === 'pre-market' && q.preMarketPrice) price = q.preMarketPrice;
            if (status === 'after-hours' && q.postMarketPrice) price = q.postMarketPrice;

            if (price && !isNaN(price)) {
              asset.currentPrice = +price.toFixed(asset.dec);
              asset.change = +(q.regularMarketChangePercent || 0).toFixed(2);
              asset.marketCap = q.marketCap ? +(q.marketCap / 1e9).toFixed(1) : asset.marketCap;
              asset.vol24h = q.regularMarketVolume ? +(q.regularMarketVolume / 1e6).toFixed(1) : asset.vol24h;
              asset.dayHigh = q.regularMarketDayHigh;
              asset.dayLow = q.regularMarketDayLow;
              asset.dayOpen = q.regularMarketOpen;
              asset.dataSource = 'live';

              // Evaluate trades using latest live price (ref-based, no closure issues)
              evalActiveTrades(sym, price);
            }
          }
        });
        return next;
      });
      setStockDataLive(true);
      setStockLoading(false);
    } else {
      console.warn('Yahoo Finance data fetch failed.');
      setStockLoading(false);
      setStockLoadingFailed(true);
    }
  };

  const fetchStockKlines = async (symbol, tf = '15m') => {
    const intervalMap = { '15m': '15m', '1h': '60m', '4h': '60m', '1d': '1d' };
    const rangeMap = { '15m': '5d', '1h': '30d', '4h': '30d', '1d': '1y' };
    const interval = intervalMap[tf] || '15m';
    const range = rangeMap[tf] || '5d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=true`;
    const result = await fetchYahooURL(url);

    if (!result) return false;

    try {
      const r = result.chart?.result?.[0];
      if (!r) return false;
      const ts = r.timestamp || [];
      const q = r.indicators?.quote?.[0] || {};

      setAssets(prev => {
        const next = { ...prev };
        const asset = next[symbol];
        if (!asset) return prev;

        const bars = ts.map((t, i) => ({
          time: new Date(t * 1000),
          open: q.open?.[i] || 0,
          high: q.high?.[i] || 0,
          low: q.low?.[i] || 0,
          close: q.close?.[i] || 0,
          vol: q.volume?.[i] || 0,
        })).filter(b => b.close > 0);

        if (bars.length > 5) {
          asset.history = bars;
          asset.dataSource = 'live';
        }
        return next;
      });
      return true;
    } catch (e) {
      console.warn('Stock klines parse error:', e.message);
    }
    return false;
  };

  // Periodically poll Stock quotes
  useEffect(() => {
    fetchAllStockData();
    const interval = setInterval(fetchAllStockData, 15000);
    return () => clearInterval(interval);
  }, []);

  // ------------------------------------------------------------
  // SIMULATED PRICE TICKS (CRYPTO ONLY - RUNS WHEN WS IS DOWN)
  // ------------------------------------------------------------
  useEffect(() => {
    const ticker = setInterval(() => {
      if (cryptoDataLive) return; // WS active, skip simulation

      setAssets(prev => {
        const next = { ...prev };
        const cryptoTypes = ['perp', 'dex', 'cex'];

        Object.values(next).forEach(asset => {
          if (!cryptoTypes.includes(asset.type)) return;

          const drift = (Math.random() - 0.49) * 0.0012;
          const nextPrice = +((asset.currentPrice * (1 + drift)).toFixed(asset.dec));
          asset.currentPrice = nextPrice;
          asset.change = +(asset.change + drift * 20).toFixed(2);

          if (asset.history && asset.history.length) {
            const nextHistory = [...asset.history];
            const last = { ...nextHistory[nextHistory.length - 1] };
            last.close = nextPrice;
            if (nextPrice > last.high) last.high = nextPrice;
            if (nextPrice < last.low) last.low = nextPrice;
            nextHistory[nextHistory.length - 1] = last;
            asset.history = nextHistory;
          }

          if (asset.type === 'perp') {
            asset.fundingRate = +(asset.fundingRate + (Math.random() - 0.5) * 0.0008).toFixed(4);
            asset.oi = +(asset.oi + (Math.random() - 0.49) * 1.2).toFixed(2);
          }

          // Evaluate trades — ref-based, safe outside setState
          evalActiveTrades(asset.symbol, nextPrice);
        });

        return next;
      });
    }, 900);

    return () => clearInterval(ticker);
  }, [cryptoDataLive]);

  // ------------------------------------------------------------
  // DYNAMIC FEED TICKERS & CLOCKS
  // ------------------------------------------------------------
  useEffect(() => {
    // 1. Clock timer
    const clock = setInterval(() => {
      const now = new Date();
      const etStr = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setEtClock(`🕐 ${etStr} ET`);
    }, 1000);

    // 2. DEX Swap Trade generator
    const dexSwap = setInterval(() => {
      setAssets(prev => {
        const asset = prev[activeAsset];
        if (!asset) return prev;

        setDexTrades(prevTrades => {
          const isBuy = Math.random() > 0.48;
          const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const amount = Math.random() * (activeAsset.includes('BTC') ? 3 : activeAsset.includes('SOL') ? 200 : 80);

          const nextTrades = [{
            time: ts,
            type: isBuy ? 'BUY' : 'SELL',
            amount,
            price: asset.currentPrice
          }, ...prevTrades];

          if (nextTrades.length > 40) nextTrades.pop();
          return nextTrades;
        });

        return prev;
      });
    }, 2200);

    // 3. Vox Sentiment monitor update ticks
    const voxTick = setInterval(() => {
      if (Math.random() < 0.22) {
        const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
        const isBull = tmpl.impact >= 0;
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setSentimentIndex(prev => Math.max(10, Math.min(92, prev + tmpl.impact)));
        setFearGreed(prev => Math.max(5, Math.min(95, prev + tmpl.impact * 0.4)));

        setNewsFeed(prevNews => {
          const next = [{
            time: ts,
            source: tmpl.source,
            text: tmpl.text,
            impact: tmpl.impact
          }, ...prevNews];
          if (next.length > 25) next.pop();
          return next;
        });

        setSyncTime(ts);

        // Update single source score randomly
        setSentimentScores(prev => {
          const keys = ['twitter', 'reddit', 'news', 'chain'];
          const picked = keys[Math.floor(Math.random() * keys.length)];
          const delta = (isBull ? 1 : -1) * Math.ceil(Math.random() * 3);
          return {
            ...prev,
            [picked]: prev[picked] + delta
          };
        });
      }
    }, 3800);

    // 4. Console logs feed updates
    const consoleTick = setInterval(() => {
      if (!agentsRunning) return;

      Object.keys(AGENT_LOG_TEMPLATES).forEach(k => {
        if (Math.random() < 0.28) {
          const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const msgs = AGENT_LOG_TEMPLATES[k];
          const logMsg = msgs[Math.floor(Math.random() * msgs.length)];

          setAgentLogs(l => {
            const nextLogs = [...l[k], { time: ts, agent: k, msg: logMsg }];
            if (nextLogs.length > 60) nextLogs.shift();
            return { ...l, [k]: nextLogs };
          });

          // Drift confidence slightly
          setAgentConfidences(c => {
            if (!c[k]) return c;
            const delta = Math.random() > 0.5 ? 1 : -1;
            return {
              ...c,
              [k]: Math.max(55, Math.min(97, c[k] + delta))
            };
          });
        }
      });
    }, 1600);

    return () => {
      clearInterval(clock);
      clearInterval(dexSwap);
      clearInterval(voxTick);
      clearInterval(consoleTick);
    };
  }, [activeAsset, agentsRunning]);

  // ------------------------------------------------------------
  // OPPORTUNITIES SIGNAL GENERATION
  // ------------------------------------------------------------
  const generateAlphaSignal = (customSymbol = null, forceAction = null, registerTrade = true) => {
    const isClosed = marketStatusInfo.status === 'closed';

    setAssets(prevAssets => {
      const cryptoKeys = Object.keys(prevAssets).filter(k => ['perp', 'dex', 'cex'].includes(prevAssets[k].type));
      const stockKeys = Object.keys(prevAssets).filter(k => ['stock'].includes(prevAssets[k].type));

      let eligibleKeys;
      if (customSymbol) {
        const asset = prevAssets[customSymbol];
        if (asset && ['stock', 'index'].includes(asset.type) && isClosed) {
          showToast({
            type: 'warning',
            icon: '🔴',
            title: 'Market Closed',
            msg: `Cannot generate ${customSymbol} signal — US market is closed.`
          });
          return prevAssets;
        }
        eligibleKeys = [customSymbol];
      } else {
        eligibleKeys = !isClosed ? [...cryptoKeys, ...stockKeys] : cryptoKeys;
      }

      if (!eligibleKeys.length) return prevAssets;

      const symbol = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
      const asset = prevAssets[symbol];
      if (!asset) return prevAssets;

      const isBuy = forceAction ? forceAction === 'BUY' : Math.random() > 0.42;
      const action = isBuy ? 'BUY' : 'SELL';
      const entry = asset.currentPrice;
      const target = isBuy ? entry * (1 + 0.065 + Math.random() * 0.04) : entry * (1 - 0.055 - Math.random() * 0.03);
      const stop = isBuy ? entry * (1 - 0.025 - Math.random() * 0.01) : entry * (1 + 0.025 + Math.random() * 0.01);
      const conf = Math.round(68 + Math.random() * 28);
      
      const reasons = isBuy ? REASONS_BUY : REASONS_SELL;
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      const rr = Math.abs(target - entry) / Math.abs(stop - entry);

      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const opp = {
        time: ts,
        asset: asset.symbol,
        action,
        entry,
        target,
        stop,
        conf,
        reason,
        rr: rr.toFixed(1),
        dec: asset.dec,
        assetType: asset.type
      };

      setOpportunities(o => {
        const next = [opp, ...o];
        if (next.length > 40) next.pop();
        return next;
      });
      saveSignal(opp);

      // Increment counters
      setAgentSignalCounts(c => {
        const nextCount = {
          ...c,
          aegis: c.aegis + 1
        };
        if (Math.random() > 0.5) nextCount.predictor = c.predictor + 1;
        return nextCount;
      });

      if (registerTrade) {
        // Register Veritas Active Trade
        const newTrade = {
          id: `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          asset: asset.symbol,
          assetType: asset.type,
          action,
          entry,
          target,
          stop,
          status: 'ACTIVE',
          openTime: ts,
          closeTime: null,
          exitPrice: null,
          pnl: 0,
          dec: asset.dec
        };

        addActiveTrade(newTrade);

        setVeritasMetrics(v => {
          // Log Veritas console registering trade
          const logMsg = `Registered new live signal for ${asset.symbol} (${action} @ $${entry.toLocaleString(undefined, { minimumFractionDigits: asset.dec })}). Evaluating performance...`;
          
          setAgentLogs(l => {
            const nextVeritasLogs = [...l.veritas, { time: ts, agent: 'veritas', msg: logMsg }];
            if (nextVeritasLogs.length > 60) nextVeritasLogs.shift();
            return { ...l, veritas: nextVeritasLogs };
          });

          setAgentSignalCounts(cnt => ({ ...cnt, veritas: cnt.veritas + 1 }));

          return {
            ...v,
            activeTrades: [...v.activeTrades, newTrade]
          };
        });
      }

      // Trigger Telegram Alert
      sendTelegramAlert(opp);

      // Trigger Toast notification
      showToast({
        type: isBuy ? 'alpha' : 'warning',
        icon: isBuy ? '🎯' : '⚠️',
        title: `${action} Signal — ${asset.symbol}`,
        msg: `${conf}% conf · Target $${target.toFixed(asset.dec)} · R/R 1:${rr.toFixed(1)}`
      });

      return prevAssets;
    });
  };

  const handlePlaceTrade = (symbol, action) => {
    const asset = assets[symbol];
    if (!asset) return;

    const entry = asset.currentPrice;
    const isBuy = action === 'BUY';
    const target = isBuy ? entry * (1 + 0.065 + Math.random() * 0.04) : entry * (1 - 0.055 - Math.random() * 0.03);
    const stop = isBuy ? entry * (1 - 0.025 - Math.random() * 0.01) : entry * (1 + 0.025 + Math.random() * 0.01);
    
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const newTrade = {
      id: `t_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      asset: symbol,
      assetType: asset.type,
      action,
      entry,
      target,
      stop,
      status: 'ACTIVE',
      openTime: ts,
      closeTime: null,
      exitPrice: null,
      pnl: 0,
      dec: asset.dec
    };

    addActiveTrade(newTrade);

    setVeritasMetrics(v => {
      const logMsg = `👤 MANUAL TRADE: Opened ${action} position for ${symbol} @ $${entry.toLocaleString(undefined, { minimumFractionDigits: asset.dec })}. Monitoring position...`;
      
      setAgentLogs(l => {
        const nextVeritasLogs = [...l.veritas, { time: ts, agent: 'veritas', msg: logMsg }];
        if (nextVeritasLogs.length > 60) nextVeritasLogs.shift();
        return { ...l, veritas: nextVeritasLogs };
      });

      setAgentSignalCounts(cnt => ({ ...cnt, veritas: cnt.veritas + 1 }));

      return {
        ...v,
        activeTrades: [...v.activeTrades, newTrade]
      };
    });

    showToast({
      type: isBuy ? 'alpha' : 'warning',
      icon: isBuy ? '🎯' : '⚠️',
      title: `Trade Placed: ${symbol}`,
      msg: `Position: ${action} @ $${entry.toLocaleString(undefined, { minimumFractionDigits: asset.dec })}`
    });
  };

  const handleClosePosition = (tradeId) => {
    const trades = veritasMetrics.activeTrades;
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    const asset = assets[trade.asset];
    const currentPrice = asset ? asset.currentPrice : trade.entry;
    const isBuy = trade.action === 'BUY';
    const pnl = isBuy ? (currentPrice - trade.entry) / trade.entry : (trade.entry - currentPrice) / trade.entry;

    const closeTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const closed = {
      ...trade,
      status: pnl >= 0 ? 'WIN' : 'LOSS',
      exitPrice: currentPrice,
      closeTime: closeTs,
      pnl
    };

    deleteActiveTrade(tradeId);
    addClosedTrade(closed);

    const toKeep = trades.filter(t => t.id !== tradeId);
    activeTradesRef.current = toKeep;

    const logMsg = `🎯 MANUAL CLOSE: ${closed.asset} (${closed.action}) closed manually @ $${closed.exitPrice.toLocaleString(undefined, { minimumFractionDigits: closed.dec })} | Entry: $${closed.entry.toLocaleString(undefined, { minimumFractionDigits: closed.dec })} | PnL: ${closed.pnl >= 0 ? '+' : ''}${(closed.pnl * 100).toFixed(2)}%`;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setAgentLogs(l => {
      const next = [...l.veritas, { time: ts, agent: 'veritas', msg: logMsg }];
      if (next.length > 60) next.shift();
      return { ...l, veritas: next };
    });

    setAgentSignalCounts(c => ({ ...c, veritas: c.veritas + 1 }));

    showToast({
      type: closed.status === 'WIN' ? 'info' : 'warning',
      icon: closed.status === 'WIN' ? '✅' : '❌',
      title: `Veritas Closed Position`,
      msg: `${closed.asset} closed manually · ${closed.pnl >= 0 ? '+' : ''}${(closed.pnl * 100).toFixed(2)}% ROI`
    });

    runVeritasCalculations(closed);
    setVeritasMetrics(prev => ({ ...prev, activeTrades: toKeep }));
  };

  // Seed initial opportunities once assets are populated and DB is loaded
  useEffect(() => {
    if (!dbLoaded || Object.keys(assets).length === 0) return;
    if (opportunities.length > 0) return;
    const cryptoSeeds = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'];
    for (let i = 0; i < 6; i++) {
      generateAlphaSignal(cryptoSeeds[i % cryptoSeeds.length], null, false);
    }
  }, [Object.keys(assets).length > 0, dbLoaded]);

  // Interval for signal generation — every 8s for faster real-time results
  useEffect(() => {
    const signalTimer = setInterval(() => {
      if (agentsRunning && Math.random() < 0.8) {
        generateAlphaSignal();
      }
    }, 8000);

    return () => clearInterval(signalTimer);
  }, [agentsRunning, marketStatusInfo.status]);

  // Dedicated real-time evaluation tick — checks all active trades every 2s
  // This ensures even simulated-price assets get checked frequently
  useEffect(() => {
    const evalTick = setInterval(() => {
      const trades = activeTradesRef.current;
      if (!trades || trades.length === 0) return;
      // Re-evaluate all active trades using latest known prices
      const prices = latestPricesRef.current;
      const symbols = [...new Set(trades.map(t => t.asset))];
      symbols.forEach(sym => {
        if (prices[sym] !== undefined) {
          evalActiveTrades(sym, prices[sym]);
        }
      });
    }, 2000);
    return () => clearInterval(evalTick);
  }, []);

  // ------------------------------------------------------------
  // ASSET NAVIGATION SELECTION
  // ------------------------------------------------------------
  const handleSelectAsset = (symbol, type) => {
    setActiveAsset(symbol);
    setActiveAssetType(type);

    const asset = assets[symbol];
    if (asset) {
      if (asset.type === 'dex') setMarketView('dex');
      else setMarketView('cex');

      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const logMsg = `Asset switched to ${symbol}. Fetching ${asset.dataSource === 'live' ? 'live' : 'simulated'} chart data.`;
      
      setAgentLogs(l => {
        const nextAegis = [...l.aegis, { time: ts, agent: 'aegis', msg: logMsg }];
        if (nextAegis.length > 60) nextAegis.shift();
        return { ...l, aegis: nextAegis };
      });
      
      // Fetch Live Charts Data
      const isCrypto = ['perp', 'dex', 'cex'].includes(asset.type);
      if (isCrypto) {
        fetchBinanceKlines(symbol, activeTimeframe);
      } else if (['stock', 'index'].includes(asset.type)) {
        fetchStockKlines(symbol, activeTimeframe);
      }
    }
  };

  const handleChangeTimeframe = (tf) => {
    setActiveTimeframe(tf);
    const asset = assets[activeAsset];
    if (asset) {
      const isCrypto = ['perp', 'dex', 'cex'].includes(asset.type);
      if (isCrypto) {
        fetchBinanceKlines(activeAsset, tf);
      } else {
        fetchStockKlines(activeAsset, tf);
      }
    }
  };

  const handleToggleIndicator = (ind) => {
    setIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));
  };

  // Toggle play/pause agents state
  const handleToggleRunning = () => {
    setAgentsRunning(r => {
      const next = !r;
      showToast({
        type: 'info',
        icon: next ? '▶️' : '⏸️',
        title: next ? 'Agents Resumed' : 'Agents Paused',
        msg: next ? 'All 4 AI agents are now active.' : 'All agents paused.'
      });
      return next;
    });
  };

  // ------------------------------------------------------------
  // LOCALSTORAGE CONFIGS SAVES
  // ------------------------------------------------------------
  const handleSaveTelegramConfig = (enabled, token, chat) => {
    setTelegramEnabled(enabled);
    setTgBotToken(token);
    setTgChatId(chat);
    showToast({
      type: 'info',
      icon: '✈️',
      title: 'Telegram Configured',
      msg: enabled ? '✅ Alerts active! Alpha signals will be sent to your Telegram.' : 'Alerts disabled.'
    });
  };

  // Switch Active Agent console terminal view
  const handleChangeAgent = (agentKey) => {
    setActiveAgent(agentKey);
    // Switch tabs automatically for Veritas selection
    if (agentKey === 'veritas') {
      setActiveAlphaTab('veritas');
    } else {
      setActiveAlphaTab('signals');
    }
  };

  const activeAssetObj = assets[activeAsset];
  const activeAssetMood = computeAssetMood(activeAssetObj);

  return (
    <div className="app-shell">
      {/* SIDEBAR PANEL */}
      <Sidebar
        activeAsset={activeAsset}
        onSelectAsset={handleSelectAsset}
        assets={assets}
        telegramEnabled={telegramEnabled}
        onOpenTelegramModal={() => setTgModalOpen(true)}
      />

      {/* TOPBAR PANEL */}
      <Topbar
        activeAsset={activeAsset}
        activeAssetType={activeAssetType}
        asset={activeAssetObj}
        opportunitiesCount={opportunities.length}
        agentsRunning={agentsRunning}
        sentimentIndex={sentimentIndex}
        fearGreed={fearGreed}
        stockDataLive={stockDataLive}
        cryptoDataLive={cryptoDataLive}
        assetMood={activeAssetMood}
        onToggleAgents={handleToggleRunning}
        onOpenTelegramModal={() => setTgModalOpen(true)}
        telegramEnabled={telegramEnabled}
      />

      {/* WORKSPACE CONTENT GRID */}
      <main className="workspace">
        
        {/* ROW 1: Chart canvas + Analytical Agents Grid */}
        <div className="ws-row ws-row-chart">
          {activeAssetObj && (
            <ChartSection
              activeAsset={activeAsset}
              history={activeAssetObj.history || []}
              decimalPlaces={activeAssetObj.dec}
              activeTimeframe={activeTimeframe}
              onChangeTimeframe={handleChangeTimeframe}
              indicators={indicators}
              onToggleIndicator={handleToggleIndicator}
            />
          )}
          
          <AgentsPanel
            activeAgent={activeAgent}
            onChangeAgent={handleChangeAgent}
            agentsRunning={agentsRunning}
            onToggleRunning={handleToggleRunning}
            agentConfidences={agentConfidences}
            agentSignalCounts={agentSignalCounts}
            veritasMetrics={{
              winRate: veritasMetrics.winRate,
              count: veritasMetrics.closedTrades.length,
              sharpeRatio: veritasMetrics.sharpeRatio
            }}
            agentLogs={agentLogs[activeAgent] || []}
            onClearTerminal={() => setAgentLogs(prev => ({ ...prev, [activeAgent]: [] }))}
          />
        </div>

        {/* ROW 2: Orderbook + Opportunities Signal & Veritas Performance Terminal */}
        <div className="ws-row ws-row-middle">
          {activeAssetObj && (
            <Orderbook
              activeAsset={activeAsset}
              activeAssetPrice={activeAssetObj.currentPrice}
              decimalPlaces={activeAssetObj.dec}
              spreadValue={activeAssetObj.spread}
              marketView={marketView}
              onChangeMarketView={setMarketView}
              dexTrades={dexTrades}
            />
          )}

          <OpportunityTerminal
            opportunities={opportunities}
            oppFilter={oppFilter}
            onChangeOppFilter={setOppFilter}
            activeAlphaTab={activeAlphaTab}
            onChangeAlphaTab={setActiveAlphaTab}
            activeVeritasSubTab={activeVeritasSubTab}
            onChangeVeritasSubTab={setActiveVeritasSubTab}
            veritasMetrics={veritasMetrics}
            marketStatus={marketStatusInfo.status}
            onOpenTelegramModal={() => setTgModalOpen(true)}
            assets={assets}
            onPlaceTrade={handlePlaceTrade}
            onClosePosition={handleClosePosition}
          />
        </div>

        {/* ROW 3: Sentiment Monitor + Forecast Terminal (PredictorX Chat) */}
        <div className="ws-row ws-row-bottom">
          <SentimentMonitor
            sentimentIndex={sentimentIndex}
            activeAsset={activeAsset}
            assetMood={activeAssetMood}
            sentimentScores={sentimentScores}
            newsFeed={newsFeed}
            syncTime={syncTime}
          />

          <ForecastTerminal
            activeAsset={activeAsset}
            asset={activeAssetObj}
          />
        </div>

        {/* ROW 4: Stock Screener & Indices strip */}
        <div className="ws-row" style={{ gridTemplateColumns: '1fr' }}>
          <StockScreener
            marketStatusInfo={marketStatusInfo}
            stockLoading={stockLoading}
            stockLoadingFailed={stockLoadingFailed}
            onRetryStockFetch={fetchAllStockData}
            assets={assets}
            onSelectAsset={handleSelectAsset}
            etClock={etClock}
          />
        </div>

        {/* FOOTER MARKET STATUS SUMMARY BAR */}
        {activeAssetObj && (
          <div className="footer-bar" id="footer-bar">
            <div className="footer-stats">
              <div className="fs-item">
                <span className="fs-label">Selected Market</span>
                <span className="fs-value text-cyan" id="fs-market">
                  {activeAsset === 'USDC/WETH' ? 'WETH/USDC' : activeAsset}
                </span>
              </div>
              <div className="fs-item">
                <span className="fs-label">
                  {['stock', 'index'].includes(activeAssetObj.type) ? 'Market Status' : '8h Funding / Status'}
                </span>
                <span
                  className="fs-value"
                  style={{
                    color: ['stock', 'index'].includes(activeAssetObj.type) ? marketStatusInfo.color :
                           activeAssetObj.fundingRate >= 0 ? 'var(--emerald)' : 'var(--red)'
                  }}
                  id="fs-funding"
                >
                  {['stock', 'index'].includes(activeAssetObj.type) ? marketStatusInfo.label :
                   (activeAssetObj.fundingRate >= 0 ? '+' : '') + activeAssetObj.fundingRate.toFixed(4) + '%'}
                </span>
              </div>
              <div className="fs-item">
                <span className="fs-label">
                  {['stock', 'index'].includes(activeAssetObj.type) ? 'Market Cap' : 'Open Interest'}
                </span>
                <span className="fs-value" id="fs-oi">
                  {['stock', 'index'].includes(activeAssetObj.type) ?
                   (activeAssetObj.marketCap ? `$${activeAssetObj.marketCap}B` : 'N/A') :
                   (activeAssetObj.oi ? `$${activeAssetObj.oi.toFixed(2)}M` : 'N/A')}
                </span>
              </div>
              <div className="fs-item">
                <span className="fs-label">
                  {['stock', 'index'].includes(activeAssetObj.type) ? 'Volume (Shares)' : 'Liq / Volume'}
                </span>
                <span className="fs-value" id="fs-liq">
                  {['stock', 'index'].includes(activeAssetObj.type) ?
                   (activeAssetObj.vol24h ? `${activeAssetObj.vol24h}M` : 'N/A') :
                   (activeAssetObj.liq ? `$${activeAssetObj.liq.toFixed(1)}M Longs` : 'N/A')}
                </span>
              </div>
              <div className="fs-item">
                <span className="fs-label">
                  {['stock', 'index'].includes(activeAssetObj.type) ? 'Daily Session Range' : 'L/S Ratio / Range'}
                </span>
                <span className="fs-value text-mono" id="fs-ls">
                  {['stock', 'index'].includes(activeAssetObj.type) ?
                   (activeAssetObj.dayHigh && activeAssetObj.dayLow ? `H:$${activeAssetObj.dayHigh.toFixed(2)} L:$${activeAssetObj.dayLow.toFixed(2)}` : 'N/A') :
                   (activeAssetObj.lsRatio ? `${activeAssetObj.lsRatio[0]}% / ${activeAssetObj.lsRatio[1]}%` : 'N/A')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Agent Consensus:</span>
              <span
                className={`action-badge ${
                  activeAssetObj.change > 2 ? 'ab-buy' :
                  activeAssetObj.change > 0.5 ? 'ab-buy' :
                  activeAssetObj.change < -2 ? 'ab-sell' :
                  activeAssetObj.change < -0.5 ? 'ab-sell' : 'ab-hold'
                }`}
                id="fs-consensus"
              >
                {activeAssetObj.change > 2 ? 'Strong Buy' :
                 activeAssetObj.change > 0.5 ? 'Buy' :
                 activeAssetObj.change < -2 ? 'Strong Sell' :
                 activeAssetObj.change < -0.5 ? 'Sell' : 'Hold'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* TOAST SYSTEM WRAPPER */}
      <div id="toast-container">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            <div className="toast-icon">{t.icon}</div>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.msg}</div>
            </div>
            <div className="toast-progress" />
          </div>
        ))}
      </div>

      {/* TELEGRAM SETUP MODAL */}
      <TelegramModal
        isOpen={tgModalOpen}
        onClose={() => setTgModalOpen(false)}
        onSaveConfig={handleSaveTelegramConfig}
      />
    </div>
  );
}
