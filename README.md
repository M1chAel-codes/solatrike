## 🔮 Vision & Production Scalability

While the current implementation of **SolaTrike (Ruby)** serves as a functional, high-performance proof of concept, the entire ecosystem was architected with modularity in mind. The conversational interface and on-chain routing engine are built to scale directly into a mainstream consumer utility. 

Our core roadmap for taking SolaTrike from a hackathon prototype to a production-ready transit infrastructure includes:

### 1. Eliminating Volatility via SPL Tokens (USDC)
Daily commuters need predictable pricing. The next structural phase is migrating ticket settlements from native SOL to **USDC**. This ensures that a transport ticket maintains a stable fiat peg (e.g., a fixed ₦1,500 cost) while maintaining 1-second settlement times on the Solana network.

### 2. Viral Checkout Layer: Solana Actions & Blinks
By transforming Ruby's conversational payment intents into **Solana Blinks**, checkout flows can escape the application sandbox. Users will be able to generate a ticket request link that can be shared on Twitter/X, Discord, or WhatsApp, allowing a friend, parent, or employer to sponsor and pay for their transit fare with a single click inside their social feed.

### 3. Context-Aware Conversational Depth
Upgrading the Ruby AI processing layer from a single-turn transaction processor to a multi-turn conversational agent. If a user inputs an incomplete prompt (e.g., *"I need an airport terminal pass"*), Ruby will dynamically analyze the context and ask intelligent clarifying questions to harvest the missing transaction parameters rather than throwing syntax errors.

### 4. Hands-Free Voice Integration
Transit users are frequently on the move, holding bags, or boarding vehicles. Integrating the browser's native **Web Speech API** will allow completely hands-free operations—enabling commuters to tap a mic icon and simply say, *"Ruby, buy an express commuter ticket,"* to instantly trigger the Phantom wallet prompt.

### 5. Physical Verification Layer (Dynamic QR Codes)
To close the loop between digital web app transactions and real-world entry gates, the digital transaction receipts will be embedded with dynamic, offline-capable QR codes generated directly from the on-chain signature. Ticket collectors and electronic terminal turnstiles can scan these to verify access in milliseconds.