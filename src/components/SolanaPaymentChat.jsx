import React, { useState, useRef, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function SolanaPaymentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]); // Persistent sidebar session state
  const messagesEndRef = useRef(null);

  const [balance, setBalance] = useState(0);
const connection = new Connection('https://api.devnet.solana.com');

useEffect(() => {
  if (publicKey) {
    connection.getBalance(publicKey).then(b => setBalance(b / 1e9));
  }
}, [publicKey]);

// In your header, add:
<p style={{ margin: '4px 0 0', fontSize: '12px', color: '#aaa' }}>
  Balance: {balance.toFixed(4)} SOL
</p>

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeSolanaTransaction = async (amount, recipient) => {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error("Phantom wallet extension not detected! Please install and unlock it.");
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
      console.error('Parse error:', error);
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
          setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: '⏳ Initializing Phantom wallet... Please approve the transaction window.' }]);
          
          const { amount, recipient, nairaAmount } = pendingTxMessage.transactionData;
          const txHash = await executeSolanaTransaction(amount, recipient);
          
          const rate = await getConversionRate();
          const gasFeeSOL = 0.00025;
          const gasFeeNaira = (gasFeeSOL * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });
          const totalSOL = (parseFloat(amount) + gasFeeSOL).toFixed(8);
          const totalNaira = ((parseFloat(amount) + gasFeeSOL) * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });

          const detailedReceiptText = `🧾 OFFICIAL DIGITAL RECEIPT\n━━━━━━━━━━━━━━━━━━━━\n🆔 TX: ${txHash.slice(0, 8)}...${txHash.slice(-8)}\n👤 To: ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n\nITEMIZED EXPENSES (SOL & NGN):\n🔹 Sent: ${amount} SOL (≈ ₦${nairaAmount})\n⛽ Gas Fee: ${gasFeeSOL} SOL (≈ ₦${gasFeeNaira})\n\n🏆 GRAND TOTAL: ${totalSOL} SOL\n🇳🇬 FIAT EQUIV: ₦${totalNaira}\n━━━━━━━━━━━━━━━━━━━━\nStatus: On-Chain Confirmed ✅`;

          setMessages((prev) => [...prev, {
            id: Date.now() + 2,
            type: 'bot',
            text: detailedReceiptText,
          }]);

          // Save transaction node info to sidebar ledger list
          setReceipts((prev) => [
            {
              id: Date.now(),
              txHash,
              amount,
              totalSOL,
              totalNaira,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev,
          ]);

        } catch (error) {
          setMessages((prev) => [...prev, { id: Date.now() + 2, type: 'bot', text: `❌ Execution Failed: ${error.message}` }]);
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    if (currentInput.toLowerCase() === 'cancel') {
      setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: '❌ Transaction sequence canceled.' }]);
      setLoading(false);
      return;
    }

    try {
      const parsed = await parseWithGemini(currentInput);
      if (parsed.error) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: `❌ ${parsed.error}` }]);
        setLoading(false);
        return;
      }

      const { amount, recipient } = parsed;
      if (!amount || !recipient) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: "🔍 Couldn't extract structural data. Try standard formats." }]);
        setLoading(false);
        return;
      }

      const rate = await getConversionRate();
      const nairaAmount = (amount * rate).toLocaleString('en-NG', { maximumFractionDigits: 2 });
      const gasFee = 0.00025;
      const total = (amount + gasFee).toFixed(8);

      const summary = `📊 TRANSACTION SUMMARY\n━━━━━━━━━━━━━━━━━━━━\n💰 Amount: ${amount} SOL (≈ ₦${nairaAmount})\n👤 Recipient: ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n⛽ Gas Fee: ${gasFee} SOL\n💳 Total: ${total} SOL\n━━━━━━━━━━━━━━━━━━━━\nReply "confirm" to authorize or "cancel" to abort.`;

      setMessages((prev) => [...prev, {
        id: Date.now() + 2,
        type: 'bot',
        text: summary,
        transactionData: { amount, recipient, gasFee, total, nairaAmount },
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, type: 'bot', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#070507', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Left Sidebar: Session Receipts Ledger */}
      <div style={{ 
        width: '280px', 
        backgroundColor: '#0d080b', 
        borderRight: '1px solid #221219', 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '24px 16px' 
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff2a6d', boxShadow: '0 0 10px #ff2a6d' }}></div>
            <span style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '14px', color: '#f1f5f9' }}>RUBY ACTIVITY LOG</span>
          </div>
          <p style={{ margin: '4px 0 0 18px', fontSize: '11px', color: '#64748b' }}>Resets on page refresh</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {receipts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '40px', fontStyle: 'italic' }}>
              No transactions recorded yet.
            </div>
          ) : (
            receipts.map((rcpt) => (
              <a 
                key={rcpt.id}
                href={`https://explorer.solana.com/tx/${rcpt.txHash}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  backgroundColor: '#160d12', 
                  border: '1px solid #3a1a26', 
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#ff2a6d' }}>
                  <span>Sent {rcpt.amount} SOL</span>
                  <span style={{ color: '#64748b', fontWeight: '400' }}>{rcpt.timestamp}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total: ₦{rcpt.totalNaira}</div>
                <div style={{ fontSize: '10px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🔗 {rcpt.txHash}
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Main Conversational Workspace */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: messages.length === 0 ? 'center' : 'space-between',
        padding: '30px 20px 40px 20px',
        position: 'relative'
      }}>
        
        {/* Scrollable Conversation Stream */}
        {messages.length > 0 && (
          <div style={{ 
            width: '100%', 
            maxWidth: '700px', 
            flex: 1, 
            overflowY: 'auto', 
            marginBottom: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px',
            paddingRight: '6px'
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  padding: '14px 20px',
                  borderRadius: '20px',
                  maxWidth: '85%',
                  backgroundColor: msg.type === 'user' ? '#27121a' : 'rgba(39, 18, 26, 0.4)',
                  color: '#f1f5f9',
                  border: msg.type === 'user' ? '1px solid #4c1d2f' : '1px solid rgba(255,255,255,0.05)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '15px',
                  fontFamily: msg.text.includes('━━') ? 'monospace' : 'inherit',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ color: '#886473', fontSize: '14px', fontStyle: 'italic', paddingLeft: '8px' }}>
                  ⏳ Processing natural language intent...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Unified Input + Brand Stack Wrapper */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          width: '100%', 
          maxWidth: '700px',
          marginTop: messages.length === 0 ? '0' : 'auto'
        }}>
          
          {/* Welcome Text Block Header (Transitions naturally based on system state) */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: messages.length === 0 ? '28px' : '16px',
            width: '100%'
          }}>
            <h1 style={{ 
              margin: '0 0 6px 0', 
              fontSize: messages.length === 0 ? '36px' : '20px', 
              fontWeight: '700', 
              letterSpacing: '-0.5px',
              background: 'linear-gradient(45deg, #ff2a6d, #14F195)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'font-size 0.2s'
            }}>
              Welcome to Ruby
            </h1>
            {messages.length === 0 && (
              <p style={{ margin: 0, fontSize: '15px', color: '#94a3b8', fontWeight: '500' }}>
                A natural language facet derived from Gemini, settling intents directly on Solana.
              </p>
            )}
          </div>

          {/* Pill-Shaped Input Wrapper with absolute positioning button */}
          <form onSubmit={handleSendMessage} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send 0.5 SOL to wallet"
              style={{ 
                width: '100%', 
                padding: '18px 120px 18px 24px', 
                borderRadius: '30px', 
                border: '1px solid #3a1a26', 
                backgroundColor: '#0d080b', 
                color: '#fff', 
                fontSize: '16px',
                outline: 'none',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s',
              }}
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = '#ff2a6d';
                e.target.style.boxShadow = '0 0 20px rgba(255, 42, 109, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#3a1a26';
                e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
              }}
            />
            
            <button
              type="submit"
              style={{ 
                position: 'absolute',
                right: '8px',
                padding: '10px 24px', 
                background: 'linear-gradient(135deg, #ff2a6d 0%, #9a0f3e 100%)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '20px', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(255, 42, 109, 0.3)',
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