import React, { useState, useRef, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function SolanaPaymentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [balance, setBalance] = useState(null);
  const messagesEndRef = useRef(null);

  // Live on-chain wallet balance tracker
  useEffect(() => {
    const fetchBalance = async () => {
      if (window.solana && window.solana.isPhantom) {
        try {
          const resp = await window.solana.connect({ onlyIfTrusted: true });
          const connection = new Connection('https://api.devnet.solana.com');
          const bal = await connection.getBalance(resp.publicKey);
          setBalance((bal / LAMPORTS_PER_SOL).toFixed(4));
        } catch {}
      }
    };
    fetchBalance();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeSolanaTransaction = async (amount, recipient) => {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error("Phantom wallet not detected!");
    }
    const resp = await window.solana.connect();
    const senderPubKey = resp.publicKey;
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPubKey,
        toPubkey: new PublicKey(recipient),
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );

    transaction.feePayer = senderPubKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const { signature } = await window.solana.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature, "confirmed");

    // Re-query balance live to instantly reflect updates on the UI
    const newBal = await connection.getBalance(senderPubKey);
    setBalance((newBal / LAMPORTS_PER_SOL).toFixed(4));

    return signature;
  };

  const parseWithGemini = async (userText) => {
    try {
      const response = await fetch('http://localhost:3000/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userText, apiKey: GEMINI_API_KEY }),
      });
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const getConversionRate = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=ngn');
      const data = await response.json();
      return data.solana.ngn || 410000;
    } catch {
      return 410000;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input.trim();
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: currentInput }]);
    setInput('');
    setLoading(true);

    if (currentInput.toLowerCase() === 'confirm') {
      const pendingTxMessage = [...messages].reverse().find((m) => m.transactionData);
      if (pendingTxMessage) {
        try {
          setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: '⏳ Initializing Phantom wallet... Please approve the transaction.' }]);
          const { amount, recipient, nairaAmount } = pendingTxMessage.transactionData;
          const txHash = await executeSolanaTransaction(amount, recipient);
          const rate = await getConversionRate();
          const gasFeeSOL = 0.00025;
          const gasFeeNaira = (gasFeeSOL * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });
          const totalSOL = (parseFloat(amount) + gasFeeSOL).toFixed(8);
          const totalNaira = ((parseFloat(amount) + gasFeeSOL) * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });

          const receipt = `🧾 OFFICIAL DIGITAL RECEIPT\n━━━━━━━━━━━━━━━━━━━━\n🆔 TX: ${txHash.slice(0, 8)}...${txHash.slice(-8)}\n👤 To: ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n\nITEMIZED EXPENSES:\n🔹 Sent: ${amount} SOL (≈ ₦${nairaAmount})\n⛽ Gas Fee: ${gasFeeSOL} SOL (≈ ₦${gasFeeNaira})\n\n🏆 TOTAL: ${totalSOL} SOL\n🇳🇬 FIAT: ₦${totalNaira}\n━━━━━━━━━━━━━━━━━━━━\n✅ On-Chain Confirmed`;

          setMessages((prev) => [...prev, { id: Date.now() + 2, type: 'bot', text: receipt }]);
          setReceipts((prev) => [{ id: Date.now(), txHash, amount, totalSOL, totalNaira, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
        } catch (error) {
          setMessages((prev) => [...prev, { id: Date.now() + 2, type: 'bot', text: `❌ Failed: ${error.message}` }]);
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    if (currentInput.toLowerCase() === 'cancel') {
      setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: '❌ Transaction canceled.' }]);
      setLoading(false);
      return;
    }

    let parsed;
    try {
      const res = await parseWithGemini(currentInput);
      if (res && !res.error && res.amount && res.recipient) {
        parsed = res;
      } else {
        throw new Error("Gemini rate limit hit, using fallback");
      }
    } catch (error) {
      // EMERGENCY HACKATHON FALLBACK REGEX PARSER
      const match = currentInput.match(/send\s+([\d.]+)\s+sol\s+to\s+([a-zA-Z0-9]{32,44})/i);
      if (match) {
        parsed = { amount: parseFloat(match[1]), recipient: match[2] };
      } else {
        setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: "❌ Please type: 'send [amount] SOL to [wallet]'" }]);
        setLoading(false);
        return;
      }
    }

    const { amount, recipient } = parsed;

    try {
      const rate = await getConversionRate();
      const nairaAmount = (amount * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });
      const gasFee = 0.00025;
      const total = (amount + gasFee).toFixed(8);

      const summary = `📊 TRANSACTION SUMMARY\n━━━━━━━━━━━━━━━━━━━━\n💰 Amount: ${amount} SOL (≈ ₦${nairaAmount})\n👤 Recipient: ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n⛽ Gas Fee: ${gasFee} SOL\n💳 Total: ${total} SOL\n━━━━━━━━━━━━━━━━━━━━\nReply "confirm" to authorize or "cancel" to abort.`;

      setMessages((prev) => [...prev, { id: Date.now() + 2, type: 'bot', text: summary, transactionData: { amount, recipient, gasFee, total, nairaAmount } }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#070507', 
      color: '#fff', 
      fontFamily: 'sans-serif', 
      overflow: 'hidden', 
      display: 'flex', 
      boxSizing: 'border-box' 
    }}>

      {/* Slimmed, Bounded Sidebar Log Panel */}
      <div style={{ 
        width: '180px', 
        minWidth: '180px', 
        maxWidth: '180px', 
        backgroundColor: '#0d080b', 
        borderRight: '1px solid #221219', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '20px 14px', 
        overflow: 'hidden', 
        boxSizing: 'border-box' 
      }}>
        <div style={{ ...{ marginBottom: '14px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff2a6d', flexShrink: 0 }}></div>
            <span style={{ fontWeight: '800', fontSize: '10px', color: '#f1f5f9', letterSpacing: '0.5px' }}>RUBY LOG</span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#64748b' }}>Resets on refresh</p>
        </div>

        {balance !== null && (
          <div style={{ marginBottom: '14px', padding: '10px 8px', backgroundColor: '#160d12', borderRadius: '8px', border: '1px solid #3a1a26', boxSizing: 'border-box' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>Connected Wallet</p>
            <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '700', color: '#14F195' }}>{balance} SOL</p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {receipts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontSize: '10px', marginTop: '20px', fontStyle: 'italic' }}>No transactions yet.</p>
          ) : (
            receipts.map((rcpt) => (
              <a key={rcpt.id} href={`https://explorer.solana.com/tx/${rcpt.txHash}?cluster=devnet`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px', borderRadius: '8px', backgroundColor: '#160d12', border: '1px solid #3a1a26', textDecoration: 'none', color: 'inherit', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#ff2a6d' }}>Sent {rcpt.amount} SOL</div>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>₦{rcpt.totalNaira}</div>
                <div style={{ fontSize: '8px', color: '#475569', textAlign: 'right' }}>{rcpt.timestamp}</div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Main Protected Workspace with Explicit Paddings */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: messages.length === 0 ? 'center' : 'space-between', 
        padding: '40px 40px 48px 40px', 
        overflow: 'hidden', 
        minWidth: 0, 
        boxSizing: 'border-box' 
      }}>

        {/* Scrollable Conversation Stream */}
        {messages.length > 0 && (
          <div style={{ width: '100%', maxWidth: '640px', flex: 1, overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: '16px', maxWidth: '85%', backgroundColor: msg.type === 'user' ? '#27121a' : 'rgba(39,18,26,0.4)', color: '#f1f5f9', border: msg.type === 'user' ? '1px solid #4c1d2f' : '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', fontFamily: msg.text.includes('━━') ? 'monospace' : 'inherit' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: '#886473', fontSize: '13px', fontStyle: 'italic', paddingLeft: '6px' }}>⏳ Processing natural language intent...</div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Brand Anchor + Input Stack */}
        <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
          
          <div style={{ textAlign: 'center', marginBottom: messages.length === 0 ? '24px' : '16px', width: '100%' }}>
            <h1 style={{ margin: '0 0 6px 0', fontSize: messages.length === 0 ? '32px' : '20px', fontWeight: '700', background: 'linear-gradient(45deg, #ff2a6d, #14F195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transition: 'font-size 0.3s' }}>
              Welcome to Ruby
            </h1>
            {messages.length === 0 && (
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>A natural language interface for Solana payments.</p>
            )}
          </div>

          {/* Secure Pill Input Bar */}
          <form onSubmit={handleSendMessage} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', height: '52px', boxSizing: 'border-box', padding: 0, margin: 0 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Send 0.5 SOL to [wallet]"'
              style={{ 
                width: '100%', 
                height: '100%',
                padding: '0 110px 0 20px', 
                borderRadius: '30px', 
                border: '1px solid #3a1a26', 
                backgroundColor: '#0d080b', 
                color: '#fff', 
                fontSize: '14px', 
                outline: 'none', 
                boxSizing: 'border-box',
                display: 'block'
              }}
              disabled={loading}
              onFocus={(e) => { e.target.style.borderColor = '#ff2a6d'; }}
              onBlur={(e) => { e.target.style.borderColor = '#3a1a26'; }}
            />
            <button 
              type="submit" 
              style={{ 
                position: 'absolute', 
                right: '6px', 
                top: '6px',
                width: '90px', 
                height: '40px', 
                padding: 0,
                margin: 0,
                background: 'linear-gradient(135deg, #ff2a6d, #9a0f3e)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '20px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box'
              }} 
              disabled={loading}
            >
              {loading ? '...' : 'Send'}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}