/**
 * Aegis Quantum — AI Multi-Agent Market Intelligence Platform v3.0
 * LIVE DATA: Binance WebSocket (crypto) + Yahoo Finance (stocks)
 */

// ============================================================
// CONSTANTS & MAPS
// ============================================================

// Binance symbol → asset key mapping
const BINANCE_SYMBOL_MAP = {
  BTCUSDT: ['BTC-PERP', 'BTC/USD'],
  ETHUSDT: ['ETH-PERP', 'ETH/USDT', 'USDC/WETH'],
  SOLUSDT: ['SOL-PERP', 'SOL/USDC'],
};

// Asset key → Binance symbol
const ASSET_TO_BINANCE = {
  'BTC-PERP': 'BTCUSDT', 'BTC/USD': 'BTCUSDT',
  'ETH-PERP': 'ETHUSDT', 'ETH/USDT': 'ETHUSDT', 'USDC/WETH': 'ETHUSDT',
  'SOL-PERP': 'SOLUSDT', 'SOL/USDC': 'SOLUSDT',
};

// All Yahoo Finance symbols to fetch (stocks + indices)
const YAHOO_SYMBOLS = [
  'AAPL','MSFT','NVDA','TSLA','META','GOOGL','AMZN','NFLX','AMD','COIN',
  'SPY','QQQ','^VIX','^DJI','^IXIC'
];

// CORS proxy for Yahoo Finance
const YAHOO_PROXY = 'https://api.allorigins.win/raw?url=';

// Stock screener config
const STOCK_SCREENER_LIST = [
  { symbol:'AAPL',  company:'Apple Inc.',            color:'#888888', sector:'Technology' },
  { symbol:'MSFT',  company:'Microsoft Corp.',        color:'#00a4ef', sector:'Technology' },
  { symbol:'NVDA',  company:'NVIDIA Corp.',           color:'#76b900', sector:'Semiconductors' },
  { symbol:'TSLA',  company:'Tesla Inc.',             color:'#e31937', sector:'Automotive' },
  { symbol:'META',  company:'Meta Platforms Inc.',    color:'#0082fb', sector:'Social Media' },
  { symbol:'GOOGL', company:'Alphabet Inc.',          color:'#4285f4', sector:'Technology' },
  { symbol:'AMZN',  company:'Amazon.com Inc.',        color:'#ff9900', sector:'E-Commerce' },
  { symbol:'NFLX',  company:'Netflix Inc.',           color:'#e50914', sector:'Streaming' },
  { symbol:'AMD',   company:'AMD Inc.',               color:'#ed1c24', sector:'Semiconductors' },
  { symbol:'COIN',  company:'Coinbase Global Inc.',   color:'#0052ff', sector:'Fintech' },
];

const INDEX_LIST = [
  { symbol:'SPY',   name:'S&P 500',     icon:'📊', color:'var(--cyan)' },
  { symbol:'QQQ',   name:'NASDAQ 100',  icon:'💻', color:'var(--violet)' },
  { symbol:'^DJI',  name:'Dow Jones',   icon:'🏦', color:'var(--emerald)' },
  { symbol:'^VIX',  name:'VIX / Fear',  icon:'😨', color:'var(--amber)' },
];

// Binance klines interval map
const TF_TO_BINANCE = { '15m':'15m', '1h':'1h', '4h':'4h', '1d':'1d' };

// ============================================================
// STATE
// ============================================================
const STATE = {
  activeAsset: 'BTC-PERP',
  activeAssetType: 'perp',
  activeTimeframe: '15m',
  activeAgent: 'aegis',
  agentsRunning: true,
  marketView: 'cex',
  oppFilter: 'all',
  indicators: { ma: true, bb: true, rsi: true, macd: true, vol: false },
  opportunities: [],
  agentLogs: { aegis: [], sentinel: [], vox: [], predictor: [] },
  agentSignalCount: { aegis: 0, sentinel: 0, vox: 0, predictor: 0 },
  dexTrades: [],
  newsFeed: [],
  sentimentIndex: 78,
  fearGreed: 65,
  marketStatus: 'checking',  // 'open' | 'pre-market' | 'after-hours' | 'closed'
  stockDataLive: false,       // true when Yahoo Finance is responding
  cryptoDataLive: false,      // true when Binance WS is connected
  yahooData: {},              // symbol → quote object from Yahoo

  assets: {
    // Perpetuals (real Binance prices)
    'BTC-PERP': { symbol:'BTC-PERP', display:'₿',  type:'perp',  basePrice:68000, currentPrice:68245, change:1.25, fundingRate:0.0150, oi:482.4, liq:12.4, lsRatio:[58,42], dec:2, history:[], dataSource:'simulated' },
    'ETH-PERP': { symbol:'ETH-PERP', display:'Ξ',  type:'perp',  basePrice:3800,  currentPrice:3782,  change:-0.85,fundingRate:0.0085, oi:215.1, liq:4.8,  lsRatio:[52,48], dec:2, history:[], dataSource:'simulated' },
    'SOL-PERP': { symbol:'SOL-PERP', display:'◎',  type:'perp',  basePrice:175,   currentPrice:178,   change:3.42, fundingRate:0.0450, oi:84.15, liq:1.9,  lsRatio:[64,36], dec:2, history:[], dataSource:'simulated' },
    // DEX (mirrors Binance)
    'USDC/WETH':{ symbol:'USDC/WETH',display:'🦄',  type:'dex',   basePrice:3800,  currentPrice:3785,  change:-0.78,tvl:45.2,  vol24h:18.4, dex:'Uniswap v3', dec:2, history:[], dataSource:'simulated' },
    'SOL/USDC': { symbol:'SOL/USDC', display:'⚡',  type:'dex',   basePrice:175,   currentPrice:178,   change:3.45, tvl:12.8,  vol24h:5.1,  dex:'Raydium',   dec:2, history:[], dataSource:'simulated' },
    // CEX (real Binance prices)
    'BTC/USD':  { symbol:'BTC/USD',  display:'₿',  type:'cex',   basePrice:68000, currentPrice:68235, change:1.22, exchange:'Coinbase', spread:0.50, vol24h:124.5, dec:2, history:[], dataSource:'simulated' },
    'ETH/USDT': { symbol:'ETH/USDT', display:'Ξ',  type:'cex',   basePrice:3800,  currentPrice:3781,  change:-0.88,exchange:'Binance',  spread:0.10, vol24h:215.8, dec:2, history:[], dataSource:'simulated' },
    // Stocks (real Yahoo Finance)
    'AAPL':  { symbol:'AAPL',  display:'🍎', type:'stock', basePrice:196,   currentPrice:196.75,  change:-0.63, marketCap:3010, vol24h:52.8,  dec:2, history:[], dataSource:'simulated' },
    'MSFT':  { symbol:'MSFT',  display:'M',  type:'stock', basePrice:420,   currentPrice:420.50,  change:0.48,  marketCap:3120, vol24h:18.2,  dec:2, history:[], dataSource:'simulated' },
    'NVDA':  { symbol:'NVDA',  display:'N',  type:'stock', basePrice:1100,  currentPrice:1120.50, change:4.12,  marketCap:2750, vol24h:142.4, dec:2, history:[], dataSource:'simulated' },
    'TSLA':  { symbol:'TSLA',  display:'T',  type:'stock', basePrice:182,   currentPrice:184.20,  change:1.48,  marketCap:588,  vol24h:88.5,  dec:2, history:[], dataSource:'simulated' },
    'META':  { symbol:'META',  display:'f',  type:'stock', basePrice:508,   currentPrice:510.30,  change:1.18,  marketCap:1300, vol24h:12.4,  dec:2, history:[], dataSource:'simulated' },
    'GOOGL': { symbol:'GOOGL', display:'G',  type:'stock', basePrice:177,   currentPrice:178.40,  change:0.82,  marketCap:2200, vol24h:22.1,  dec:2, history:[], dataSource:'simulated' },
    'AMZN':  { symbol:'AMZN',  display:'A',  type:'stock', basePrice:181,   currentPrice:182.80,  change:1.55,  marketCap:1900, vol24h:28.4,  dec:2, history:[], dataSource:'simulated' },
    'NFLX':  { symbol:'NFLX',  display:'N',  type:'stock', basePrice:678,   currentPrice:680.40,  change:-0.42, marketCap:290,  vol24h:4.2,   dec:2, history:[], dataSource:'simulated' },
    'AMD':   { symbol:'AMD',   display:'A',  type:'stock', basePrice:153,   currentPrice:155.20,  change:2.05,  marketCap:250,  vol24h:32.8,  dec:2, history:[], dataSource:'simulated' },
    'COIN':  { symbol:'COIN',  display:'C',  type:'stock', basePrice:238,   currentPrice:240.80,  change:3.52,  marketCap:62,   vol24h:8.4,   dec:2, history:[], dataSource:'simulated' },
    // Indices (Yahoo Finance)
    'SPY':   { symbol:'SPY',   display:'S',  type:'index', basePrice:534,   currentPrice:535.40,  change:0.42,  name:'S&P 500 ETF',   dec:2, history:[], dataSource:'simulated' },
    'QQQ':   { symbol:'QQQ',   display:'Q',  type:'index', basePrice:459,   currentPrice:460.80,  change:0.58,  name:'NASDAQ-100 ETF', dec:2, history:[], dataSource:'simulated' },
    '^DJI':  { symbol:'^DJI',  display:'D',  type:'index', basePrice:40000, currentPrice:40250,   change:0.28,  name:'Dow Jones',      dec:0, history:[], dataSource:'simulated' },
    '^VIX':  { symbol:'^VIX',  display:'V',  type:'index', basePrice:14,    currentPrice:14.5,    change:-2.1,  name:'CBOE VIX',       dec:2, history:[], dataSource:'simulated' },
  }
};

// ============================================================
// MATH / INDICATOR LIBRARY
// ============================================================
function calcSMA(data, p) {
  return data.map((_, i) => {
    if (i < p - 1) return null;
    return data.slice(i - p + 1, i + 1).reduce((s, d) => s + d.close, 0) / p;
  });
}

function calcEMA(data, p) {
  if (!data.length) return [];
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
  if (data.length < l + sig) return { line: data.map(() => 0), signal: data.map(() => 0), hist: data.map(() => 0) };
  const emaS = calcEMA(data, s);
  const emaL = calcEMA(data, l);
  const line = emaS.map((v, i) => v - emaL[i]);
  const signalArr = [line[0]];
  const k = 2 / (sig + 1);
  for (let i = 1; i < line.length; i++) signalArr.push(line[i] * k + signalArr[i - 1] * (1 - k));
  const hist = line.map((v, i) => v - signalArr[i]);
  return { line, signal: signalArr, hist };
}

// ============================================================
// SIMULATED HISTORY (fallback when API unavailable)
// ============================================================
function buildSimulatedHistory(asset) {
  const n = 150;
  let price = asset.basePrice;
  const now = Date.now();
  asset.history = [];
  for (let i = n; i >= 0; i--) {
    const drift = (Math.random() - 0.488) * 0.018;
    const open = price;
    const close = price * (1 + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.006);
    const low  = Math.min(open, close) * (1 - Math.random() * 0.006);
    asset.history.push({
      time: new Date(now - i * 15 * 60 * 1000),
      open: +open.toFixed(asset.dec), high: +high.toFixed(asset.dec),
      low: +low.toFixed(asset.dec),  close: +close.toFixed(asset.dec),
      vol: Math.round(40000 + Math.random() * 800000)
    });
    price = close;
  }
}

Object.values(STATE.assets).forEach(a => buildSimulatedHistory(a));

// ============================================================
// MARKET HOURS DETECTION
// ============================================================
function getMarketStatus() {
  const now = new Date();
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short'
  }).formatToParts(now);

  const get = t => etParts.find(p => p.type === t)?.value;
  const weekday = get('weekday');
  const hour = parseInt(get('hour'));
  const minute = parseInt(get('minute'));
  const totalMins = (hour === 24 ? 0 : hour) * 60 + minute;

  // Weekend
  if (weekday === 'Sat' || weekday === 'Sun') {
    const nextOpen = weekday === 'Sat'
      ? `Mon 9:30 AM ET`
      : `Mon 9:30 AM ET`;
    return { status: 'closed', label: 'Weekend', color: 'var(--red)', detail: `Opens ${nextOpen}`, etTime: `${weekday} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}` };
  }

  const etStr = `${String(hour===24?0:hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ET`;

  // Pre-market 4:00 AM – 9:30 AM (240 – 570)
  if (totalMins >= 240 && totalMins < 570) {
    const rem = 570 - totalMins;
    return { status: 'pre-market', label: 'Pre-Market', color: 'var(--amber)', detail: `Regular opens in ${rem}m`, etTime: etStr };
  }
  // Regular 9:30 AM – 4:00 PM (570 – 960)
  if (totalMins >= 570 && totalMins < 960) {
    const rem = 960 - totalMins;
    return { status: 'open', label: 'Market Open', color: 'var(--emerald)', detail: `Closes in ${rem}m`, etTime: etStr };
  }
  // After-hours 4:00 PM – 8:00 PM (960 – 1200)
  if (totalMins >= 960 && totalMins < 1200) {
    const rem = 1200 - totalMins;
    return { status: 'after-hours', label: 'After Hours', color: 'var(--violet)', detail: `Ends in ${rem}m`, etTime: etStr };
  }
  // Overnight closed
  return { status: 'closed', label: 'Market Closed', color: 'var(--red)', detail: 'Pre-market opens 4:00 AM ET', etTime: etStr };
}

function updateMarketStatusUI() {
  const ms = getMarketStatus();
  STATE.marketStatus = ms.status;

  // Update ET clock
  const clockEl = document.getElementById('mkt-et-clock');
  if (clockEl) clockEl.textContent = ms.etTime;

  // Update pill in stocks section
  const pill = document.getElementById('mkt-status-pill');
  const label = document.getElementById('mkt-status-label');
  const eta = document.getElementById('mkt-eta');
  const dot = document.getElementById('mkt-dot');

  if (pill && label) {
    pill.style.borderColor = ms.color + '40';
    pill.style.color = ms.color;
    label.textContent = ms.label;
    if (eta) eta.textContent = ms.detail;
    if (dot) {
      dot.style.background = ms.color;
      dot.style.boxShadow = `0 0 6px ${ms.color}`;
      dot.style.animation = ms.status === 'open' ? 'pulse 1.5s infinite alternate' : 'none';
    }
  }

  // Show/hide closed overlay on stocks section
  const overlay = document.getElementById('stocks-closed-overlay');
  if (overlay) overlay.style.display = (ms.status === 'closed') ? 'flex' : 'none';
}

// ============================================================
// REAL CRYPTO DATA — BINANCE WEBSOCKET
// ============================================================
let binanceWS = null;
let binanceConnected = false;
let binanceRetries = 0;

function initBinanceWebSocket() {
  const streams = Object.keys(BINANCE_SYMBOL_MAP)
    .map(s => s.toLowerCase() + '@ticker')
    .join('/');

  try {
    binanceWS = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    binanceWS.onopen = () => {
      binanceConnected = true;
      STATE.cryptoDataLive = true;
      binanceRetries = 0;
      updateDataSourceBadge();
      showToast({ type: 'info', icon: '⚡', title: 'Binance Connected', msg: 'Real-time crypto prices active via WebSocket.' });
    };

    binanceWS.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (!d.s) return;
        const binSym = d.s; // e.g. 'BTCUSDT'
        const price   = parseFloat(d.c); // last price
        const changePct = parseFloat(d.P); // 24h change %
        const high24  = parseFloat(d.h);
        const low24   = parseFloat(d.l);
        const vol24   = parseFloat(d.v);

        const keys = BINANCE_SYMBOL_MAP[binSym] || [];
        keys.forEach(key => {
          const asset = STATE.assets[key];
          if (!asset) return;
          asset.currentPrice = +price.toFixed(asset.dec);
          asset.change = +changePct.toFixed(2);
          asset.dataSource = 'live';
          // Keep updating last candle
          if (asset.history.length) {
            const last = asset.history[asset.history.length - 1];
            last.close = asset.currentPrice;
            if (asset.currentPrice > last.high) last.high = asset.currentPrice;
            if (asset.currentPrice < last.low)  last.low  = asset.currentPrice;
          }
        });

        if (STATE.activeAsset === 'BTC-PERP' || STATE.activeAsset === 'BTC/USD') {
          if (binSym === 'BTCUSDT') { updateTopbar(); drawChart(); }
        }
        if (STATE.activeAsset === 'ETH-PERP' || STATE.activeAsset === 'ETH/USDT' || STATE.activeAsset === 'USDC/WETH') {
          if (binSym === 'ETHUSDT') { updateTopbar(); drawChart(); }
        }
        if (STATE.activeAsset === 'SOL-PERP' || STATE.activeAsset === 'SOL/USDC') {
          if (binSym === 'SOLUSDT') { updateTopbar(); drawChart(); }
        }

        updateSidebarPrices();
        updateFooterBar();
      } catch (err) { /* ignore parse errors */ }
    };

    binanceWS.onerror = () => {
      binanceConnected = false;
      STATE.cryptoDataLive = false;
    };

    binanceWS.onclose = () => {
      binanceConnected = false;
      STATE.cryptoDataLive = false;
      updateDataSourceBadge();
      // Exponential backoff retry
      if (binanceRetries < 8) {
        const delay = Math.min(30000, 2000 * Math.pow(2, binanceRetries));
        binanceRetries++;
        setTimeout(initBinanceWebSocket, delay);
      }
    };
  } catch (e) {
    console.warn('Binance WS init failed:', e.message);
  }
}

// Fetch real Binance candlestick data
async function fetchBinanceKlines(assetKey, tf = '15m') {
  const binSym = ASSET_TO_BINANCE[assetKey];
  if (!binSym) return false;
  const interval = TF_TO_BINANCE[tf] || '15m';

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=150`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Binance API error');
    const raw = await res.json();

    const asset = STATE.assets[assetKey];
    asset.history = raw.map(k => ({
      time:  new Date(k[0]),
      open:  +parseFloat(k[1]).toFixed(asset.dec),
      high:  +parseFloat(k[2]).toFixed(asset.dec),
      low:   +parseFloat(k[3]).toFixed(asset.dec),
      close: +parseFloat(k[4]).toFixed(asset.dec),
      vol:   +parseFloat(k[5]).toFixed(0),
    }));

    if (asset.history.length) {
      asset.currentPrice = asset.history[asset.history.length - 1].close;
      asset.dataSource = 'live';
    }
    return true;
  } catch (e) {
    console.warn('Binance klines failed for', assetKey, e.message);
    return false;
  }
}

// ============================================================
// REAL STOCK DATA — YAHOO FINANCE
// ============================================================
async function fetchAllStockData() {
  const symbols = YAHOO_SYMBOLS.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,preMarketPrice,postMarketPrice,marketState`;

  let quotes = [];

  // Try direct first (sometimes works)
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      quotes = data?.quoteResponse?.result || [];
    }
  } catch (_) {}

  // Fallback: CORS proxy
  if (!quotes.length) {
    try {
      const proxyUrl = YAHOO_PROXY + encodeURIComponent(url);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        quotes = data?.quoteResponse?.result || [];
      }
    } catch (_) {}
  }

  if (quotes.length) {
    processYahooQuotes(quotes);
    STATE.stockDataLive = true;
    updateDataSourceBadge();
    renderStocksSection();
    renderIndicesStrip();
    updateSidebarPrices();
    updateTopbar();
  }
}

function processYahooQuotes(quotes) {
  quotes.forEach(q => {
    const sym = q.symbol;
    const asset = STATE.assets[sym];
    STATE.yahooData[sym] = q; // cache raw

    if (asset) {
      const mktStatus = getMarketStatus();
      // Use premarket/afterhours price if available
      let price = q.regularMarketPrice;
      if (mktStatus.status === 'pre-market' && q.preMarketPrice) price = q.preMarketPrice;
      if (mktStatus.status === 'after-hours' && q.postMarketPrice) price = q.postMarketPrice;

      if (price && !isNaN(price)) {
        asset.currentPrice = +price.toFixed(asset.dec);
        asset.change = +(q.regularMarketChangePercent || 0).toFixed(2);
        asset.marketCap = q.marketCap ? +(q.marketCap / 1e9).toFixed(1) : asset.marketCap;
        asset.vol24h = q.regularMarketVolume ? +(q.regularMarketVolume / 1e6).toFixed(1) : asset.vol24h;
        asset.dayHigh = q.regularMarketDayHigh;
        asset.dayLow  = q.regularMarketDayLow;
        asset.dayOpen = q.regularMarketOpen;
        asset.dataSource = 'live';
      }
    }
  });
}

async function fetchStockKlines(symbol, tf = '15m') {
  const intervalMap = { '15m': '15m', '1h': '60m', '4h': '60m', '1d': '1d' };
  const rangeMap    = { '15m': '5d',  '1h': '30d', '4h': '30d', '1d': '1y' };
  const interval = intervalMap[tf] || '15m';
  const range    = rangeMap[tf]    || '5d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=true`;

  let result = null;
  try {
    const res = await fetch(url);
    if (res.ok) result = await res.json();
  } catch (_) {}

  if (!result) {
    try {
      const res = await fetch(YAHOO_PROXY + encodeURIComponent(url));
      if (res.ok) result = await res.json();
    } catch (_) {}
  }

  if (!result) return false;

  try {
    const r = result.chart?.result?.[0];
    if (!r) return false;
    const ts = r.timestamp || [];
    const q  = r.indicators?.quote?.[0] || {};
    const asset = STATE.assets[symbol];
    if (!asset) return false;

    const bars = ts.map((t, i) => ({
      time:  new Date(t * 1000),
      open:  q.open?.[i]   || 0,
      high:  q.high?.[i]   || 0,
      low:   q.low?.[i]    || 0,
      close: q.close?.[i]  || 0,
      vol:   q.volume?.[i] || 0,
    })).filter(b => b.close > 0);

    if (bars.length > 5) {
      asset.history = bars;
      asset.dataSource = 'live';
      return true;
    }
  } catch (e) { console.warn('Stock klines parse error:', e.message); }
  return false;
}

// Update the live/simulated badge in the UI
function updateDataSourceBadge() {
  const badge = document.getElementById('data-source-badge');
  if (!badge) return;
  if (STATE.cryptoDataLive) {
    badge.textContent = '⚡ Live Binance + Yahoo';
    badge.style.color = 'var(--emerald)';
  } else {
    badge.textContent = '⚙ Simulated Prices';
    badge.style.color = 'var(--amber)';
  }
}

// ============================================================
// SIMULATED TICK (only for crypto when WS is down, never for stocks when closed)
// ============================================================
function tickSimulatedCrypto() {
  if (STATE.cryptoDataLive) return; // skip if Binance WS is active
  const cryptoTypes = ['perp', 'dex', 'cex'];
  Object.values(STATE.assets).forEach(asset => {
    if (!cryptoTypes.includes(asset.type)) return;
    const drift = (Math.random() - 0.49) * 0.0012;
    asset.currentPrice = +((asset.currentPrice * (1 + drift)).toFixed(asset.dec));
    asset.change = +(asset.change + drift * 20).toFixed(2);
    if (asset.history.length) {
      const last = asset.history[asset.history.length - 1];
      last.close = asset.currentPrice;
      if (asset.currentPrice > last.high) last.high = asset.currentPrice;
      if (asset.currentPrice < last.low)  last.low  = asset.currentPrice;
    }
    if (asset.type === 'perp') {
      asset.fundingRate = +(asset.fundingRate + (Math.random() - 0.5) * 0.0008).toFixed(4);
      asset.oi = +(asset.oi + (Math.random() - 0.49) * 1.2).toFixed(2);
    }
  });

  updateSidebarPrices();
  updateTopbar();
  updateFooterBar();
  drawChart();
  generateCEXOrderbook();
}

// ============================================================
// SIDEBAR PRICES
// ============================================================
function updateSidebarPrices() {
  Object.values(STATE.assets).forEach(asset => {
    const id = asset.symbol.replace(/\//g, '-').replace(/\^/g, '');
    const priceEl = document.getElementById('price-' + id);
    const chgEl   = document.getElementById('chg-' + id);
    if (priceEl) {
      const isLive = asset.dataSource === 'live';
      priceEl.textContent = '$' + asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: asset.dec });
      priceEl.className = 'asset-price-val ' + (asset.change >= 0 ? 'price-up' : 'price-down');
    }
    if (chgEl) {
      chgEl.textContent = (asset.change >= 0 ? '+' : '') + asset.change.toFixed(2) + '%';
      chgEl.className = 'asset-change ' + (asset.change >= 0 ? 'price-up' : 'price-down');
    }
  });
}

// ============================================================
// TOPBAR
// ============================================================
function updateTopbar() {
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset) return;
  document.getElementById('hero-price').textContent = '$' + asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: asset.dec });
  const chgEl = document.getElementById('hero-change');
  chgEl.textContent = (asset.change >= 0 ? '+' : '') + asset.change.toFixed(2) + '%';
  chgEl.className = 'asset-hero-change ' + (asset.change >= 0 ? 'price-up' : 'price-down');

  document.getElementById('tb-agents').textContent = STATE.agentsRunning ? '4 / 4' : '0 / 4';
  document.getElementById('tb-alpha').textContent  = STATE.opportunities.length + ' Active';
  const si = STATE.sentimentIndex;
  document.getElementById('tb-mood').textContent = si + '% ' + (si > 55 ? 'Bullish' : si < 45 ? 'Bearish' : 'Neutral');
  document.getElementById('tb-mood').style.color = si > 55 ? 'var(--emerald)' : si < 45 ? 'var(--red)' : 'var(--amber)';
  const fg = STATE.fearGreed;
  document.getElementById('tb-fear').textContent = (fg > 75 ? 'Extreme Greed ' : fg > 55 ? 'Greed ' : fg > 45 ? 'Neutral ' : fg > 25 ? 'Fear ' : 'Extreme Fear ') + fg;
  document.getElementById('tb-fear').style.color = fg > 65 ? 'var(--amber)' : fg < 35 ? 'var(--red)' : 'var(--text-primary)';
}

// ============================================================
// FOOTER BAR
// ============================================================
function updateFooterBar() {
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset) return;
  document.getElementById('fs-market').textContent = asset.symbol;
  if (asset.type === 'perp') {
    document.getElementById('fs-funding').textContent = (asset.fundingRate >= 0 ? '+' : '') + asset.fundingRate.toFixed(4) + '%';
    document.getElementById('fs-funding').className = 'fs-value ' + (asset.fundingRate >= 0 ? 'price-up' : 'price-down');
    document.getElementById('fs-oi').textContent  = '$' + asset.oi.toFixed(2) + 'M';
    document.getElementById('fs-liq').textContent = '$' + asset.liq.toFixed(1) + 'M Longs';
    document.getElementById('fs-ls').textContent  = asset.lsRatio[0] + '% / ' + asset.lsRatio[1] + '%';
  } else if (asset.type === 'stock' || asset.type === 'index') {
    const ms = getMarketStatus();
    document.getElementById('fs-funding').textContent = ms.label;
    document.getElementById('fs-funding').style.color = ms.color;
    document.getElementById('fs-oi').textContent  = asset.marketCap ? '$' + asset.marketCap + 'B Mkt Cap' : 'N/A';
    document.getElementById('fs-liq').textContent = asset.vol24h ? asset.vol24h + 'M Shares' : 'N/A';
    document.getElementById('fs-ls').textContent  = asset.dayHigh && asset.dayLow ? `H:$${asset.dayHigh?.toFixed(2)} L:$${asset.dayLow?.toFixed(2)}` : 'N/A';
  } else {
    document.getElementById('fs-funding').textContent = 'N/A';
    document.getElementById('fs-oi').textContent  = 'Vol: $' + (asset.vol24h || 0).toFixed(1) + 'M';
    document.getElementById('fs-liq').textContent = 'N/A';
    document.getElementById('fs-ls').textContent  = 'N/A';
  }
  const c = asset.change;
  const cEl = document.getElementById('fs-consensus');
  if (c > 2)       { cEl.textContent = 'Strong Buy';  cEl.className = 'action-badge ab-buy'; }
  else if (c > 0.5){ cEl.textContent = 'Buy';         cEl.className = 'action-badge ab-buy'; }
  else if (c < -2) { cEl.textContent = 'Strong Sell'; cEl.className = 'action-badge ab-sell'; }
  else if (c < -0.5){ cEl.textContent = 'Sell';       cEl.className = 'action-badge ab-sell'; }
  else             { cEl.textContent = 'Hold';         cEl.className = 'action-badge ab-hold'; }
}

// ============================================================
// CANVAS CHART
// ============================================================
const canvas = document.getElementById('price-chart');
const ctx    = canvas.getContext('2d');
const tooltip = document.getElementById('chart-tooltip');
let hoverIdx = -1;
const RIGHT_PAD = 68;

function resizeCanvas() {
  const wrap = document.getElementById('chart-canvas-wrap');
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  canvas.width  = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset?.history.length) return;
  const n = asset.history.length;
  const chartW = canvas.width / (window.devicePixelRatio || 1) - RIGHT_PAD;
  const step = chartW / n;
  hoverIdx = Math.min(n - 1, Math.max(0, Math.floor(mx / step)));
  const bar = asset.history[hoverIdx];
  if (!bar) return;
  tooltip.style.display = 'block';
  const ttX = mx > chartW * 0.65 ? mx - 165 : mx + 12;
  const ttY = Math.max(4, e.clientY - rect.top - 60);
  tooltip.style.left = ttX + 'px'; tooltip.style.top = ttY + 'px';
  const isUp = bar.close >= bar.open;
  document.getElementById('tt-price').textContent = '$' + bar.close.toLocaleString();
  document.getElementById('tt-price').style.color = isUp ? 'var(--emerald)' : 'var(--red)';
  document.getElementById('tt-o').textContent = '$' + bar.open.toLocaleString();
  document.getElementById('tt-h').textContent = '$' + bar.high.toLocaleString();
  document.getElementById('tt-l').textContent = '$' + bar.low.toLocaleString();
  document.getElementById('tt-c').textContent = '$' + bar.close.toLocaleString();
  drawChart();
});

canvas.addEventListener('mouseleave', () => {
  hoverIdx = -1;
  tooltip.style.display = 'none';
  drawChart();
});

function drawChart() {
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset?.history.length) return;

  const W  = canvas.width  / (window.devicePixelRatio || 1);
  const H  = canvas.height / (window.devicePixelRatio || 1);
  const data = asset.history;
  const n = data.length;
  const dec = asset.dec;

  ctx.clearRect(0, 0, W, H);

  const showRSI  = STATE.indicators.rsi;
  const showMACD = STATE.indicators.macd;
  const showVol  = STATE.indicators.vol;
  const subCount = [showRSI, showMACD, showVol].filter(Boolean).length;
  const mainPct  = subCount === 0 ? 0.96 : subCount === 1 ? 0.72 : subCount === 2 ? 0.58 : 0.50;
  const mainH = H * mainPct;
  const subH  = subCount > 0 ? (H * (1 - mainPct)) / subCount : 0;
  const chartW = W - RIGHT_PAD;
  const step = chartW / n;
  const candleW = Math.max(1, step * 0.7);

  const sma20 = calcSMA(data, 20);
  const ema9  = calcEMA(data, 9);
  const bb    = calcBB(data, 20, 2);
  const rsiArr = calcRSI(data, 14);
  const macd  = calcMACD(data);

  let maxP = -Infinity, minP = Infinity;
  data.forEach(b => { if (b.high > maxP) maxP = b.high; if (b.low < minP) minP = b.low; });
  if (STATE.indicators.bb) {
    bb.upper.forEach(v => { if (v && v > maxP) maxP = v; });
    bb.lower.forEach(v => { if (v && v < minP) minP = v; });
  }
  const rng = maxP - minP || 1;
  maxP += rng * 0.04; minP -= rng * 0.04;

  const scaleY = v => mainH - 30 - ((v - minP) / (maxP - minP)) * (mainH - 50);
  const xOf    = i => i * step + step / 2;

  // Grid
  ctx.lineWidth = 0.5;
  for (let g = 0; g <= 6; g++) {
    const gy = 25 + ((mainH - 55) / 6) * g;
    const pv = maxP - ((maxP - minP) / 6) * g;
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(chartW, gy); ctx.stroke();
    ctx.fillStyle = '#2d4466'; ctx.font = '9px Fira Code,monospace'; ctx.textAlign = 'left';
    ctx.fillText('$' + pv.toLocaleString(undefined, { maximumFractionDigits: dec }), chartW + 4, gy + 3);
  }

  // Time labels
  for (let i = 0; i < n; i += Math.ceil(n / 6)) {
    const t = data[i].time;
    const label = t instanceof Date ? t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
    ctx.fillStyle = '#2d4466'; ctx.font = '8px Fira Code,monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, xOf(i), mainH - 8);
  }

  // Bollinger Bands
  if (STATE.indicators.bb) {
    ctx.setLineDash([4, 4]);
    ['upper', 'lower'].forEach(k => {
      ctx.strokeStyle = 'rgba(6,182,212,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); let s = false;
      for (let i = 0; i < n; i++) {
        if (bb[k][i] == null) continue;
        const p = [xOf(i), scaleY(bb[k][i])];
        if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // Shaded fill
    ctx.beginPath(); let s = false;
    for (let i = 0; i < n; i++) {
      if (bb.upper[i] == null) continue;
      const p = [xOf(i), scaleY(bb.upper[i])];
      if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
    }
    for (let i = n-1; i >= 0; i--) {
      if (bb.lower[i] == null) continue;
      ctx.lineTo(xOf(i), scaleY(bb.lower[i]));
    }
    ctx.closePath(); ctx.fillStyle = 'rgba(6,182,212,0.018)'; ctx.fill();
  }

  // EMA 9 & SMA 20
  if (STATE.indicators.ma) {
    [[ema9,'rgba(139,92,246,0.6)'],[sma20,'rgba(217,70,239,0.6)']].forEach(([arr, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); let s = false;
      for (let i = 0; i < n; i++) {
        if (arr[i] == null) continue;
        const p = [xOf(i), scaleY(arr[i])];
        if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
      }
      ctx.stroke();
    });
  }

  // Candlesticks
  for (let i = 0; i < n; i++) {
    const b = data[i]; const isUp = b.close >= b.open; const cx = xOf(i);
    ctx.strokeStyle = isUp ? 'rgba(16,185,129,0.7)' : 'rgba(244,63,94,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, scaleY(b.high)); ctx.lineTo(cx, scaleY(b.low)); ctx.stroke();
    const top = scaleY(Math.max(b.open, b.close));
    const bh  = Math.max(scaleY(Math.min(b.open, b.close)) - top, 1.5);
    ctx.fillStyle = isUp ? '#10b981' : '#f43f5e'; ctx.lineWidth = 0.5;
    ctx.fillRect(i * step + step * 0.15, top, candleW, bh);
  }

  // Hover crosshair
  if (hoverIdx >= 0) {
    ctx.fillStyle = 'rgba(6,182,212,0.04)';
    ctx.fillRect(hoverIdx * step, 0, step, mainH);
    ctx.strokeStyle = 'rgba(6,182,212,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(xOf(hoverIdx), 0); ctx.lineTo(xOf(hoverIdx), H); ctx.stroke();
    ctx.setLineDash([]);
    const bar = data[hoverIdx];
    if (bar) {
      document.getElementById('cib-open').textContent  = '$' + bar.open.toLocaleString();
      document.getElementById('cib-high').textContent  = '$' + bar.high.toLocaleString();
      document.getElementById('cib-low').textContent   = '$' + bar.low.toLocaleString();
      document.getElementById('cib-close').textContent = '$' + bar.close.toLocaleString();
      document.getElementById('cib-vol').textContent   = bar.vol.toLocaleString();
    }
  } else {
    const last = data[n-1];
    if (last) {
      document.getElementById('cib-open').textContent  = '$' + last.open.toLocaleString();
      document.getElementById('cib-high').textContent  = '$' + last.high.toLocaleString();
      document.getElementById('cib-low').textContent   = '$' + last.low.toLocaleString();
      document.getElementById('cib-close').textContent = '$' + last.close.toLocaleString();
      document.getElementById('cib-vol').textContent   = last.vol.toLocaleString();
    }
  }

  // Info strip indicators
  const lastSMA = sma20[n-1];
  document.getElementById('cib-ma20').textContent = lastSMA ? '$' + lastSMA.toFixed(dec) : '—';
  const lastRSI = rsiArr.filter(v => v != null).slice(-1)[0];
  if (lastRSI != null) {
    document.getElementById('cib-rsi').textContent = lastRSI.toFixed(1);
    document.getElementById('cib-rsi').style.color = lastRSI > 70 ? 'var(--red)' : lastRSI < 30 ? 'var(--emerald)' : 'var(--amber)';
  }
  const lastMACD = macd.line[n-1] || 0;
  document.getElementById('cib-macd').textContent = (lastMACD >= 0 ? '+' : '') + lastMACD.toFixed(3);
  document.getElementById('cib-macd').style.color = lastMACD >= 0 ? 'var(--emerald)' : 'var(--red)';

  // Sub-charts
  let subY = mainH;

  const drawSubSep = (y, label) => {
    ctx.fillStyle = 'rgba(5,7,15,0.4)'; ctx.fillRect(0, y, W, subH);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = '#2d4466'; ctx.font = '9px Fira Code,monospace'; ctx.textAlign = 'left';
    ctx.fillText(label, 6, y + 11);
  };

  if (showRSI) {
    drawSubSep(subY, 'RSI (14)');
    const rsiScale = v => subY + subH * (1 - v / 100);
    [70, 30, 50].forEach(v => {
      const ry = rsiScale(v);
      ctx.strokeStyle = v === 50 ? 'rgba(255,255,255,0.04)' : v === 70 ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)';
      ctx.lineWidth = 0.8; ctx.setLineDash(v === 50 ? [2,4] : []);
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(chartW, ry); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#2d4466'; ctx.textAlign = 'left'; ctx.fillText(v, chartW + 4, ry + 3);
    });
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.2; ctx.beginPath(); let s = false;
    for (let i = 0; i < n; i++) {
      if (rsiArr[i] == null) continue;
      const p = [xOf(i), rsiScale(rsiArr[i])];
      if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
    }
    ctx.stroke();
    subY += subH;
  }

  if (showMACD) {
    drawSubSep(subY, 'MACD (12,26,9)');
    const allM = [...macd.line, ...macd.signal, ...macd.hist].map(Math.abs);
    const maxM = (Math.max(...allM) || 0.01) * 1.15;
    const midY = subY + subH / 2;
    const macdScale = v => midY - (v / maxM) * (subH / 2 - 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(chartW, midY); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const v = macd.hist[i] || 0;
      ctx.fillStyle = v >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)';
      const y0 = midY, y1 = macdScale(v);
      ctx.fillRect(i * step + step * 0.15, Math.min(y0,y1), candleW, Math.abs(y0-y1));
    }
    [[macd.line,'rgba(6,182,212,0.8)'],[macd.signal,'rgba(245,158,11,0.7)']].forEach(([arr,col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.beginPath(); let s = false;
      for (let i = 0; i < n; i++) {
        const p = [xOf(i), macdScale(arr[i]||0)];
        if (!s) { ctx.moveTo(...p); s = true; } else ctx.lineTo(...p);
      }
      ctx.stroke();
    });
    subY += subH;
  }

  if (showVol) {
    drawSubSep(subY, 'Volume');
    const maxVol = Math.max(...data.map(b => b.vol)) || 1;
    for (let i = 0; i < n; i++) {
      const b = data[i]; const barH = (b.vol / maxVol) * (subH - 18);
      ctx.fillStyle = b.close >= b.open ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)';
      ctx.fillRect(i * step + step * 0.15, subY + subH - barH - 8, candleW, barH);
    }
  }
}

// ============================================================
// ORDERBOOK
// ============================================================
function generateCEXOrderbook() {
  if (STATE.marketView !== 'cex') return;
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset) return;
  const mid = asset.currentPrice;
  const spread = asset.spread || mid * 0.00008;
  const half = spread / 2;
  const dec = asset.dec;

  let askHTML = '', bidHTML = '';
  for (let i = 6; i >= 1; i--) {
    const price = mid + half + i * mid * 0.00014;
    const size  = Math.random() * (100 / Math.sqrt(i));
    const pct   = Math.min((size / 80) * 100, 100);
    askHTML += `<div class="ob-row"><div class="ob-bar ask" style="width:${pct}%"></div>
      <span class="ob-cell ob-ask-price">${price.toFixed(dec)}</span>
      <span class="ob-cell text-muted">${size.toFixed(3)}</span>
      <span class="ob-cell text-muted">${(price*size).toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>`;
  }
  for (let i = 1; i <= 6; i++) {
    const price = mid - half - i * mid * 0.00014;
    const size  = Math.random() * (100 / Math.sqrt(i));
    const pct   = Math.min((size / 80) * 100, 100);
    bidHTML += `<div class="ob-row"><div class="ob-bar bid" style="width:${pct}%"></div>
      <span class="ob-cell ob-bid-price">${price.toFixed(dec)}</span>
      <span class="ob-cell text-muted">${size.toFixed(3)}</span>
      <span class="ob-cell text-muted">${(price*size).toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>`;
  }
  document.getElementById('ob-asks').innerHTML = askHTML;
  document.getElementById('ob-bids').innerHTML = bidHTML;
  document.getElementById('ob-spread').innerHTML = `<span class="ob-mid-price">$${mid.toLocaleString()}</span>Spread: $${spread.toFixed(dec)} · ${((spread/mid)*100).toFixed(3)}%`;
}

// ============================================================
// DEX TRADES
// ============================================================
function createDEXTrade() {
  const asset = STATE.assets[STATE.activeAsset];
  if (!asset) return;
  const isBuy = Math.random() > 0.48;
  const timeStr = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  let amount = Math.random() * (asset.symbol.includes('BTC') ? 3 : asset.symbol.includes('SOL') ? 200 : 80);
  STATE.dexTrades.unshift(`<div class="dex-row">
    <span class="text-muted">${timeStr}</span>
    <span style="color:${isBuy ? 'var(--emerald)' : 'var(--red)'};font-weight:600;">${isBuy ? 'BUY' : 'SELL'}</span>
    <span class="text-mono">${amount.toFixed(3)}</span>
    <span class="text-mono text-cyan">$${asset.currentPrice.toLocaleString()}</span>
  </div>`);
  if (STATE.dexTrades.length > 40) STATE.dexTrades.pop();
  if (STATE.marketView === 'dex') document.getElementById('dex-trades-stream').innerHTML = STATE.dexTrades.join('');
}

// ============================================================
// STOCKS SECTION — SCREENER & INDICES
// ============================================================
function renderIndicesStrip() {
  const strip = document.getElementById('indices-strip');
  if (!strip) return;
  strip.innerHTML = INDEX_LIST.map(idx => {
    const asset = STATE.assets[idx.symbol];
    if (!asset) return '';
    const isUp = asset.change >= 0;
    const isLive = asset.dataSource === 'live';
    return `<div class="index-card">
      <div class="index-card-header">
        <span class="idx-icon">${idx.icon}</span>
        <span class="idx-name">${idx.name}</span>
        ${isLive ? '<span class="idx-live-dot"></span>' : ''}
      </div>
      <div class="idx-price" style="color:${isUp ? 'var(--emerald)' : 'var(--red)'}">
        ${idx.symbol === '^VIX' ? '' : '$'}${asset.currentPrice.toLocaleString(undefined, {minimumFractionDigits:asset.dec, maximumFractionDigits:asset.dec})}
      </div>
      <div class="idx-change" style="color:${isUp ? 'var(--emerald)' : 'var(--red)'}">
        ${isUp ? '▲' : '▼'} ${Math.abs(asset.change).toFixed(2)}%
      </div>
    </div>`;
  }).join('');
}

function getStockSignal(asset) {
  if (!asset.history || asset.history.length < 20) {
    // Simple heuristic from change %
    const c = asset.change;
    if (c > 2.5) return { signal: 'STRONG BUY', cls: 'ab-buy', conf: 85 };
    if (c > 0.5) return { signal: 'BUY',         cls: 'ab-buy', conf: 72 };
    if (c < -2.5){ return { signal: 'STRONG SELL',cls: 'ab-sell',conf: 82 }; }
    if (c < -0.5){ return { signal: 'SELL',       cls: 'ab-sell',conf: 68 }; }
    return { signal: 'HOLD', cls: 'ab-hold', conf: 60 };
  }
  const rsi  = calcRSI(asset.history, 14).filter(v => v != null);
  const macd = calcMACD(asset.history);
  const n    = asset.history.length;
  const r    = rsi[rsi.length - 1] || 50;
  const mLine = macd.line[n-1] || 0;
  const mSig  = macd.signal[n-1] || 0;
  const bullish = mLine > mSig && r < 70;
  const oversold = r < 30;
  const overbought = r > 70;
  if (oversold && mLine > mSig) return { signal: 'STRONG BUY', cls: 'ab-buy', conf: 88 };
  if (bullish)  return { signal: 'BUY',         cls: 'ab-buy',  conf: Math.round(65 + Math.random()*15) };
  if (overbought) return { signal: 'SELL',      cls: 'ab-sell', conf: Math.round(65 + Math.random()*15) };
  if (mLine < mSig && asset.change < 0) return { signal: 'SELL', cls: 'ab-sell', conf: Math.round(62 + Math.random()*12) };
  return { signal: 'HOLD', cls: 'ab-hold', conf: Math.round(55 + Math.random()*15) };
}

function renderStocksSection() {
  const ms   = getMarketStatus();
  const tbody = document.getElementById('stock-screener-tbody');
  if (!tbody) return;

  let html = '';
  STOCK_SCREENER_LIST.forEach(s => {
    const asset = STATE.assets[s.symbol];
    if (!asset) return;
    const isUp = asset.change >= 0;
    const sig  = getStockSignal(asset);
    const isLive = asset.dataSource === 'live';
    const statusTxt = ms.status === 'open' ? '🟢 Open' :
                      ms.status === 'pre-market' ? '🟡 Pre-Mkt' :
                      ms.status === 'after-hours' ? '🟠 After-Hrs' : '🔴 Closed';

    html += `<tr class="stock-row" data-symbol="${s.symbol}">
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:26px;height:26px;border-radius:5px;background:${s.color}22;color:${s.color};display:grid;place-items:center;font-size:0.65rem;font-weight:800;flex-shrink:0;">${s.symbol.slice(0,2)}</div>
          <div>
            <div style="font-weight:700;font-size:0.8rem;">${s.symbol}</div>
            <div style="font-size:0.6rem;color:var(--text-muted);">${s.sector}</div>
          </div>
        </div>
      </td>
      <td style="font-size:0.72rem;color:var(--text-secondary);">${s.company}</td>
      <td>
        <div style="font-weight:700;font-family:var(--font-mono);font-size:0.82rem;">
          $${asset.currentPrice.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
          ${isLive ? '<span style="font-size:0.55rem;color:var(--emerald);margin-left:3px;">LIVE</span>' : ''}
        </div>
      </td>
      <td>
        <span style="color:${isUp ? 'var(--emerald)' : 'var(--red)'};font-weight:700;font-size:0.78rem;">
          ${isUp ? '▲' : '▼'} ${Math.abs(asset.change).toFixed(2)}%
        </span>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);">${asset.vol24h?.toFixed(1) || '—'}M</td>
      <td style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);">$${asset.marketCap?.toFixed(0) || '—'}B</td>
      <td><span class="action-badge ${sig.cls}">${sig.signal}</span> <span style="font-size:0.62rem;color:var(--text-muted);">${sig.conf}%</span></td>
      <td><span style="font-size:0.68rem;">${statusTxt}</span></td>
    </tr>`;
  });

  tbody.innerHTML = html;

  // Make rows clickable → select asset
  document.querySelectorAll('.stock-row').forEach(row => {
    row.addEventListener('click', () => selectAsset(row.dataset.symbol, 'stock'));
  });
}

// ============================================================
// SENTIMENT ENGINE
// ============================================================
const NEWS_TEMPLATES = [
  { text:'Whale wallet moved 450 BTC to Coinbase. Potential distribution signal.', impact:-4, source:'ChainSentinel' },
  { text:'Fed signals rate cuts ahead of FOMC. Macro turns risk-on for risk assets.', impact:7, source:'VoxMedia' },
  { text:'VC fund commits $2.5B to Web3 infrastructure across Solana and Ethereum.', impact:5, source:'VoxMedia' },
  { text:'Funding rates spike — highest over-leverage since Q1 2024. Long squeeze risk.', impact:-4, source:'ChainSentinel' },
  { text:'RSI divergence on SOL-PERP 15m suggests local top near $185. Take-profit zone.', impact:-2, source:'Aegis' },
  { text:'Uniswap DAO votes to activate protocol fee switch. Heavy accumulation.', impact:6, source:'ChainSentinel' },
  { text:'NVIDIA chip revenue forecast beats estimates by 28%. Tech rally incoming.', impact:4, source:'VoxMedia' },
  { text:'MEV sandwich vulnerability drains $1.2M from DEX arbitrage pool.', impact:-5, source:'ChainSentinel' },
  { text:'MACD gold crossover confirmed on BTC daily. Historically bullish pattern.', impact:5, source:'Aegis' },
  { text:'Liquidation cascade wipes $120M OI. Market deleveraging in progress.', impact:-3, source:'Aegis' },
  { text:'SEC Commissioner comments positively on spot ETF framework. Market surges.', impact:8, source:'VoxMedia' },
  { text:'Stablecoin supply grows $4.2B week-over-week — dry powder accumulating.', impact:5, source:'ChainSentinel' },
  { text:'Twitter mentions of BTC up 22% in past hour. Retail FOMO signals emerging.', impact:3, source:'VoxPopulist' },
  { text:'Open interest on BTC-PERP reaches ATH. Elevated risk of volatile liquidation.', impact:-3, source:'Aegis' },
];

function tickSentiment() {
  if (Math.random() < 0.22) {
    const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
    const isBull = tmpl.impact >= 0;
    const timeStr = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    STATE.sentimentIndex = Math.max(10, Math.min(92, STATE.sentimentIndex + tmpl.impact));
    STATE.fearGreed = Math.max(5, Math.min(95, STATE.fearGreed + tmpl.impact * 0.4));

    const html = `<div class="news-item new-item">
      <div class="ni-header"><span class="ni-source">${tmpl.source}</span><span class="ni-time">${timeStr}</span></div>
      <div class="ni-text">${tmpl.text}</div>
      <div class="ni-impact" style="color:${isBull ? 'var(--emerald)' : 'var(--red)'}">Sentiment: ${isBull ? '+' : ''}${tmpl.impact}%</div>
    </div>`;
    STATE.newsFeed.unshift(html);
    if (STATE.newsFeed.length > 25) STATE.newsFeed.pop();

    const nf = document.getElementById('news-feed');
    if (nf) nf.innerHTML = STATE.newsFeed.join('');

    const needle = document.getElementById('sentiment-needle');
    if (needle) needle.style.left = STATE.sentimentIndex + '%';
    const pctLabel = document.getElementById('sentiment-pct-label');
    if (pctLabel) {
      pctLabel.textContent = STATE.sentimentIndex + '% ' + (STATE.sentimentIndex > 60 ? 'Bullish' : STATE.sentimentIndex < 40 ? 'Bearish' : 'Neutral');
      pctLabel.style.color = STATE.sentimentIndex > 60 ? 'var(--emerald)' : STATE.sentimentIndex < 40 ? 'var(--red)' : 'var(--amber)';
    }

    const src = ['src-twitter','src-reddit','src-news','src-chain'];
    const srcEl = document.getElementById(src[Math.floor(Math.random()*src.length)]);
    if (srcEl) {
      const curr = parseInt(srcEl.textContent) + (isBull ? 1 : -1) * Math.ceil(Math.random() * 3);
      srcEl.textContent = (curr >= 0 ? '+' : '') + curr;
      srcEl.className = 's-source-score ' + (curr >= 0 ? 'price-up' : 'price-down');
    }

    const syncEl = document.getElementById('sentiment-sync-time');
    if (syncEl) syncEl.textContent = 'Updated ' + timeStr;
    updateTopbar();
  }
}

// Pre-fill news
for (let i = NEWS_TEMPLATES.length - 1; i >= 0; i--) {
  const t = NEWS_TEMPLATES[i];
  const isBull = t.impact >= 0;
  const ts = new Date(Date.now() - i * 90000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  STATE.newsFeed.push(`<div class="news-item"><div class="ni-header"><span class="ni-source">${t.source}</span><span class="ni-time">${ts}</span></div><div class="ni-text">${t.text}</div><div class="ni-impact" style="color:${isBull ? 'var(--emerald)' : 'var(--red)'}">Impact: ${isBull ? '+' : ''}${t.impact}%</div></div>`);
}
document.getElementById('news-feed').innerHTML = STATE.newsFeed.join('');

// ============================================================
// ALPHA OPPORTUNITIES
// ============================================================
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

function generateAlpha(customAsset = null, forceAction = null) {
  const allKeys = Object.keys(STATE.assets).filter(k => !['SPY','QQQ','^DJI','^VIX','^IXIC'].includes(k));
  const key   = customAsset || allKeys[Math.floor(Math.random() * allKeys.length)];
  const asset = STATE.assets[key];
  if (!asset) return;
  const isBuy  = forceAction ? forceAction === 'BUY' : Math.random() > 0.42;
  const action = isBuy ? 'BUY' : 'SELL';
  const dec = asset.dec;
  const entry  = asset.currentPrice;
  const target = isBuy ? entry * (1 + 0.065 + Math.random() * 0.04) : entry * (1 - 0.055 - Math.random() * 0.03);
  const stop   = isBuy ? entry * (1 - 0.025 - Math.random() * 0.01) : entry * (1 + 0.025 + Math.random() * 0.01);
  const conf   = Math.round(68 + Math.random() * 28);
  const reasons = isBuy ? REASONS_BUY : REASONS_SELL;
  const reason  = reasons[Math.floor(Math.random() * reasons.length)];
  const rr = Math.abs(target - entry) / Math.abs(stop - entry);

  const opp = {
    time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    asset: asset.symbol, action, entry, target, stop, conf, reason,
    rr: rr.toFixed(1), dec
  };

  STATE.opportunities.unshift(opp);
  if (STATE.opportunities.length > 40) STATE.opportunities.pop();
  STATE.agentSignalCount.aegis++;
  if (Math.random() > 0.5) STATE.agentSignalCount.predictor++;
  updateAgentSignalCounts();
  renderOpportunities();
  updateAlphaBadge();
  sendTelegramAlert(opp);
  showToast({ type: isBuy ? 'alpha' : 'warning', icon: isBuy ? '🎯' : '⚠️', title: `${action} Signal — ${asset.symbol}`, msg: `${conf}% conf · Target $${target.toFixed(dec)} · R/R 1:${rr.toFixed(1)}` });
}

function updateAgentSignalCounts() {
  ['aegis','sentinel','vox','predictor'].forEach(k => {
    const el = document.getElementById('sigs-' + k);
    if (el) el.textContent = STATE.agentSignalCount[k];
  });
}

function renderOpportunities() {
  const list = STATE.oppFilter === 'buy'  ? STATE.opportunities.filter(o => o.action === 'BUY') :
               STATE.oppFilter === 'sell' ? STATE.opportunities.filter(o => o.action === 'SELL') :
               STATE.opportunities;

  let html = '';
  if (!list.length) {
    html = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No signals yet — agents are computing…</td></tr>`;
  } else {
    list.forEach((o, idx) => {
      const bc = o.action === 'BUY' ? 'ab-buy' : 'ab-sell';
      html += `<tr class="${idx === 0 ? 'new-row' : ''}">
        <td class="text-muted text-mono" style="font-size:0.7rem;">${o.time}</td>
        <td style="font-weight:700;color:var(--cyan);">${o.asset}</td>
        <td><span class="action-badge ${bc}">${o.action}</span></td>
        <td class="text-mono" style="font-weight:700;">$${o.target.toFixed(o.dec)}</td>
        <td class="text-mono" style="color:var(--red);">$${o.stop.toFixed(o.dec)}</td>
        <td>
          <div class="conf-bar-inline">
            <span style="font-weight:700;font-family:var(--font-mono);font-size:0.72rem;">${o.conf}%</span>
            <div class="conf-bar-inline-track"><div class="conf-bar-inline-fill" style="width:${o.conf}%"></div></div>
          </div>
        </td>
        <td style="color:var(--text-secondary);font-size:0.72rem;max-width:220px;">${o.reason}</td>
      </tr>`;
    });
  }
  document.getElementById('opp-tbody').innerHTML = html;
}

function updateAlphaBadge() {
  document.getElementById('alpha-count-badge').textContent = STATE.opportunities.length;
  document.getElementById('tb-alpha').textContent = STATE.opportunities.length + ' Active';
}

for (let i = 0; i < 6; i++) generateAlpha();

// ============================================================
// MULTI-AGENT TERMINAL
// ============================================================
const AGENT_LOGS = {
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
  ]
};

const terminalEl = document.getElementById('terminal-screen');

function appendTerminalLine(log) {
  const line = document.createElement('div');
  line.className = 't-line';
  line.innerHTML = `<span class="t-time">[${log.time}]</span><span class="t-agent ${log.agent}">${log.agent.toUpperCase()}</span><span class="t-msg">${log.msg}</span>`;
  terminalEl.appendChild(line);
  terminalEl.scrollTop = terminalEl.scrollHeight;
  while (terminalEl.childElementCount > 80) terminalEl.removeChild(terminalEl.firstChild);
}

function switchTerminal(agentKey) {
  STATE.activeAgent = agentKey;
  document.querySelectorAll('.agent-card').forEach(c => c.classList.toggle('active', c.dataset.agent === agentKey));
  document.getElementById('active-agent-label').textContent = agentKey.toUpperCase();
  terminalEl.innerHTML = '';
  STATE.agentLogs[agentKey].slice(-30).forEach(l => appendTerminalLine(l));
}

function streamAgentLogs() {
  if (!STATE.agentsRunning) return;
  Object.keys(AGENT_LOGS).forEach(k => {
    if (Math.random() < 0.28) {
      const timeStr = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const msgs = AGENT_LOGS[k];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      const log = { time: timeStr, agent: k, msg };
      STATE.agentLogs[k].push(log);
      if (STATE.agentLogs[k].length > 60) STATE.agentLogs[k].shift();
      const confEl = document.getElementById('conf-' + k);
      const barEl  = document.getElementById('bar-' + k);
      if (confEl) {
        let c = parseInt(confEl.textContent);
        c = Math.max(55, Math.min(97, c + (Math.random() > 0.5 ? 1 : -1)));
        confEl.textContent = c + '%';
        if (barEl) barEl.style.width = c + '%';
      }
      if (STATE.activeAgent === k) appendTerminalLine(log);
    }
  });
}

Object.keys(AGENT_LOGS).forEach(k => {
  for (let i = 0; i < 6; i++) {
    const ts = new Date(Date.now() - (6-i)*12000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    STATE.agentLogs[k].push({ time:ts, agent:k, msg: AGENT_LOGS[k][Math.floor(Math.random()*AGENT_LOGS[k].length)] });
  }
});
switchTerminal('aegis');

// ============================================================
// PREDICTORX CHAT
// ============================================================
const chatEl    = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

function sendChat(customText) {
  const q = customText || chatInput.value.trim();
  if (!q) return;
  if (!customText) chatInput.value = '';

  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.innerHTML = `<div class="msg-bubble">${q}</div><span class="msg-meta">You · just now</span>`;
  chatEl.appendChild(userMsg);
  chatEl.scrollTop = chatEl.scrollHeight;

  const typing = document.createElement('div');
  typing.className = 'msg agent';
  typing.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  chatEl.appendChild(typing);
  chatEl.scrollTop = chatEl.scrollHeight;

  setTimeout(() => {
    typing.remove();
    const asset = STATE.assets[STATE.activeAsset];
    const reply = buildForecastResponse(q, asset);
    const agentMsg = document.createElement('div');
    agentMsg.className = 'msg agent';
    agentMsg.innerHTML = `<div class="msg-bubble">${reply}</div><span class="msg-meta">PredictorX · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>`;
    chatEl.appendChild(agentMsg);
    chatEl.scrollTop = chatEl.scrollHeight;
  }, 800 + Math.random() * 600);
}

function buildForecastResponse(query, asset) {
  const { symbol, currentPrice:price, change, dec, history } = asset;
  const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  const n = history.length;
  const sma20 = n >= 20 ? (calcSMA(history, 20)[n-1] || price) : price;
  const bb = n >= 20 ? calcBB(history, 20, 2) : null;
  const bbU = bb ? (bb.upper[n-1] || price * 1.02) : price * 1.02;
  const bbL = bb ? (bb.lower[n-1] || price * 0.98) : price * 0.98;
  const rsi  = n >= 14 ? (calcRSI(history, 14)[n-1] || 52) : 52;
  const macd = n >= 26 ? calcMACD(history) : null;
  const macdLine = macd ? (macd.line[n-1] || 0) : 0;
  const macdSig  = macd ? (macd.signal[n-1] || 0) : 0;
  const conf = Math.round(72 + Math.random() * 22);
  const lq = query.toLowerCase();
  const src = asset.dataSource === 'live' ? '🟢 LIVE' : '🟡 SIMULATED';

  const code = `<div class="chat-code">// Live Snapshot — ${symbol} (${src})
Price   : $${price.toLocaleString()}  (${changeStr} 24h)
SMA_20  : $${sma20.toFixed(dec)}
RSI_14  : ${rsi.toFixed(2)} ${rsi > 70 ? '← Overbought ⚠️' : rsi < 30 ? '← Oversold 🎯' : '← Neutral'}
BB_Upper: $${bbU.toFixed(dec)}
BB_Lower: $${bbL.toFixed(dec)}
MACD    : ${macdLine >= 0 ? '+' : ''}${macdLine.toFixed(4)}
Signal  : ${macdSig.toFixed(4)}
Conf    : ${conf}%</div>`;

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
BB Width: ${((bbU-bbL)/price*100).toFixed(2)}% — ${(bbU-bbL)/price*100 < 2 ? 'volatility compression (breakout soon)' : 'normal volatility'}.<br>
Momentum: ${rsi > 60 ? 'Overbought — caution' : rsi < 40 ? 'Oversold — watch bounce' : 'Neutral'}.<br>
MACD: ${macdLine > macdSig ? 'Bullish crossover active' : 'Bearish signal present'}.`;
  }

  return body + '<br>' + code;
}

document.querySelectorAll('.quick-prompt-btn').forEach(btn => btn.addEventListener('click', () => sendChat(btn.dataset.q)));
document.getElementById('chat-send').addEventListener('click', () => sendChat());
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
document.getElementById('btn-clear-chat').addEventListener('click', () => {
  chatEl.innerHTML = '<div class="msg agent"><div class="msg-bubble">Chat cleared. Ready for new analysis queries.</div></div>';
});

// ============================================================
// TOAST SYSTEM
// ============================================================
function showToast({ type='info', icon='ℹ️', title, msg }) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<div class="toast-icon">${icon}</div>
    <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>
    <div class="toast-progress"></div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 4500);
}

// ============================================================
// TELEGRAM
// ============================================================
function sendTelegramAlert(opp) {
  if (localStorage.getItem('tg-enable') !== 'true') return;
  const token  = localStorage.getItem('tg-bot-token');
  const chatId = localStorage.getItem('tg-chat-id');
  if (!token || !chatId) return;

  const emoji = opp.action === 'BUY' ? '🟢' : '🔴';
  const text = `${emoji} *Aegis Quantum Alpha Signal*\n\n`
    + `*Asset:* ${opp.asset}\n*Signal:* ${opp.action}\n`
    + `*Target:* $${opp.target.toFixed(opp.dec)}\n*Stop:* $${opp.stop.toFixed(opp.dec)}\n`
    + `*R/R:* 1:${opp.rr}\n*Confidence:* ${opp.conf}%\n`
    + `*Reason:* ${opp.reason}\n\nCc: @yashbaing\n_${new Date().toLocaleString()}_`;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id:chatId, text, parse_mode:'Markdown' })
  }).catch(e => console.error('Telegram send failed:', e));
}

function initTelegramModal() {
  const tokenIn  = document.getElementById('tg-bot-token');
  const chatIdIn = document.getElementById('tg-chat-id');
  const enableCb = document.getElementById('tg-enable');
  const saveBtn  = document.getElementById('btn-tg-save');
  const testBtn  = document.getElementById('btn-tg-test');
  const guide    = document.getElementById('tg-guide');
  const guideBtn = document.getElementById('btn-tg-guide');
  const pill     = document.getElementById('tg-sidebar-pill');
  const pillLabel= document.getElementById('tg-pill-label');
  const dot      = document.getElementById('tg-topbar-dot');

  tokenIn.value  = localStorage.getItem('tg-bot-token') || '';
  chatIdIn.value = localStorage.getItem('tg-chat-id')   || '';
  enableCb.checked = localStorage.getItem('tg-enable') === 'true';

  function refreshTgUI() {
    const on = localStorage.getItem('tg-enable') === 'true';
    pill.className = 'tg-status-pill ' + (on ? 'on' : 'off');
    pillLabel.textContent = on ? '✅ Telegram On' : 'Telegram Off';
    if (dot) dot.style.display = on ? 'block' : 'none';
  }
  refreshTgUI();

  guideBtn?.addEventListener('click', () => guide?.classList.toggle('open'));

  saveBtn.addEventListener('click', () => {
    localStorage.setItem('tg-bot-token', tokenIn.value.trim());
    localStorage.setItem('tg-chat-id',   chatIdIn.value.trim());
    localStorage.setItem('tg-enable',    enableCb.checked ? 'true' : 'false');
    document.getElementById('tg-modal').classList.remove('open');
    refreshTgUI();
    showToast({ type:'info', icon:'✈️', title:'Telegram Configured', msg: enableCb.checked ? 'Alerts active! You\'ll receive alpha signals.' : 'Alerts disabled.' });
  });

  testBtn.addEventListener('click', () => {
    const t = tokenIn.value.trim(), c = chatIdIn.value.trim();
    if (!t || !c) { showToast({ type:'error', icon:'❌', title:'Missing credentials', msg:'Enter Bot Token and Chat ID first.' }); return; }
    testBtn.textContent = 'Sending…'; testBtn.disabled = true;
    fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id:c, text:`⚡ *Aegis Quantum — Connection Test*\n\nYour Telegram integration is working! Alpha signals will arrive here.\n\n@yashbaing · ${new Date().toLocaleString()}`, parse_mode:'Markdown' })
    }).then(r => r.json()).then(d => {
      testBtn.textContent = 'Send Test'; testBtn.disabled = false;
      if (d.ok) showToast({ type:'alpha', icon:'✅', title:'Test message sent!', msg:'Check your Telegram.' });
      else showToast({ type:'error', icon:'❌', title:'Telegram API error', msg: d.description });
    }).catch(e => {
      testBtn.textContent = 'Send Test'; testBtn.disabled = false;
      showToast({ type:'error', icon:'❌', title:'Network error', msg: e.message });
    });
  });

  document.getElementById('btn-tg-config-opp')?.addEventListener('click', () => document.getElementById('tg-modal').classList.add('open'));
  document.getElementById('tg-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
}

// ============================================================
// ASSET SELECTION
// ============================================================
function selectAsset(key, type) {
  const asset = STATE.assets[key];
  if (!asset) return;

  document.querySelectorAll('.asset-item').forEach(el => el.classList.remove('active'));
  const sidebarItem = document.querySelector(`.asset-item[data-asset="${key}"]`);
  if (sidebarItem) sidebarItem.classList.add('active');

  STATE.activeAsset     = key;
  STATE.activeAssetType = type || asset.type;

  document.getElementById('hero-name').textContent  = key;
  document.getElementById('hero-price').textContent = '$' + asset.currentPrice.toLocaleString();
  document.getElementById('hero-type').textContent  = ({
    perp:'Perpetual Contract', dex:'DEX Liquidity Pool', cex:'CEX Spot Market', stock:'Equity', index:'Market Index'
  })[asset.type] || asset.type;

  const heroEl = document.getElementById('hero-icon');
  if (heroEl) heroEl.textContent = asset.display || asset.symbol[0];

  document.getElementById('chart-card-title').textContent = key + ' — Price Action';

  if (asset.type === 'dex') setMarketView('dex');
  else setMarketView('cex');

  const ts = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const log = { time:ts, agent:'aegis', msg:`Asset switched to ${key}. Fetching ${asset.dataSource === 'live' ? 'live' : 'simulated'} chart data.` };
  STATE.agentLogs.aegis.push(log);
  if (STATE.activeAgent === 'aegis') appendTerminalLine(log);

  updateTopbar(); updateFooterBar(); generateCEXOrderbook();

  // Fetch real chart data
  const isCrypto = ['perp','dex','cex'].includes(asset.type);
  if (isCrypto) {
    fetchBinanceKlines(key, STATE.activeTimeframe).then(ok => {
      if (ok) drawChart();
      else { buildSimulatedHistory(asset); drawChart(); }
    });
  } else if (['stock','index'].includes(asset.type)) {
    fetchStockKlines(key, STATE.activeTimeframe).then(ok => {
      if (ok) drawChart();
      else { buildSimulatedHistory(asset); drawChart(); }
    });
  } else {
    buildSimulatedHistory(asset);
    drawChart();
  }
}

function setupAssetNavigation() {
  document.getElementById('asset-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.asset-item').forEach(item => {
      item.style.display = (item.dataset.asset || '').toLowerCase().includes(q) ? '' : 'none';
    });
  });

  document.querySelectorAll('.asset-item').forEach(item => {
    item.addEventListener('click', () => selectAsset(item.dataset.asset, item.dataset.type));
  });
}

// ============================================================
// MARKET VIEW (CEX/DEX tabs)
// ============================================================
function setMarketView(v) {
  STATE.marketView = v;
  const isCex = v === 'cex';
  document.getElementById('btn-ob-cex').classList.toggle('active', isCex);
  document.getElementById('btn-ob-dex').classList.toggle('active', !isCex);
  document.getElementById('cex-ob-panel').style.display = isCex ? 'flex' : 'none';
  document.getElementById('dex-ob-panel').style.display = isCex ? 'none'  : 'flex';
  document.getElementById('ob-card-title').textContent = isCex ? 'Order Book (CEX Depth)' : 'DEX Swap Feed';
  if (!isCex) document.getElementById('dex-trades-stream').innerHTML = STATE.dexTrades.join('');
}

document.getElementById('btn-ob-cex').addEventListener('click', () => setMarketView('cex'));
document.getElementById('btn-ob-dex').addEventListener('click', () => setMarketView('dex'));

// ============================================================
// CONTROLS
// ============================================================
document.querySelectorAll('.ind-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const ind = btn.dataset.ind;
    STATE.indicators[ind] = !STATE.indicators[ind];
    btn.classList.toggle('active', STATE.indicators[ind]);
    drawChart();
  });
});

document.querySelectorAll('.timeframe-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.activeTimeframe = btn.dataset.tf;
    // Re-fetch chart data for new timeframe
    const asset = STATE.assets[STATE.activeAsset];
    const isCrypto = ['perp','dex','cex'].includes(asset?.type);
    if (isCrypto) {
      fetchBinanceKlines(STATE.activeAsset, STATE.activeTimeframe).then(ok => {
        if (!ok) { buildSimulatedHistory(asset); drawChart(); }
        else drawChart();
      });
    } else {
      fetchStockKlines(STATE.activeAsset, STATE.activeTimeframe).then(ok => {
        if (!ok) { buildSimulatedHistory(asset); drawChart(); }
        else drawChart();
      });
    }
  });
});

document.querySelectorAll('.agent-card').forEach(card => {
  card.addEventListener('click', () => switchTerminal(card.dataset.agent));
});

function toggleAgents(running) {
  STATE.agentsRunning = running;
  const pauseBtn = document.getElementById('btn-agents-toggle');
  const pauseTopBtn = document.getElementById('btn-pause-agents');
  pauseBtn.textContent = running ? 'Pause All' : 'Resume All';
  pauseBtn.classList.toggle('active', running);
  ['aegis','sentinel','vox','predictor'].forEach(k => {
    const el = document.getElementById('status-' + k);
    if (el) { el.textContent = running ? '● Active' : '⏸ Paused'; el.className = 'ac-status ' + (running ? 'on' : 'off'); }
  });
  if (pauseTopBtn) pauseTopBtn.textContent = running ? '⏸' : '▶';
  showToast({ type:'info', icon:running ? '▶️' : '⏸️', title:running ? 'Agents Resumed' : 'Agents Paused', msg: running ? 'All 4 AI agents are now active.' : 'All agents paused.' });
}

document.getElementById('btn-agents-toggle').addEventListener('click', () => toggleAgents(!STATE.agentsRunning));
document.getElementById('btn-pause-agents').addEventListener('click', () => toggleAgents(!STATE.agentsRunning));

['f-all','f-buy','f-sell'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    document.querySelectorAll('#opp-wrap .pill-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    STATE.oppFilter = {'f-all':'all','f-buy':'buy','f-sell':'sell'}[id];
    renderOpportunities();
  });
});

// ============================================================
// ET CLOCK (live)
// ============================================================
function updateETClock() {
  const now = new Date();
  const etStr = now.toLocaleTimeString('en-US', { timeZone:'America/New_York', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const clockEl = document.getElementById('mkt-et-clock');
  if (clockEl) clockEl.textContent = `🕐 ${etStr} ET`;
}

// ============================================================
// INIT
// ============================================================
async function init() {
  resizeCanvas();
  drawChart();
  generateCEXOrderbook();
  updateSidebarPrices();
  updateTopbar();
  updateFooterBar();
  setupAssetNavigation();
  initTelegramModal();
  updateMarketStatusUI();
  updateETClock();
  renderIndicesStrip();
  renderStocksSection();
  updateDataSourceBadge();

  // Pre-fill DEX trades
  for (let i = 0; i < 18; i++) createDEXTrade();

  // Fetch real Binance candles for the default asset
  const defaultOk = await fetchBinanceKlines('BTC-PERP', '15m');
  if (defaultOk) drawChart();

  // Connect Binance WebSocket for real-time crypto
  initBinanceWebSocket();

  // Fetch real stock data (with market hours awareness)
  await fetchAllStockData();

  // Recurring intervals
  setInterval(tickSimulatedCrypto,  900);   // only runs when Binance WS is down
  setInterval(streamAgentLogs,      1600);
  setInterval(createDEXTrade,       2200);
  setInterval(tickSentiment,        3800);
  setInterval(generateCEXOrderbook, 1200);
  setInterval(updateETClock,        1000);  // live ET clock
  setInterval(updateMarketStatusUI, 30000); // market status refresh
  setInterval(() => {
    fetchAllStockData(); // refresh stocks every 30s (Yahoo Finance respects market hours)
    renderStocksSection();
    renderIndicesStrip();
  }, 30000);
  setInterval(() => {
    if (STATE.agentsRunning && Math.random() < 0.75) generateAlpha();
  }, 16000);

  // Startup toast
  setTimeout(() => showToast({ type:'info', icon:'⚡', title:'Aegis Quantum v3.0', msg:'Connecting to Binance & Yahoo Finance for live data…' }), 800);
}

window.addEventListener('load', init);
window.addEventListener('resize', () => { resizeCanvas(); drawChart(); });
