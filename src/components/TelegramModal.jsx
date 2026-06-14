import React, { useState, useEffect } from 'react';

export default function TelegramModal({ isOpen, onClose, onSaveConfig }) {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enable, setEnable] = useState(false);
  const [detectStatus, setDetectStatus] = useState({ show: false, msg: '', type: 'info' });
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setBotToken(localStorage.getItem('tg-bot-token') || '');
    setChatId(localStorage.getItem('tg-chat-id') || '');
    setEnable(localStorage.getItem('tg-enable') === 'true');
  }, [isOpen]);

  const handleChatIdChange = (val) => {
    setChatId(val);
    setShowWarning(val.trim().startsWith('@'));
  };

  const handleDetectChatId = async () => {
    const token = botToken.trim();
    if (!token) {
      setDetectStatus({ show: true, msg: '⚠️ Enter your Bot Token first (Step 1).', type: 'error' });
      return;
    }
    setIsDetecting(true);
    setDetectStatus({ show: true, msg: '⏳ Checking for messages sent to your bot…', type: 'info' });

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10&allowed_updates=message`);
      const data = await res.json();

      if (!data.ok) {
        setDetectStatus({ show: true, msg: `❌ Bad token: ${data.description}`, type: 'error' });
        setIsDetecting(false);
        return;
      }

      const updates = data.result || [];
      if (!updates.length) {
        setDetectStatus({ show: true, msg: '⚠️ No messages found. Open Telegram → find your bot → tap START, then click Detect again.', type: 'error' });
        setIsDetecting(false);
        return;
      }

      const lastUpdate = updates[updates.length - 1];
      const detectedId = (lastUpdate.message?.chat?.id || lastUpdate.channel_post?.chat?.id || '').toString();
      const firstName = lastUpdate.message?.from?.first_name || 'You';

      if (!detectedId) {
        setDetectStatus({ show: true, msg: '⚠️ Could not extract chat ID from update. Send /start to your bot and try again.', type: 'error' });
      } else {
        setChatId(detectedId);
        setShowWarning(detectedId.startsWith('@'));
        setDetectStatus({ show: true, msg: `✅ Chat ID detected: ${detectedId} (${firstName}) — auto-filled below!`, type: 'ok' });
      }
    } catch (e) {
      setDetectStatus({ show: true, msg: `❌ Network error: ${e.message}. Check your internet or disable adblocker.`, type: 'error' });
    }
    setIsDetecting(false);
  };

  const handleSendTest = async () => {
    const token = botToken.trim();
    const chat = chatId.trim();
    if (!token || !chat) {
      alert('Please fill in bot token and chat ID before testing.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          parse_mode: 'HTML',
          text: `⚡ <b>Aegis Quantum — Connection Test ✅</b>\n\nYour Telegram integration is working correctly!\n\nAlpha signals and market insights will now be delivered here automatically.\n\n<i>${new Date().toLocaleString()}</i>`
        })
      });
      const d = await res.json();
      if (d.ok) {
        setDetectStatus({ show: true, msg: '✅ Test message delivered successfully! Check your Telegram.', type: 'ok' });
      } else {
        let hint = d.description || 'Unknown error';
        if (hint.includes('chat not found')) {
          hint = 'Chat not found. Make sure you sent /start to your bot in Telegram first!';
        } else if (hint.includes('Unauthorized')) {
          hint = 'Invalid Bot Token. Double-check the token from @BotFather.';
        }
        setDetectStatus({ show: true, msg: `❌ ${hint}`, type: 'error' });
      }
    } catch (e) {
      setDetectStatus({ show: true, msg: `❌ Network error: ${e.message}`, type: 'error' });
    }
    setIsTesting(false);
  };

  const handleSave = () => {
    const token = botToken.trim();
    const chat = chatId.trim();
    if (!token || !chat) {
      alert('Bot Token and Chat ID are required to save.');
      return;
    }
    localStorage.setItem('tg-bot-token', token);
    localStorage.setItem('tg-chat-id', chat);
    localStorage.setItem('tg-enable', enable ? 'true' : 'false');
    onSaveConfig(enable, token, chat);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: '520px' }}>
        <button onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

        <div className="modal-title"><span>✈️</span> Telegram Alert Setup</div>
        <div className="modal-sub">Get live alpha signals sent directly to your Telegram — follow the steps below</div>

        {/* STEP 1 */}
        <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 'var(--r-lg)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Step 1 — Create Your Bot
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Open Telegram → search <strong style={{ color: 'var(--text-primary)' }}>@BotFather</strong> → send <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>/newbot</code> → follow prompts → copy the <strong style={{ color: 'var(--cyan)' }}>Bot Token</strong> it gives you.
          </p>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">Bot Token</label>
            <input
              className="form-input"
              type="password"
              placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
        </div>

        {/* STEP 2 */}
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--r-lg)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
            Step 2 — Get Your Chat ID (Auto-Detect)
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            First, <strong style={{ color: 'var(--text-primary)' }}>open Telegram → search your new bot → click START</strong>. Then click the button below to auto-detect your Chat ID:
          </p>
          <button
            className="btn-secondary"
            style={{ width: '100%', marginBottom: '0.75rem' }}
            onClick={handleDetectChatId}
            disabled={isDetecting}
          >
            {isDetecting ? '🔍 Auto-Detecting...' : '🔍 Auto-Detect My Chat ID'}
          </button>
          
          {detectStatus.show && (
            <div style={{
              display: 'block',
              fontSize: '0.72rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--r-md)',
              marginBottom: '0.75rem',
              background: detectStatus.type === 'ok' ? 'rgba(16,185,129,0.12)' : detectStatus.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(6,182,212,0.12)',
              border: detectStatus.type === 'ok' ? '1px solid rgba(16,185,129,0.3)' : detectStatus.type === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(6,182,212,0.3)',
              color: detectStatus.type === 'ok' ? 'var(--emerald)' : detectStatus.type === 'error' ? 'var(--red)' : 'var(--cyan)'
            }}>
              {detectStatus.msg}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Chat ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-filled above, or enter manually)</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="Will be auto-filled…"
              value={chatId}
              onChange={(e) => handleChatIdChange(e.target.value)}
            />
            {showWarning && (
              <div style={{ color: 'var(--red)', fontSize: '0.68rem', fontWeight: 700, marginTop: '0.35rem' }}>
                ⚠️ Enter the numeric ID (e.g. 987654321), NOT your @username.
              </div>
            )}
          </div>
        </div>

        {/* TOGGLE */}
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Enable Live Alerts</div>
            <div className="toggle-desc">Push every new alpha opportunity to Telegram</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={enable} onChange={(e) => setEnable(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
        </div>

        {/* ACTIONS */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={handleSendTest} disabled={isTesting}>
            {isTesting ? 'Sending...' : '📨 Send Test'}
          </button>
          <button className="btn-primary" onClick={handleSave}>✅ Save &amp; Enable</button>
        </div>
      </div>
    </div>
  );
}
