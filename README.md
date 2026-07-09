# SolaTrike (with Ruby AI Interface) 🚲🔮

A web-based payment portal designed for utility and transport ticketing, utilizing a natural language processing layer called **Ruby** to make cryptocurrency transactions accessible to everyone. 

## 🚀 Features
- **Natural Language Parsing:** Chat interface that processes conversational text into structured payment parameters using AI (with a built-in regex fallback for high-traffic reliability).
- **On-Chain Settlement:** Automated transaction building and routing via `@solana/web3.js`.
- **Live Wallet Monitoring:** Real-time balance polling and transaction status tracking through the Phantom Wallet extension.
- **Fiat Conversions:** Dynamic local currency (NGN) price calculations using live price feeds.
- **Activity Logging:** Session-persistent ledger linking directly to the Solana Explorer for transparent auditing.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, `@solana/web3.js`
- **Backend:** Node.js, Express, Gemini API